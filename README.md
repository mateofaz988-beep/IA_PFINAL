# AutoScan Motors

**Plataforma inteligente de gestión y atención para concesionaria automotriz**

Sistema completo de gestión de turnos, inventario, CRM y asistente de IA conversacional con clasificación de vehículos mediante visión computacional (Cars196).

---

## Tecnologías

### Frontend
- **Angular 22.1.0** (Standalone Components)
- **Tailwind CSS 4** con sistema de diseño personalizado
- **Firebase Auth** para autenticación
- **Firestore** como base de datos
- **RxJS** para programación reactiva
- **Signals** de Angular para estado reactivo

### Backend
- **FastAPI** (Python)
- **Firebase Admin SDK**
- **Pydantic** para validación de datos

### IA y Cloud
- **Google Cloud Run** - Asistente conversacional con streaming SSE
- **Clasificador Cars196** - CNN para reconocimiento de vehículos (196 clases)
- **Gemini Vision** - Prefiltro visual de imágenes
- **Text-to-Speech** - Respuestas de voz

---

## Instalación y Configuración

### Requisitos Previos

- **Node.js** 22.x o superior
- **Python** 3.11 o superior
- **npm** 11.x o superior
- **Firebase CLI** (opcional, para deployment)
- Cuenta de **Google Cloud** con proyecto configurado
- Cuenta de **Firebase** con proyecto configurado

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd IA_PFINAL
```

### 2. Configurar Frontend (Angular)

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
# Edita src/environments/environment.development.ts
# y src/environments/environment.ts con tus credenciales
```

**Archivo:** `src/environments/environment.development.ts`

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000',
  carClassifierUrl: 'https://REGION-TU_PROYECTO.cloudfunctions.net/predict',
  assistantUrl: 'https://TU_SERVICIO.run.app',
  firebase: {
    apiKey: 'TU_API_KEY',
    authDomain: 'tu-proyecto.firebaseapp.com',
    projectId: 'tu-proyecto',
    storageBucket: 'tu-proyecto.firebasestorage.app',
    messagingSenderId: 'TU_SENDER_ID',
    appId: 'TU_APP_ID',
  },
};
```

**Archivo:** `src/environments/environment.ts` (producción)

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://tu-backend-produccion.example.com',
  carClassifierUrl: 'https://REGION-TU_PROYECTO.cloudfunctions.net/predict',
  assistantUrl: 'https://TU_SERVICIO.run.app',
  firebase: {
    // ... mismas credenciales de Firebase
  },
};
```

### 3. Configurar Backend (FastAPI)

```bash
cd backend

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
# Copia .env.example a .env y edita con tus valores
cp .env.example .env
```

**Archivo:** `backend/.env`

```env
# CORS - Orígenes permitidos separados por comas
CORS_ORIGINS=http://localhost:4200,https://tu-dominio.com

# Firebase Admin SDK
# Opción 1: Ruta al archivo JSON de credenciales
GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json

# Opción 2: Usar credenciales por defecto del sistema (en Cloud Run)
# Deja esta variable vacía si estás en GCP

# Auth
REQUIRE_AUTH=true
```

### 4. Configurar Firestore

#### Reglas de Seguridad

Las reglas de Firestore ya están definidas en `firestore.rules`. Para desplegarlas:

```bash
firebase deploy --only firestore:rules
```

#### Colecciones Iniciales

El sistema creará automáticamente las colecciones necesarias:

- `usuarios` - Perfiles de usuario con roles
- `areas` - Áreas de atención (ej: Venta, Avalúo, Financiamiento)
- `modulos` - Módulos de atención por área
- `turnos` - Turnos de clientes
- `contadores` - Contadores para códigos correlativos

Para sembrar datos de ejemplo, accede a `/dashboard/admin/sembrar` como administrador.

---

## Desarrollo

### Iniciar Frontend (Angular)

```bash
# Desde la raíz del proyecto
npm start

# La aplicación estará disponible en http://localhost:4200
```

### Iniciar Backend (FastAPI)

```bash
# Desde la carpeta backend
cd backend
uvicorn app.main:app --reload --port 8000

# El API estará disponible en http://localhost:8000
# Documentación en http://localhost:8000/docs
```

### Compilar para producción

```bash
# Frontend
npm run build

# Los archivos estarán en dist/
```

---

## Estructura del Proyecto

