import { Injectable, inject } from '@angular/core';
import {
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { db } from '../firebase/firebase';
import { Vehiculo, VehiculoDoc, VehiculoInput, FiltrosVehiculo } from '../models/vehiculo.model';
import { AuthService } from './auth.service';

function toVehiculo(snap: QueryDocumentSnapshot<DocumentData>): Vehiculo {
  return { id: snap.id, ...(snap.data() as VehiculoDoc) };
}

@Injectable({ providedIn: 'root' })
export class VehiculosService {
  private readonly authService = inject(AuthService);

  /**
   * Lista todos los vehículos con filtros opcionales.
   * Para uso administrativo e interno.
   */
  listar(filtros?: FiltrosVehiculo): Observable<Vehiculo[]> {
    return new Observable<Vehiculo[]>((subscriber) => {
      let q = query(collection(db, 'vehiculos'), orderBy('creadoEn', 'desc'));

      // Aplicar filtros básicos (Firestore tiene limitaciones con múltiples where)
      if (filtros?.disponibilidad) {
        q = query(q, where('disponibilidad', '==', filtros.disponibilidad));
      }
      if (filtros?.marca) {
        q = query(q, where('marca', '==', filtros.marca));
      }
      if (filtros?.categoria) {
        q = query(q, where('categoria', '==', filtros.categoria));
      }
      if (filtros?.tipo) {
        q = query(q, where('tipo', '==', filtros.tipo));
      }
      if (filtros?.destacado !== undefined) {
        q = query(q, where('destacado', '==', filtros.destacado));
      }
      if (filtros?.oferta !== undefined) {
        q = query(q, where('oferta', '==', filtros.oferta));
      }

      // Los filtros de rango (precio, año) se aplican en memoria después de traer los resultados
      // Para un sistema real con gran volumen, considera Cloud Functions o Algolia

      return onSnapshot(
        q,
        (snap) => {
          let vehiculos = snap.docs.map(toVehiculo);

          // Filtros adicionales en memoria
          if (filtros?.precioMin !== undefined) {
            vehiculos = vehiculos.filter((v) => v.precio >= filtros.precioMin!);
          }
          if (filtros?.precioMax !== undefined) {
            vehiculos = vehiculos.filter((v) => v.precio <= filtros.precioMax!);
          }
          if (filtros?.anioMin !== undefined) {
            vehiculos = vehiculos.filter((v) => v.anio >= filtros.anioMin!);
          }
          if (filtros?.anioMax !== undefined) {
            vehiculos = vehiculos.filter((v) => v.anio <= filtros.anioMax!);
          }
          if (filtros?.combustible) {
            vehiculos = vehiculos.filter((v) => v.combustible === filtros.combustible);
          }
          if (filtros?.transmision) {
            vehiculos = vehiculos.filter((v) => v.transmision === filtros.transmision);
          }
          if (filtros?.modelo) {
            vehiculos = vehiculos.filter((v) => v.modelo.toLowerCase().includes(filtros.modelo!.toLowerCase()));
          }
          if (filtros?.busqueda) {
            const busqueda = filtros.busqueda.toLowerCase();
            vehiculos = vehiculos.filter(
              (v) =>
                v.marca.toLowerCase().includes(busqueda) ||
                v.modelo.toLowerCase().includes(busqueda) ||
                v.version.toLowerCase().includes(busqueda) ||
                v.descripcion.toLowerCase().includes(busqueda),
            );
          }

          subscriber.next(vehiculos);
        },
        (error) => subscriber.error(error),
      );
    });
  }

  /**
   * Lista solo vehículos disponibles para catálogo público.
   */
  listarDisponibles(filtros?: FiltrosVehiculo): Observable<Vehiculo[]> {
    return this.listar({ ...filtros, disponibilidad: 'disponible' });
  }

  /**
   * Lista solo vehículos disponibles (versión async para componentes).
   */
  async listarDisponiblesAsync(filtros?: FiltrosVehiculo): Promise<Vehiculo[]> {
    let q = query(
      collection(db, 'vehiculos'),
      where('disponibilidad', '==', 'disponible'),
      orderBy('creadoEn', 'desc'),
    );

    if (filtros?.marca) {
      q = query(q, where('marca', '==', filtros.marca));
    }
    if (filtros?.categoria) {
      q = query(q, where('categoria', '==', filtros.categoria));
    }
    if (filtros?.tipo) {
      q = query(q, where('tipo', '==', filtros.tipo));
    }

    const snap = await getDocs(q);
    let vehiculos = snap.docs.map(toVehiculo);

    // Filtros en memoria
    if (filtros?.precioMax) {
      vehiculos = vehiculos.filter((v) => v.precio <= filtros.precioMax!);
    }
    if (filtros?.combustible) {
      vehiculos = vehiculos.filter((v) => v.combustible === filtros.combustible);
    }
    if (filtros?.transmision) {
      vehiculos = vehiculos.filter((v) => v.transmision === filtros.transmision);
    }

    return vehiculos;
  }

  /**
   * Obtiene vehículos destacados para la página principal.
   */
  listarDestacados(): Observable<Vehiculo[]> {
    return new Observable<Vehiculo[]>((subscriber) => {
      const q = query(
        collection(db, 'vehiculos'),
        where('destacado', '==', true),
        where('disponibilidad', '==', 'disponible'),
        orderBy('creadoEn', 'desc'),
        limit(6),
      );

      return onSnapshot(
        q,
        (snap) => subscriber.next(snap.docs.map(toVehiculo)),
        (error) => subscriber.error(error),
      );
    });
  }

  /**
   * Obtiene un vehículo por ID.
   */
  async obtenerPorId(id: string): Promise<Vehiculo | null> {
    const snap = await getDoc(doc(db, 'vehiculos', id));
    if (!snap.exists()) {
      return null;
    }
    return { id: snap.id, ...(snap.data() as VehiculoDoc) };
  }

  /**
   * Crea un nuevo vehículo.
   */
  async crear(vehiculo: VehiculoInput): Promise<string> {
    const user = this.authService.currentUser();
    if (!user) {
      throw new Error('Debes iniciar sesión para crear vehículos.');
    }

    const ahora = Timestamp.now();
    const vehiculoDoc: VehiculoDoc = {
      ...vehiculo,
      creadoPor: user.uid,
      creadoEn: ahora,
      actualizadoEn: ahora,
      publicadoEn: vehiculo.disponibilidad === 'disponible' ? ahora : undefined,
    };

    const ref = await addDoc(collection(db, 'vehiculos'), vehiculoDoc);
    return ref.id;
  }

  /**
   * Actualiza un vehículo existente.
   */
  async actualizar(id: string, cambios: Partial<VehiculoInput>): Promise<void> {
    const actualizacion: Partial<VehiculoDoc> = {
      ...cambios,
      actualizadoEn: Timestamp.now(),
    };

    // Si se cambia a disponible y no tenía fecha de publicación, agregarla
    if (cambios.disponibilidad === 'disponible') {
      const snap = await getDoc(doc(db, 'vehiculos', id));
      if (snap.exists() && !snap.data()['publicadoEn']) {
        actualizacion.publicadoEn = Timestamp.now();
      }
    }

    await updateDoc(doc(db, 'vehiculos', id), actualizacion);
  }

  /**
   * Cambia la disponibilidad de un vehículo.
   */
  async cambiarDisponibilidad(id: string, disponibilidad: string): Promise<void> {
    await this.actualizar(id, { disponibilidad } as any);
  }

  /**
   * Eliminación lógica (cambia disponibilidad a 'no_disponible').
   * No elimina físicamente el documento para mantener historial.
   */
  async eliminar(id: string): Promise<void> {
    await this.cambiarDisponibilidad(id, 'no_disponible');
  }

  /**
   * Eliminación física del documento (solo para admin).
   * Usar con precaución.
   */
  async eliminarFisicamente(id: string): Promise<void> {
    await deleteDoc(doc(db, 'vehiculos', id));
  }

  /**
   * Obtiene vehículos similares basados en marca, modelo y categoría.
   */
  async obtenerSimilares(vehiculoId: string, limite: number = 4): Promise<Vehiculo[]> {
    const snap = await getDoc(doc(db, 'vehiculos', vehiculoId));
    if (!snap.exists()) {
      return [];
    }

    const vehiculo = snap.data() as VehiculoDoc;

    const q = query(
      collection(db, 'vehiculos'),
      where('disponibilidad', '==', 'disponible'),
      where('categoria', '==', vehiculo.categoria),
      orderBy('creadoEn', 'desc'),
      limit(limite + 1), // +1 porque filtraremos el vehículo actual
    );

    const resultados = await getDocs(q);
    return resultados.docs
      .map(toVehiculo)
      .filter((v) => v.id !== vehiculoId) // Excluir el vehículo actual
      .slice(0, limite);
  }

  /**
   * Busca vehículos por texto en marca, modelo y descripción.
   * Nota: búsqueda básica. Para búsqueda avanzada considera Algolia o similar.
   */
  buscar(termino: string, filtros?: FiltrosVehiculo): Observable<Vehiculo[]> {
    return this.listar({ ...filtros, busqueda: termino });
  }

  /**
   * Siembra vehículos de ejemplo para demostración.
   */
  async sembrarEjemplos(): Promise<number> {
    const existentes = await getDocs(query(collection(db, 'vehiculos'), limit(1)));
    if (!existentes.empty) {
      return 0;
    }

    const user = this.authService.currentUser();
    if (!user) {
      throw new Error('Debes iniciar sesión.');
    }

    const ejemplos: VehiculoInput[] = [
      {
        marca: 'Toyota',
        modelo: 'Corolla',
        version: 'XLE 1.8L',
        anio: 2023,
        categoria: 'sedan',
        tipo: 'nuevo',
        kilometraje: 0,
        color: 'Blanco Perla',
        colorInterior: 'Negro',
        combustible: 'gasolina',
        transmision: 'automatica',
        traccion: '4x2',
        motor: '1.8L 4 cilindros',
        cilindros: 4,
        caballosFuerza: 139,
        pasajeros: 5,
        puertas: 4,
        precio: 28900,
        moneda: 'USD',
        disponibilidad: 'disponible',
        stock: 3,
        ubicacion: 'Showroom Principal',
        caracteristicas: ['ABS', 'Airbags', 'Aire acondicionado', 'Cierre centralizado'],
        equipamiento: ['Pantalla táctil', 'Cámara de reversa', 'Bluetooth', 'Control de crucero'],
        descripcion:
          'Toyota Corolla 2023, el sedán más vendido del mundo. Confiabilidad comprobada, bajo consumo y tecnología de punta.',
        imagenes: [
          { url: '/assets/vehicles/corolla-1.jpg', orden: 1, tipo: 'exterior' },
          { url: '/assets/vehicles/corolla-2.jpg', orden: 2, tipo: 'interior' },
        ],
        imagenPrincipal: '/assets/vehicles/corolla-1.jpg',
        destacado: true,
        oferta: false,
        tags: ['Familiar', 'Bajo consumo', 'Confiable'],
      },
      {
        marca: 'Honda',
        modelo: 'CR-V',
        version: 'Touring AWD',
        anio: 2024,
        categoria: 'suv',
        tipo: 'nuevo',
        kilometraje: 0,
        color: 'Negro Cristal',
        colorInterior: 'Cuero Beige',
        combustible: 'hibrido',
        transmision: 'cvt',
        traccion: 'awd',
        motor: '2.0L Híbrido',
        cilindros: 4,
        caballosFuerza: 204,
        pasajeros: 5,
        puertas: 4,
        precio: 42500,
        moneda: 'USD',
        disponibilidad: 'disponible',
        stock: 2,
        ubicacion: 'Showroom Principal',
        caracteristicas: [
          'Honda Sensing',
          'Control adaptativo de crucero',
          'Frenado automático de emergencia',
          'Asistente de permanencia en carril',
        ],
        equipamiento: [
          'Pantalla 9 pulgadas',
          'Apple CarPlay',
          'Android Auto',
          'Techo panorámico',
          'Asientos de cuero',
          'Cámara 360°',
        ],
        descripcion:
          'Honda CR-V Híbrida 2024, la SUV familiar más avanzada. Tecnología híbrida para máxima eficiencia sin sacrificar potencia.',
        imagenes: [
          { url: '/assets/vehicles/crv-1.jpg', orden: 1, tipo: 'exterior' },
          { url: '/assets/vehicles/crv-2.jpg', orden: 2, tipo: 'interior' },
        ],
        imagenPrincipal: '/assets/vehicles/crv-1.jpg',
        destacado: true,
        oferta: false,
        tags: ['SUV', 'Híbrida', 'Familiar', 'Tecnología'],
      },
      {
        marca: 'BMW',
        modelo: 'X5',
        version: 'xDrive40i M Sport',
        anio: 2022,
        categoria: 'suv',
        tipo: 'seminuevo',
        kilometraje: 28000,
        color: 'Azul Phytonic',
        colorInterior: 'Cuero Vernasca Negro',
        combustible: 'gasolina',
        transmision: 'automatica',
        traccion: 'awd',
        motor: '3.0L Turbo',
        cilindros: 6,
        caballosFuerza: 335,
        pasajeros: 5,
        puertas: 4,
        precio: 68900,
        precioAnterior: 72000,
        moneda: 'USD',
        disponibilidad: 'disponible',
        stock: 1,
        ubicacion: 'Showroom Premium',
        caracteristicas: [
          'Paquete M Sport',
          'Suspensión adaptativa',
          'Control de descenso',
          'Asistente de estacionamiento',
        ],
        equipamiento: [
          'Head-up display',
          'Navegador profesional',
          'Sistema de sonido Harman Kardon',
          'Techo panorámico',
          'Asientos ventilados y calefactados',
        ],
        descripcion:
          'BMW X5 2022 seminuevo en condición impecable. Lujo, deportividad y tecnología alemana. Única unidad disponible.',
        imagenes: [
          { url: '/assets/vehicles/x5-1.jpg', orden: 1, tipo: 'exterior' },
          { url: '/assets/vehicles/x5-2.jpg', orden: 2, tipo: 'interior' },
        ],
        imagenPrincipal: '/assets/vehicles/x5-1.jpg',
        destacado: true,
        oferta: true,
        tags: ['Premium', 'Deportivo', 'Lujo'],
      },
      {
        marca: 'Ford',
        modelo: 'F-150',
        version: 'XLT 4x4',
        anio: 2023,
        categoria: 'pickup',
        tipo: 'nuevo',
        kilometraje: 0,
        color: 'Gris Oxford',
        colorInterior: 'Gris Oscuro',
        combustible: 'gasolina',
        transmision: 'automatica',
        traccion: '4x4',
        motor: '3.5L EcoBoost V6',
        cilindros: 6,
        caballosFuerza: 400,
        pasajeros: 5,
        puertas: 4,
        precio: 52900,
        moneda: 'USD',
        disponibilidad: 'disponible',
        stock: 2,
        ubicacion: 'Showroom Comercial',
        caracteristicas: [
          'Caja de aluminio',
          'Capacidad de remolque 12,700 lb',
          'Pro Trailer Backup Assist',
          'Control de crucero adaptativo',
        ],
        equipamiento: [
          'SYNC 4',
          'Pantalla 12 pulgadas',
          'FordPass Connect',
          'Cámara 360°',
          'Asientos con calefacción',
        ],
        descripcion:
          'Ford F-150 2023, la pickup más vendida de América. Potencia, capacidad y tecnología para trabajo y aventura.',
        imagenes: [
          { url: '/assets/vehicles/f150-1.jpg', orden: 1, tipo: 'exterior' },
          { url: '/assets/vehicles/f150-2.jpg', orden: 2, tipo: 'interior' },
        ],
        imagenPrincipal: '/assets/vehicles/f150-1.jpg',
        destacado: false,
        oferta: false,
        tags: ['Trabajo', 'Potencia', 'Versátil'],
      },
      {
        marca: 'Mazda',
        modelo: 'CX-5',
        version: 'Signature AWD',
        anio: 2024,
        categoria: 'suv',
        tipo: 'nuevo',
        kilometraje: 0,
        color: 'Rojo Soul',
        colorInterior: 'Cuero Nappa Marrón',
        combustible: 'gasolina',
        transmision: 'automatica',
        traccion: 'awd',
        motor: '2.5L Turbo',
        cilindros: 4,
        caballosFuerza: 256,
        pasajeros: 5,
        puertas: 4,
        precio: 39800,
        moneda: 'USD',
        disponibilidad: 'disponible',
        stock: 3,
        ubicacion: 'Showroom Principal',
        caracteristicas: [
          'i-Activsense',
          'G-Vectoring Control Plus',
          'Monitor de punto ciego',
          'Alerta de tráfico cruzado',
        ],
        equipamiento: [
          'Sistema Bose',
          'Head-up display',
          'Navegador',
          'Techo corredizo',
          'Asientos de cuero Nappa',
          'Cargador inalámbrico',
        ],
        descripcion:
          'Mazda CX-5 2024 Signature, el SUV que redefine el premium japonés. Diseño Kodo y tecnología Skyactiv para máxima eficiencia.',
        imagenes: [
          { url: '/assets/vehicles/cx5-1.jpg', orden: 1, tipo: 'exterior' },
          { url: '/assets/vehicles/cx5-2.jpg', orden: 2, tipo: 'interior' },
        ],
        imagenPrincipal: '/assets/vehicles/cx5-1.jpg',
        destacado: false,
        oferta: false,
        tags: ['Premium japonés', 'Diseño', 'Tecnología'],
      },
    ];

    const batch = writeBatch(db);
    const ahora = Timestamp.now();

    for (const ejemplo of ejemplos) {
      const vehiculoDoc: VehiculoDoc = {
        ...ejemplo,
        creadoPor: user.uid,
        creadoEn: ahora,
        actualizadoEn: ahora,
        publicadoEn: ahora,
      };
      const ref = doc(collection(db, 'vehiculos'));
      batch.set(ref, vehiculoDoc);
    }

    await batch.commit();
    return ejemplos.length;
  }
}
