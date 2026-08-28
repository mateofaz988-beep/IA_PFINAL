import { Injectable, NgZone, inject } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AssistantClassification,
  AssistantPrefilter,
  AssistantRequest,
  AssistantStreamEvent,
  AssistantStreamStep,
} from '../models/assistant.model';

/**
 * Cliente para el servicio conversacional en Cloud Run. Es público (no lleva
 * el token de Firebase — auth.interceptor.ts solo lo adjunta a environment.apiUrl).
 *
 * HttpClient no maneja bien streams SSE con POST (EventSource solo soporta GET),
 * así que aquí se usa fetch + ReadableStream directamente, parseado a mano y
 * expuesto como un Observable de eventos tipados para que el componente no
 * tenga que saber nada de SSE.
 */
@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly ngZone = inject(NgZone);

  sendStream(
    mensaje: string,
    historial: unknown[],
    voz: boolean,
    clasificador: boolean,
    image?: string,
  ): Observable<AssistantStreamEvent> {
    const payload: AssistantRequest = {
      mensaje,
      historial,
      voz,
      clasificador,
      stream: true,
      ...(image ? { image: this.stripBase64Prefix(image) } : {}),
    };

    return new Observable<AssistantStreamEvent>((subscriber) => {
      const controller = new AbortController();

      this.consume(payload, controller.signal, subscriber).catch((error: unknown) => {
        if ((error as { name?: string })?.name === 'AbortError') {
          return; // cancelado intencionalmente (unsubscribe), no es un error real
        }
        this.ngZone.run(() => subscriber.error(error));
      });

      return () => controller.abort();
    });
  }

  private async consume(
    payload: AssistantRequest,
    signal: AbortSignal,
    subscriber: Subscriber<AssistantStreamEvent>,
  ): Promise<void> {
    const response = await fetch(environment.assistantUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`El asistente respondió con estado ${response.status}.`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Los eventos SSE se separan por línea en blanco.
      const bloques = buffer.split('\n\n');
      buffer = bloques.pop() ?? '';

      for (const bloque of bloques) {
        const evento = this.parseBlock(bloque);
        if (evento) {
          this.ngZone.run(() => subscriber.next(evento));
        }
      }
    }

    this.ngZone.run(() => subscriber.complete());
  }

  private parseBlock(block: string): AssistantStreamEvent | null {
    let eventName = '';
    const dataLines: string[] = [];

    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) {
        eventName = line.slice('event:'.length).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice('data:'.length).trim());
      }
    }

    if (!eventName || dataLines.length === 0) {
      return null;
    }

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(dataLines.join('\n'));
    } catch {
      return null;
    }

    switch (eventName) {
      case 'estado':
        return {
          type: 'estado',
          paso: data['paso'] as AssistantStreamStep,
          texto: String(data['texto'] ?? ''),
        };
      case 'prefiltro':
        return { type: 'prefiltro', data: data as unknown as AssistantPrefilter };
      case 'clasificacion':
        return { type: 'clasificacion', data: data as unknown as AssistantClassification };
      case 'delta':
        return { type: 'delta', texto: String(data['texto'] ?? '') };
      case 'audio':
        return { type: 'audio', mp3Base64: String(data['mp3_base64'] ?? '') };
      case 'fin':
        return {
          type: 'fin',
          respuesta: String(data['respuesta'] ?? ''),
          prefiltro: (data['prefiltro'] as unknown as AssistantPrefilter) ?? null,
          clasificacion: (data['clasificacion'] as unknown as AssistantClassification) ?? null,
          historial: (data['historial'] as unknown[]) ?? [],
        };
      case 'error':
        return { type: 'error', mensaje: String(data['mensaje'] ?? 'Error desconocido del asistente.') };
      default:
        return null;
    }
  }

  /** El backend espera solo la carga base64, sin el prefijo data:image/...;base64, */
  private stripBase64Prefix(base64: string): string {
    return base64.includes(',') ? base64.split(',')[1] : base64;
  }
}