```
IA_PFINAL/
├── src/
│   ├── app/
│   │   ├── core/                    # Servicios, guards, modelos, interceptores
│   │   │   ├── guards/             # Auth guard, Role guard
│   │   │   ├── interceptors/       # Auth interceptor
│   │   │   ├── models/             # Interfaces TypeScript
│   │   │   ├── services/           # Servicios de negocio
│   │   │   ├── firebase/           # Configuración Firebase
│   │   │   └── utils/              # Utilidades
│   │   ├── features/                # Módulos funcionales
│   │   │   ├── auth/               # Login, Registro
│   │   │   ├── dashboard/          # Pantallas del dashboard
│   │   │   │   ├── home/           # Inicio
│   │   │   │   ├── assistant/      # Asistente IA
│   │   │   │   ├── form/           # Evaluador matemático
│   │   │   │   ├── results/        # Resultados evaluación
│   │   │   │   ├── admin/          # Panel administrativo
│   │   │   │   ├── asesor/         # Panel del asesor
│   │   │   │   └── turnos/         # Gestión de turnos
│   │   │   └── sala/               # Pantalla pública sala de espera
│   │   ├── layout/                  # Layouts
│   │   ├── shared/                  # Componentes compartidos
│   │   ├── app.routes.ts           # Configuración de rutas
│   │   └── app.config.ts           # Configuración de la app
│   ├── environments/                # Variables de entorno
│   └── styles.css                   # Estilos globales
├── backend/
│   ├── app/
│   │   ├── routers/                # Endpoints del API
│   │   ├── ai_evaluator.py        # Evaluador de ejercicios
│   │   ├── auth.py                 # Autenticación Firebase
│   │   ├── config.py               # Configuración
│   │   ├── models.py               # Modelos Pydantic
│   │   └── main.py                 # Aplicación FastAPI
│   └── requirements.txt            # Dependencias Python
├── firestore.rules                 # Reglas de seguridad Firestore
├── firestore.indexes.json          # Índices Firestore
└── firebase.json                   # Configuración Firebase
```

---

## Funcionalidades Principales

### Sistema de Turnos
- ✅ Solicitud de turno por área
- ✅ Estimación de tiempo de espera
- ✅ Códigos correlativos por área y día
- ✅ Máquina de estados del turno
- ✅ Panel del asesor para atención
- ✅ Historial de turnos
- ✅ Pantalla pública para sala de espera
- ✅ Análisis fotográfico para avalúos

### Administración
- ✅ CRUD de Áreas
- ✅ CRUD de Módulos
- ✅ Gestión de usuarios y roles
- ✅ Asignación de asesores a módulos
- ✅ Estadísticas completas del sistema

### Asistente IA
- ✅ Chat conversacional con streaming
- ✅ Análisis de imágenes de vehículos
- ✅ Clasificador Cars196 (196 modelos)
- ✅ Prefiltro visual (dentro/fuera de catálogo)
- ✅ Respuestas de voz (MP3)
- ✅ Historial conversacional

### Evaluador Matemático
- ✅ Evaluación de ejercicios con IA
- ✅ Soporte para LaTeX
- ✅ Análisis de imágenes manuscritas
- ✅ Retroalimentación detallada

---

## Roles y Permisos

### Cliente
- Ver catálogo
- Solicitar turnos
- Chat con IA
- Ver historial

### Asesor
- Panel de atención
- Gestionar turnos asignados
- Llamar y finalizar atenciones

### Administrador
- Gestión completa del sistema
- CRUD de áreas y módulos
- Gestión de usuarios
- Estadísticas
- Configuración

---

## Deployment

### Firebase Hosting (Frontend)

```bash
# Build de producción
npm run build

# Deploy
firebase deploy --only hosting
```

### Cloud Run (Backend)

```bash
cd backend

# Build imagen Docker
gcloud builds submit --tag gcr.io/TU_PROYECTO/autoscan-backend

# Deploy
gcloud run deploy autoscan-backend \
  --image gcr.io/TU_PROYECTO/autoscan-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## Troubleshooting

### Error: "Token inválido o expirado"
- Verifica que las credenciales de Firebase en `environment.ts` sean correctas
- Asegúrate de que el backend tenga configurado `GOOGLE_APPLICATION_CREDENTIALS`

### Error: "CORS policy"
- Verifica que `CORS_ORIGINS` en el backend incluya tu dominio frontend
- En desarrollo, debe incluir `http://localhost:4200`

### No se carga el clasificador de imágenes
- Verifica que `assistantUrl` en `environment.ts` apunte a tu servicio de Cloud Run
- Verifica que el servicio esté desplegado y funcionando

### El backend no se conecta a Firestore
- Verifica que `GOOGLE_APPLICATION_CREDENTIALS` apunte al archivo JSON de credenciales
- O asegúrate de estar corriendo en un entorno GCP con credenciales por defecto

---

## Soporte y Contacto

Para preguntas o problemas, crea un issue en el repositorio.

---

## Licencia

Proyecto académico - Instituto Tecnológico Superior QuitoMet
