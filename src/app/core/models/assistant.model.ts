export interface AssistantPrefilter {
  es_vehiculo: boolean;
  anio_estimado: number | null;
  confianza_anio: 'alta' | 'media' | 'baja';
  marca_aparente: string;
  tipo: string;
  dentro_de_alcance: boolean;
  razon: string;
}

export interface AssistantClassificationAlternative {
  clase: string;
  confianza: number;
}

export interface AssistantClassification {
  reconocido: boolean;
  prediccion?: string;
  confianza?: number;
  alternativas?: AssistantClassificationAlternative[];
  error?: string;
}

export interface AssistantRequest {
  mensaje: string;
  // El backend trata el historial como opaco (mensajes de sistema y resultados
  // de herramientas en formato OpenAI). El frontend solo lo reenvía tal cual.
  historial: unknown[];
  voz: boolean;
  /** Control 1: habilita/deshabilita la herramienta de clasificación de imágenes. */
  clasificador: boolean;
  stream: boolean;
  image?: string;
}

/** Respuesta completa cuando stream:false (no usado por la interfaz, se deja como respaldo tipado). */
export interface AssistantResponse {
  respuesta: string;
  prefiltro: AssistantPrefilter | null;
  clasificacion: AssistantClassification | null;
  historial: unknown[];
  audio_mp3_base64?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Eventos SSE (stream:true) — orden: estado, prefiltro, clasificacion, delta*, audio?, fin
// ---------------------------------------------------------------------------

export type AssistantStreamStep = 'prefiltro' | 'razonando' | 'clasificando' | 'redactando' | 'voz';

export interface AssistantEstadoEvent {
  type: 'estado';
  paso: AssistantStreamStep;
  texto: string;
}

export interface AssistantPrefiltroEvent {
  type: 'prefiltro';
  data: AssistantPrefilter;
}

export interface AssistantClasificacionEvent {
  type: 'clasificacion';
  data: AssistantClassification;
}

export interface AssistantDeltaEvent {
  type: 'delta';
  texto: string;
}

export interface AssistantAudioEvent {
  type: 'audio';
  mp3Base64: string;
}

export interface AssistantFinEvent {
  type: 'fin';
  respuesta: string;
  prefiltro: AssistantPrefilter | null;
  clasificacion: AssistantClassification | null;
  historial: unknown[];
}

export interface AssistantErrorEvent {
  type: 'error';
  mensaje: string;
}

export type AssistantStreamEvent =
  | AssistantEstadoEvent
  | AssistantPrefiltroEvent
  | AssistantClasificacionEvent
  | AssistantDeltaEvent
  | AssistantAudioEvent
  | AssistantFinEvent
  | AssistantErrorEvent;
