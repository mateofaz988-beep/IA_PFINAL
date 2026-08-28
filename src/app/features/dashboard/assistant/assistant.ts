import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AssistantService } from '../../../core/services/assistant.service';
import {
  AssistantClassification,
  AssistantPrefilter,
  AssistantStreamEvent,
} from '../../../core/models/assistant.model';
import { fileToBase64 } from '../../../core/utils/file-to-base64.util';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  prefiltro?: AssistantPrefilter | null;
  clasificacion?: AssistantClassification | null;
  /** Snapshot del control 1 en el turno en que se generó este mensaje (para el panel de detalle). */
  classifierWasEnabled?: boolean;
  /** true mientras le siguen llegando deltas; controla el cursor parpadeante. */
  streaming?: boolean;
}

interface PendingSend {
  mensaje: string;
  imageBase64?: string;
}

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  templateUrl: './assistant.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Assistant {
  private readonly assistantService = inject(AssistantService);

  readonly messages = signal<ChatMessage[]>([]);
  private historial: unknown[] = [];

  readonly draftText = signal('');
  readonly selectedImagePreview = signal<string | null>(null);
  private selectedImageFile: File | null = null;

  /** Control 2 (voz) — ya existía. */
  readonly voiceEnabled = signal(false);
  /** Control 1 (nuevo): habilita/deshabilita el clasificador de imágenes del Taller 2. */
  readonly classifierEnabled = signal(true);

  readonly sending = signal(false);
  /** Texto del último evento "estado" recibido; se muestra mientras no ha empezado el streaming de texto. */
  readonly progressText = signal<string | null>(null);
  /** Cronómetro de respaldo: no depende del backend, sostiene la espera de un arranque en frío largo. */
  readonly elapsedSeconds = signal(0);
  /** Índice del mensaje de usuario cuya foto se está analizando (activa el barrido de escaneo). */
  readonly analyzingUserMessageIndex = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);
  private lastFailedSend: PendingSend | null = null;

  private readonly blobUrls = new Set<string>();
  private elapsedTimer?: ReturnType<typeof setInterval>;

  // Estado transitorio del turno en curso (se resetea en cada dispatch()).
  private turnPrefiltro: AssistantPrefilter | null = null;
  private turnClasificacion: AssistantClassification | null = null;
  private turnClassifierEnabled = true;
  private streamingMessageIndex: number | null = null;

  onDraftInput(event: Event): void {
    this.draftText.set((event.target as HTMLInputElement).value);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (file) {
      this.setSelectedImage(file);
    }
  }

  removeSelectedImage(): void {
    this.setSelectedImage(null);
  }

  private setSelectedImage(file: File | null): void {
    const current = this.selectedImagePreview();
    if (current) {
      URL.revokeObjectURL(current);
      this.blobUrls.delete(current);
    }

    this.selectedImageFile = file;
    if (file) {
      const url = URL.createObjectURL(file);
      this.blobUrls.add(url);
      this.selectedImagePreview.set(url);
    } else {
      this.selectedImagePreview.set(null);
    }
  }

  async send(): Promise<void> {
    const mensaje = this.draftText().trim();
    if (!mensaje || this.sending()) {
      return;
    }

    const imageFile = this.selectedImageFile;
    const imagePreviewUrl = this.selectedImagePreview() ?? undefined;

    let imageBase64: string | undefined;
    if (imageFile) {
      imageBase64 = await fileToBase64(imageFile);
    }

    let userMessageIndex = -1;
    this.messages.update((msgs) => {
      const next = [...msgs, { role: 'user' as const, text: mensaje, imageUrl: imagePreviewUrl }];
      userMessageIndex = next.length - 1;
      return next;
    });
    if (imageBase64) {
      this.analyzingUserMessageIndex.set(userMessageIndex);
    }

    // El blob URL de la vista previa pasa a pertenecer al mensaje recién
    // agregado: se limpia el composer pero NO se revoca aquí.
    this.draftText.set('');
    this.selectedImageFile = null;
    this.selectedImagePreview.set(null);

    this.dispatch({ mensaje, imageBase64 });
  }

  retry(): void {
    if (this.lastFailedSend) {
      this.dispatch(this.lastFailedSend);
    }
  }

  private dispatch(pending: PendingSend): void {
    this.errorMessage.set(null);
    this.sending.set(true);
    this.progressText.set(pending.imageBase64 ? 'Conectando con el motor de análisis...' : 'Pensando...');
    this.startElapsedTimer();

    this.turnPrefiltro = null;
    this.turnClasificacion = null;
    this.turnClassifierEnabled = this.classifierEnabled();
    this.streamingMessageIndex = null;

    this.assistantService
      .sendStream(pending.mensaje, this.historial, this.voiceEnabled(), this.turnClassifierEnabled, pending.imageBase64)
      .subscribe({
        next: (event) => this.handleEvent(event, pending),
        error: (error: unknown) => {
          this.sending.set(false);
          this.progressText.set(null);
          this.stopElapsedTimer();
          this.analyzingUserMessageIndex.set(null);
          this.finishStreamingMessage();
          this.lastFailedSend = pending;
          this.errorMessage.set(
            error instanceof Error
              ? error.message
              : 'No se pudo contactar al asistente. El servicio puede haber estado iniciando (arranque en frío) — reintenta en unos segundos.',
          );
        },
      });
  }

  private handleEvent(event: AssistantStreamEvent, pending: PendingSend): void {
    switch (event.type) {
      case 'estado':
        this.progressText.set(event.texto);
        break;

      case 'prefiltro':
        this.turnPrefiltro = event.data;
        break;

      case 'clasificacion':
        this.turnClasificacion = event.data;
        break;

      case 'delta':
        this.ensureStreamingMessage();
        this.appendToStreamingMessage(event.texto);
        break;

      case 'audio': {
        this.ensureStreamingMessage();
        const audioUrl = this.createAudioBlobUrl(event.mp3Base64);
        this.updateStreamingMessage((msg) => ({ ...msg, audioUrl }));
        break;
      }

      case 'fin':
        this.ensureStreamingMessage();
        this.updateStreamingMessage((msg) => ({
          ...msg,
          // "fin" es la fuente autoritativa: si por algún motivo no llegó
          // ningún delta, respuesta trae el texto completo igual.
          text: msg.text || event.respuesta,
          prefiltro: event.prefiltro,
          clasificacion: event.clasificacion,
          streaming: false,
        }));
        this.historial = event.historial ?? [];
        this.lastFailedSend = null;
        this.sending.set(false);
        this.progressText.set(null);
        this.stopElapsedTimer();
        this.analyzingUserMessageIndex.set(null);
        this.streamingMessageIndex = null;
        break;

      case 'error':
        this.finishStreamingMessage();
        this.sending.set(false);
        this.progressText.set(null);
        this.stopElapsedTimer();
        this.analyzingUserMessageIndex.set(null);
        this.lastFailedSend = pending;
        this.errorMessage.set(event.mensaje);
        break;
    }
  }

  /** Crea el mensaje del asistente (vacío) la primera vez que hace falta pintar algo del turno. */
  private ensureStreamingMessage(): void {
    if (this.streamingMessageIndex !== null) {
      return;
    }
    this.progressText.set(null);
    this.analyzingUserMessageIndex.set(null);
    this.messages.update((msgs) => {
      const next: ChatMessage[] = [
        ...msgs,
        {
          role: 'assistant',
          text: '',
          streaming: true,
          prefiltro: this.turnPrefiltro,
          clasificacion: this.turnClasificacion,
          classifierWasEnabled: this.turnClassifierEnabled,
        },
      ];
      this.streamingMessageIndex = next.length - 1;
      return next;
    });
  }

  private appendToStreamingMessage(chunk: string): void {
    this.updateStreamingMessage((msg) => ({ ...msg, text: msg.text + chunk }));
  }

  private updateStreamingMessage(updater: (msg: ChatMessage) => ChatMessage): void {
    const index = this.streamingMessageIndex;
    if (index === null) {
      return;
    }
    this.messages.update((msgs) => msgs.map((m, i) => (i === index ? updater(m) : m)));
  }

  /** Si el turno se corta a medias (p.ej. evento "error"), deja de parpadear el cursor. */
  private finishStreamingMessage(): void {
    if (this.streamingMessageIndex === null) {
      return;
    }
    this.updateStreamingMessage((msg) => ({ ...msg, streaming: false }));
    this.streamingMessageIndex = null;
  }

  private createAudioBlobUrl(base64Mp3: string): string {
    const binary = atob(base64Mp3);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
    this.blobUrls.add(url);
    return url;
  }

  private startElapsedTimer(): void {
    this.elapsedSeconds.set(0);
    this.elapsedTimer = setInterval(() => this.elapsedSeconds.update((s) => s + 1), 1000);
  }

  private stopElapsedTimer(): void {
    if (this.elapsedTimer !== undefined) {
      clearInterval(this.elapsedTimer);
      this.elapsedTimer = undefined;
    }
  }

  /**
   * Estado del análisis de un turno del asistente, en un único lugar para que
   * el acento del borde y el panel de detalle nunca queden desincronizados.
   */
  cardAccent(
    message: ChatMessage,
  ): 'none' | 'verified' | 'out-of-scope' | 'disabled' | 'classifier-error' | 'no-result' {
    if (!message.prefiltro) return 'none';
    if (!message.prefiltro.dentro_de_alcance) return 'out-of-scope';
    if (!message.classifierWasEnabled) return 'disabled';
    if (message.clasificacion?.error) return 'classifier-error';
    if (message.clasificacion?.alternativas?.length) return 'verified';
    return 'no-result';
  }

  /** Banda de confianza: define color y calificación de cada predicción de un vistazo. */
  confidenceBand(value: number): 'high' | 'medium' | 'low' {
    if (value >= 0.85) return 'high';
    if (value >= 0.5) return 'medium';
    return 'low';
  }

  confidenceLabel(value: number): string {
    const band = this.confidenceBand(value);
    if (band === 'high') return 'Confianza alta';
    if (band === 'medium') return 'Confianza media';
    return 'Confianza baja';
  }

  resetConversation(): void {
    this.stopElapsedTimer();
    for (const url of this.blobUrls) {
      URL.revokeObjectURL(url);
    }
    this.blobUrls.clear();

    this.messages.set([]);
    this.historial = [];
    this.draftText.set('');
    this.selectedImageFile = null;
    this.selectedImagePreview.set(null);
    this.errorMessage.set(null);
    this.progressText.set(null);
    this.analyzingUserMessageIndex.set(null);
    this.lastFailedSend = null;
    this.sending.set(false);
    this.streamingMessageIndex = null;
    this.turnPrefiltro = null;
    this.turnClasificacion = null;
  }
}
