# Guía de Instalación - AutoScan Motors

## Requisito Crítico: Actualizar Node.js

⚠️ **IMPORTANTE:** El proyecto requiere Node.js v22.22.3 o superior, v24.15.0 o v26.0.0.

Tu versión actual: **v22.14.0** (desactualizada)

### Cómo actualizar Node.js

#### Opción 1: Descarga directa (Recomendado)

1. Visita https://nodejs.org/
2. Descarga la versión LTS más reciente (v22.22.3 o superior)
3. Ejecuta el instalador
4. Verifica la instalación:
   ```bash
   node --version
   ```

#### Opción 2: Usando NVM (Node Version Manager)

Si tienes NVM instalado:

```bash
nvm install 22.22.3
nvm use 22.22.3
```

---

## Pasos de Instalación Post-Actualización

### 1. Frontend (Angular)

```bash
# Navegar al directorio raíz del proyecto
cd c:\Users\ItsqmetEstudiantes\Documents\aloooooooo\IA\IA_PFINAL

# Instalar dependencias (si no lo has hecho)
npm install

# Verificar que todo compile correctamente
npm run build -- --configuration development

# Iniciar servidor de desarrollo
npm start
```

La aplicación estará disponible en: http://localhost:4200

### 2. Backend (FastAPI)

```bash
# Navegar al directorio backend
cd backend

# Crear entorno virtual de Python
python -m venv venv

# Activar entorno virtual
venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
# Copia .env.example a .env
copy .env.example .env

# Edita .env con tus credenciales de Firebase
notepad .env

# Iniciar servidor
uvicorn app.main:app --reload --port 8000
```

El API estará disponible en: http://localhost:8000
Documentación Swagger: http://localhost:8000/docs

### 3. Configurar Firebase

#### 3.1. Obtener credenciales de Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto (o crea uno nuevo)
3. Ve a **Configuración del proyecto** (ícono de engranaje)
4. Pestaña **General** → Encuentra las credenciales de tu app web
5. Copia los valores y pégalos en `src/environments/environment.development.ts`

#### 3.2. Obtener Service Account Key (para backend)

1. En Firebase Console, ve a **Configuración del proyecto**
2. Pestaña **Cuentas de servicio**
3. Click en **Generar nueva clave privada**
4. Guarda el archivo JSON en `backend/serviceAccountKey.json`
5. Actualiza la ruta en `backend/.env`:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
   ```

#### 3.3. Configurar Firestore

1. En Firebase Console, habilita **Firestore Database**
2. Elige modo de inicio: **Modo de producción**
3. Selecciona ubicación (preferiblemente cerca de tus usuarios)

#### 3.4. Desplegar reglas de Firestore

```bash
# Instalar Firebase CLI (si no la tienes)
npm install -g firebase-tools

# Iniciar sesión
firebase login

# Desplegar reglas
firebase deploy --only firestore:rules
```

---

## Verificación de Instalación

### Checklist

- [ ] Node.js actualizado a v22.22.3 o superior
- [ ] Dependencias de npm instaladas (`npm install`)
- [ ] Proyecto Angular compila sin errores (`npm run build`)
- [ ] Variables de entorno configuradas en `src/environments/`
- [ ] Backend Python con entorno virtual activado
- [ ] Dependencias de Python instaladas (`pip install -r requirements.txt`)
- [ ] Archivo `.env` configurado en `backend/`
- [ ] Service Account Key de Firebase descargado
- [ ] Firestore habilitado en Firebase Console
- [ ] Reglas de Firestore desplegadas

### Probar que todo funciona

1. **Iniciar backend:**
   ```bash
   cd backend
   venv\Scripts\activate
   uvicorn app.main:app --reload --port 8000
   ```

2. **En otra terminal, iniciar frontend:**
   ```bash
   npm start
   ```

3. **Abrir navegador:**
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:8000/docs

4. **Crear cuenta:**
   - Ir a http://localhost:4200/register
   - Registrar un usuario
   - Iniciar sesión

5. **Sembrar datos de ejemplo:**
   - Cambiar rol a "administrador" manualmente en Firestore Console:
     - Ir a Firestore Database
     - Colección `usuarios`
     - Buscar tu usuario
     - Editar campo `rol` → cambiar a `"administrador"`
   - Volver a la aplicación y acceder a `/dashboard/admin/sembrar`
   - Click en "Sembrar áreas" y "Sembrar módulos"

---

## Problemas Comunes

### Error: "Token inválido o expirado"

**Causa:** Credenciales de Firebase mal configuradas.

**Solución:**
- Verifica `src/environments/environment.development.ts`
- Verifica `backend/.env` y el archivo `serviceAccountKey.json`
- Asegúrate de que el `projectId` sea el mismo en ambos

### Error: "CORS policy"

**Causa:** Backend no permite requests del frontend.

**Solución:**
- En `backend/.env`, verifica que `CORS_ORIGINS` incluya `http://localhost:4200`
- Reinicia el backend

### Error: "Module not found"

**Causa:** Dependencias no instaladas o Node.js desactualizado.

**Solución:**
```bash
# Eliminar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install
```

### El clasificador de IA no funciona

**Causa:** El servicio de Cloud Run no está configurado o la URL es incorrecta.

**Solución:**
- El clasificador requiere un servicio desplegado en Cloud Run
- Por ahora, puedes usar el asistente sin análisis de imágenes
- Para configurarlo, necesitarás desplegar el modelo Cars196 en Cloud Run
  (esto está fuera del alcance de esta guía inicial)

---

## Siguientes Pasos

Una vez que tengas el sistema funcionando localmente:

1. **Explora el sistema:**
   - Navega por las diferentes secciones
   - Prueba el asistente IA
   - Solicita un turno
   - Accede al panel administrativo

2. **Familiarízate con el código:**
   - Revisa `src/app/app.routes.ts` para entender las rutas
   - Explora `src/app/core/services/` para ver los servicios
   - Lee `src/app/core/models/` para entender los modelos de datos

3. **Lee la documentación del proyecto:**
   - README.md → Visión general y estructura
   - Este archivo (INSTALLATION.md) → Instalación
   - Próximamente: ARCHITECTURE.md → Arquitectura detallada

---

## Soporte

Si encuentras problemas durante la instalación:

1. Verifica que todos los pasos del checklist estén completados
2. Revisa la sección "Problemas Comunes"
3. Consulta los logs del backend y frontend para errores específicos
4. Crea un issue en el repositorio con:
   - Descripción del problema
   - Pasos para reproducirlo
   - Logs de error completos
   - Versiones de Node.js, npm, Python

---

**Última actualización:** Enero 2025
