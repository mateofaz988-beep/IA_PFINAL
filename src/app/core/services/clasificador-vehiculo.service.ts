import { Injectable, inject } from '@angular/core';
import { AssistantClassification, AssistantPrefilter } from '../models/assistant.model';
import { AssistantService } from './assistant.service';

export interface ResultadoClasificacion {
  prefiltro: AssistantPrefilter | null;
  clasificacion: AssistantClassification | null;
}

const MENSAJE_SILENCIOSO = 'Identifica este vehículo.';

/**
 * Envuelve al asistente conversacional (sin tocarlo) para usarlo como
 * clasificador puro en la solicitud de turno de avalúo: mismo endpoint,
 * mismo prefiltro de alcance, pero sin mostrar el chat — se descartan el
 * texto, los deltas y el audio, y solo importan los eventos prefiltro y
 * clasificacion del turno SSE.
 */
@Injectable({ providedIn: 'root' })
export class ClasificadorVehiculoService {
  private readonly assistantService = inject(AssistantService);

  clasificar(imageBase64: string): Promise<ResultadoClasificacion> {
    return new Promise((resolve, reject) => {
      let prefiltro: AssistantPrefilter | null = null;
      let clasificacion: AssistantClassification | null = null;

      this.assistantService.sendStream(MENSAJE_SILENCIOSO, [], false, true, imageBase64).subscribe({
        next: (event) => {
          switch (event.type) {
            case 'prefiltro':
              prefiltro = event.data;
              break;
            case 'clasificacion':
              clasificacion = event.data;
              break;
            case 'fin':
              resolve({ prefiltro: event.prefiltro ?? prefiltro, clasificacion: event.clasificacion ?? clasificacion });
              break;
            case 'error':
              reject(new Error(event.mensaje));
              break;
          }
        },
        error: (err: unknown) =>
          reject(err instanceof Error ? err : new Error('No se pudo analizar la fotografía.')),
      });
    });
  }
}
