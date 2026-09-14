export type EstadoModulo = 'activo' | 'inactivo';

export interface Modulo {
  id: string;
  nombre: string;
  /** Un módulo atiende una sola área — mantiene la cola de espera como una simulación de un solo servidor por módulo. */
  areaId: string;
  asesorUid: string | null;
  estado: EstadoModulo;
}

export type ModuloDoc = Omit<Modulo, 'id'>;
