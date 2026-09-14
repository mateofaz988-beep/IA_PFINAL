import { AssistantClassification, AssistantPrefilter } from '../models/assistant.model';
import { DatosVehiculo } from '../models/turno.model';

/**
 * El clasificador devuelve una sola cadena tipo "BMW M3 Coupe 2012" (formato
 * del dataset de entrenamiento), no marca/modelo separados. La mayoría de
 * marcas del catálogo son de una palabra; estas son las excepciones conocidas
 * de dos palabras — todo lo demás se separa por la primera palabra.
 */
const MARCAS_COMPUESTAS = ['Aston Martin', 'Land Rover', 'Alfa Romeo', 'Am General'];

export function separarMarcaModelo(prediccion: string): { marca: string; modelo: string; anio: number | null } {
  const coincidenciaAnio = prediccion.match(/\b(19|20)\d{2}\b/);
  const anio = coincidenciaAnio ? Number(coincidenciaAnio[0]) : null;
  const sinAnio = (anio ? prediccion.replace(coincidenciaAnio![0], '') : prediccion).trim();

  const compuesta = MARCAS_COMPUESTAS.find((m) => sinAnio.startsWith(m));
  if (compuesta) {
    return { marca: compuesta, modelo: sinAnio.slice(compuesta.length).trim(), anio };
  }

  const [marca, ...resto] = sinAnio.split(' ');
  return { marca: marca ?? sinAnio, modelo: resto.join(' ').trim() || sinAnio, anio };
}

/**
 * Traduce la respuesta del asistente (prefiltro + clasificación) a los
 * datos que se guardan en el turno. "Fuera de catálogo" cubre dos casos
 * honestos: el prefiltro dice que el vehículo no entra (año/mercado), o
 * el clasificador no lo reconoció — en ningún caso se inventa un dato.
 */
export function construirDatosVehiculo(
  prefiltro: AssistantPrefilter | null,
  clasificacion: AssistantClassification | null,
): DatosVehiculo {
  const dentroDeAlcance = prefiltro?.dentro_de_alcance ?? false;
  const reconocido = dentroDeAlcance && !!clasificacion?.reconocido && !!clasificacion.prediccion;

  if (!reconocido) {
    return {
      marca: null,
      modelo: null,
      anio: null,
      confianza: null,
      fueraDeCatalogo: true,
      anioEstimado: prefiltro?.anio_estimado ?? null,
      confianzaAnio: prefiltro?.confianza_anio ?? null,
      razon: !dentroDeAlcance
        ? (prefiltro?.razon ?? 'El vehículo no entra en el catálogo de identificación.')
        : (clasificacion?.error ?? 'No se obtuvo una clasificación para esta fotografía.'),
      verificadoManualmente: false,
    };
  }

  const { marca, modelo, anio } = separarMarcaModelo(clasificacion!.prediccion!);
  return {
    marca,
    modelo,
    anio,
    confianza: clasificacion!.confianza ?? null,
    fueraDeCatalogo: false,
    anioEstimado: prefiltro?.anio_estimado ?? null,
    confianzaAnio: prefiltro?.confianza_anio ?? null,
    razon: null,
    verificadoManualmente: false,
  };
}
