export interface Area {
  id: string;
  nombre: string;
  descripcion: string;
  /** Prefijo del código de turno visible, ej. 'AV' para avalúo → AV-042. */
  prefijo: string;
  duracionEstimadaMin: number;
  activa: boolean;
  /** Si true, la solicitud de turno exige fotografiar el vehículo (hoy, solo avalúo). */
  requiereFoto: boolean;
}

export type AreaDoc = Omit<Area, 'id'>;
