# Corrección del catálogo y la marca de AutoScan Motors

## Alcance y análisis

Se trabajó en el catálogo público, su fuente de datos, el navbar/logo compartido y la continuidad del detalle existente. No se implementaron carrito, checkout, facturación, vendedores, gerencia, notificaciones ni nuevos paneles.

El proyecto usa Angular 22 con componentes standalone, signals, `inject()`, control flow de Angular, CSS y Tailwind 4. Se conservaron estos patrones y los tokens existentes de `src/styles.css`: crema `spec-paper`, tinta `asphalt` y naranja `signal-amber`, con Big Shoulders e IBM Plex.

La portada está en `src/app/features/dashboard/home/`; el catálogo y detalle, en `src/app/features/catalogo/`. Firebase se inicializa en `src/app/core/firebase/firebase.ts`. La colección es `vehiculos` y su estado comercial se llama **`disponibilidad`**. Se conservó ese nombre para evitar una segunda fuente de verdad llamada `estado`.

El acceso público a `/catalogo` y `/catalogo/:id` sigue sin guard de autenticación. El dashboard conserva sus guards originales. No se modificaron credenciales, proyecto Firebase, autenticación ni colecciones remotas.

## Logo y navegación

- Se inspeccionaron `imagenes/logo_web.jpg` y `public/logo.png`: representan el mismo símbolo de automóvil. El JPG tiene fondo blanco y color rojizo; el PNG existente es transparente y oscuro, acorde con la paleta actual.
- Se reutiliza `/logo.png`, sin modificar el archivo original ni generar otro logo. Se aplica `object-fit: contain`, tamaño contenido y `alt="AutoScan Motors"`.
- El símbolo acompaña a AUTOSCAN y MOTORS en dos líneas. El enlace apunta a `/`, respetando la redirección existente de esa ruta.
- Se conserva la navegación existente, con indicador naranja discreto de ruta activa, sesión, links por rol y menú accesible en pantallas estrechas.
- Un contenedor público comparte el mismo navbar con el catálogo y el detalle.

## Catálogo

- Se eliminó el diseño azul/morado. El nuevo diseño utiliza crema, tinta, naranja, bordes finos, tipografía editorial y fotografías sin deformación.
- Búsqueda inmediata por marca, modelo y versión, tolerante a mayúsculas y tildes.
- Filtros combinables: marca, categoría, combustible, transmisión, año, estado y precio máximo. Las opciones provienen de las fichas cargadas. Los años visibles no superan 2012.
- Seis órdenes: publicación más reciente, precio ascendente/descendente, menor kilometraje y año ascendente/descendente.
- Tres columnas en escritorio, dos en tablet y una en móvil. Los filtros se despliegan en móvil.
- Estados independientes: skeleton de carga, éxito, vacío y error con reintento. Durante la carga no se muestra un contador de cero. Los detalles técnicos de Firebase quedan en consola.
- Las tarjetas indican disponibilidad, reserva o venta y destacan algunas fichas con una etiqueta naranja. No se muestran estados internos.
- Se conservaron galería y contenido del detalle. Se ajustó la paleta, se conectó la fuente demo, se eliminaron URLs repetidas de la galería y se corrigió la reacción a cambios de ID.

## Datos, imágenes y Cars196

No hay archivo local de labels, pesos del clasificador, scripts de entrenamiento ni backend de inferencia Cars196 en este repositorio. Los servicios de clasificación son clientes de endpoints remotos; el backend Python incluido es un evaluador con implementación simulada.

Las clases se contrastaron con la [implementación oficial de Cars196 en TensorFlow Datasets](https://github.com/tensorflow/datasets/blob/master/tensorflow_datasets/image_classification/cars196.py). **La asociación de las fotos es una revisión visual de modelo/generación, no una predicción del modelo desplegado ni una certificación del año o versión del vehículo fotografiado.** No se asignaron índices de clase al modelo remoto.

Se prepararon diez fichas académicas. Precios, kilometraje, transmisión y estados son ilustrativos; el año es el de la clase de referencia. No se inventaron versiones exactas ni motorizaciones: ambos campos quedan vacíos cuando no se pueden comprobar. Las fichas muestran expresamente que no son ofertas comerciales.

| Vehículo | Año | Archivo original existente | Recurso utilizado por la app | Clase de referencia Cars196 |
| --- | --- | --- | --- | --- |
| Volkswagen Beetle | 2012 | `imagenes/beetle.jpg` | `/catalogo/volkswagen-beetle.jpg` | Volkswagen Beetle Hatchback 2012 |
| Toyota Corolla | 2012 | `imagenes/corolla.jpg` | `/catalogo/toyota-corolla.jpg` | Toyota Corolla Sedan 2012 |
| Porsche Panamera | 2012 | `imagenes/porche.jpg` | `/imagenes/porche.jpg` | Porsche Panamera Sedan 2012 |
| Dodge Charger | 2009 | `imagenes/charger.jpg` | `/catalogo/dodge-charger-srt8.jpg` | Dodge Charger SRT-8 2009 |
| Fisker Karma | 2012 | `imagenes/Fisker Karma Sedan.jpg` | `/catalogo/fisker-karma.jpg` | Fisker Karma Sedan 2012 |
| Jeep Wrangler | 2012 | `imagenes/jeep.webp` | `/imagenes/jeep.webp` | Jeep Wrangler SUV 2012 |
| HUMMER H3T | 2010 | `imagenes/hamer.jpg` | `/catalogo/hummer-h3t.jpg` | HUMMER H3T Crew Cab 2010 |
| Ferrari 458 Italia | 2012 | `imagenes/ferrari.jpg` | `/catalogo/ferrari-458-italia.jpg` | Ferrari 458 Italia Coupe 2012 |
| Lamborghini Aventador | 2012 | `imagenes/laborgini.jpg` | `/catalogo/lamborghini-aventador.jpg` | Lamborghini Aventador Coupe 2012 |
| Bugatti Veyron | 2009 | `imagenes/bugati.jpg` | `/catalogo/bugatti-veyron.jpg` | Bugatti Veyron 16.4 Coupe 2009 |

Las ocho fotos de `public/catalogo` utilizadas ya existían y sus hashes coinciden con los originales. Las otras dos se sirven directamente desde `imagenes` mediante una lista explícita en `angular.json`. No se copiaron, renombraron ni descargaron imágenes; el empaquetado normal de Angular las incorpora al build.

Se excluyeron de estas fichas `bmw.jpg`, `Honda Odyssey.jpg`, `rolsroy.jpg` y `tesla.jpg`: la apariencia de sus generaciones no permite asociarlas con suficiente confianza a vehículos de hasta 2012. Siguen intactas. `logo_web.jpg` no se usa como vehículo.

### Fuente y fallback

- `CatalogoService` consulta primero Firestore. Usa una sola fuente por carga y nunca completa resultados remotos con fichas mock.
- Si la consulta falla, excede ocho segundos o no devuelve fichas visibles de hasta 2012, **solo desarrollo** puede usar la demo local.
- `environment.development.ts`: `catalogoDemoFallback: true`.
- `environment.ts`: `catalogoDemoFallback: false`. Además, `production: true` impide el fallback aunque se active esa bandera por error.
- Los IDs locales comienzan con `demo-` y funcionan al recargar directamente `/catalogo/:id`. No se crean documentos remotos al abrir estas páginas.
- Se sustituyó el seed antiguo de autos 2022–2024 e imágenes inexistentes por el mismo conjunto académico. La acción administrativa de sembrar sigue siendo explícita y protegida por las reglas. **No se ejecutó.**
- `esDemo` y `referenciaCars196` conservan el carácter académico incluso si posteriormente se utiliza esa acción administrativa.
- Se añadió `oculto` al tipo de disponibilidad, manteniendo compatibilidad con `en_preparacion` y `no_disponible`. En el administrador solo se añadió su etiqueta al mapa tipado existente.

## Firestore: diagnóstico y regla exacta

Se comprobó el acceso anónimo mediante dos consultas REST de solo lectura contra el proyecto configurado: la consulta anterior (`disponibilidad == disponible`, ordenada por `creadoEn`) y la nueva consulta pública. **Ambas respondieron HTTP 403, `PERMISSION_DENIED`, `Missing or insufficient permissions.`**

El archivo local anterior ya contenía `allow read: if true` para `vehiculos`. Esa regla local, si estuviese aplicada como regla efectiva, no explicaría el rechazo. La evidencia apunta a una diferencia entre la configuración local y las reglas efectivas del servidor. No se obtuvo el contenido de las reglas desplegadas ni acceso al inventario denegado, por lo que no se afirma cuál es su condición exacta.

La consulta anterior también combinaba filtro y orden sin un índice de vehículos declarado en `firestore.indexes.json`; eso es un posible problema independiente del rechazo de permisos. La nueva consulta pública usa únicamente el filtro de disponibilidad y ordena en el cliente.

Se cambió **solo el bloque de lectura de `vehiculos/{vehiculoId}`**:

```text
allow read: if resource.data.disponibilidad in ['disponible', 'reservado', 'vendido']
  || esAdministrador();
allow create, update: if esAdministrador();
allow delete: if esAdministrador();
```

Antes, todos los documentos de vehículos eran públicamente legibles en el archivo local. Ahora solo son públicos los estados visibles; el administrador puede leer los demás. Las escrituras siguen limitadas al administrador. No se cambió el acceso de las otras colecciones.

La consulta de listado incluye `where('disponibilidad', 'in', ['disponible', 'reservado', 'vendido'])`; el detalle añade el ID a la misma restricción, incluso cuando quien navega tiene rol de administrador. Así consulta y reglas expresan las mismas condiciones, como exige [Firebase para las consultas protegidas por reglas](https://firebase.google.com/docs/firestore/security/rules-query).

**Las reglas locales requieren un despliegue posterior autorizado. No se ejecutó `firebase deploy`.** El 403 del servidor continuará hasta corregir su configuración efectiva; el fallback mantiene utilizable el desarrollo mientras tanto. No se verificó el cambio de reglas en un emulador ni se probó escritura administrativa remota.

## Archivos modificados

- `angular.json`: publicación de los dos assets originales adicionales.
- `firestore.rules`: lectura pública limitada por disponibilidad.
- `src/app/app.routes.ts`: contenedor público compartido por catálogo/detalle.
- `src/app/core/models/vehiculo.model.ts`: estado oculto y metadatos académicos.
- `src/app/core/services/vehiculos.service.ts`: consultas públicas y sustitución del seed antiguo.
- `src/app/features/catalogo/catalogo.ts` y `catalogo.html`: estado, controles y presentación nuevos.
- `src/app/features/catalogo/vehiculo-detalle.ts` y `vehiculo-detalle.html`: continuidad del detalle, carga y paleta.
- `src/app/features/dashboard/admin/inventario/inventario-admin.ts`: una etiqueta para compatibilidad del tipo `oculto`.
- `src/app/shared/components/navbar/navbar.ts` y `navbar.html`: logo, menú, sesión y navegación activa.
- `src/environments/environment.ts` y `environment.development.ts`: separación explícita del fallback.

## Archivos creados

- `src/app/core/data/vehiculo-demo.ts`.
- `src/app/core/services/catalogo.service.ts` y `catalogo.service.spec.ts`.
- `src/app/core/utils/catalogo.util.ts` y `catalogo.util.spec.ts`.
- `src/app/features/catalogo/catalogo-shell.ts` y `catalogo.css`.
- `src/app/shared/components/navbar/navbar.css`.
- `REVISION_CATALOGO.md`.

Los scripts y capturas de verificación están en `tmp/`, que ya estaba excluido de Git. El cambio previo del usuario que elimina `imagenes/node-v22.23.2-x64.msi` se dejó intacto y no forma parte de esta implementación.

## Verificación y pendientes

- `npm.cmd run build` — correcto, sin errores Angular/TypeScript. Se usa `npm.cmd` porque PowerShell bloquea `npm.ps1`; ejecuta el mismo script `npm run build`.
- El primer intento no pudo descargar las tipografías por la restricción de red del sandbox. La ejecución autorizada con red pasó, sin modificar las tipografías ni la configuración de seguridad del sistema.
- Única advertencia del build: paquete inicial de aproximadamente **934,90 kB**, sobre el umbral de advertencia de **500 kB** y por debajo del límite de error de **1 MB**. El CSS del catálogo está dentro del presupuesto original; no se ampliaron presupuestos.
- `npm.cmd test -- --watch=false` — **13 pruebas aprobadas**: filtros combinados, búsqueda, órdenes, integridad de demo, selección de fuente, timeout, aislamiento de producción, detalle y exclusión de estados privados.
- Navegador: 1920, 1366, 768, 390 y 320 px; columnas 3/3/2/1/1, diez fotos y logo cargados, sin overflow horizontal y sin excepciones JavaScript. Se comprobaron búsqueda, filtros, ordenamiento, menú móvil, carga, error/reintento, vacío, detalle, recarga directa e ID inexistente.
- La revisión final se repitió con acceso real a la red: Firestore devolvió el error de permisos y la demo se mostró correctamente. Se abrieron los diez detalles. También se verificó la alineación del navbar con variantes locales de presentación de cliente, asesor y administrador y nombres largos, sin crear usuarios ni cambiar roles remotos.
- Se reinició el servidor de desarrollo de este proyecto para que releyera las rutas nuevas de assets. Queda disponible en `http://localhost:4200/catalogo`.
- Pendientes externos: desplegar las reglas con autorización, verificar el inventario real tras resolver el acceso y contrastar las referencias con los labels exactos del modelo remoto cuando estén disponibles.

La fase termina aquí.
