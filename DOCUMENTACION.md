# 📚 Documentación Técnica — VideoSaaS Converter

> **Proyecto**: Convertidor de Videos y GIF Maker  
> **Stack**: Vite + Vanilla JS + FFmpeg.wasm + Lucide Icons  
> **Fecha de generación**: 21 de Febrero de 2026  
> **Desarrollado con asistencia de IA**

---

## 📑 Índice General

1. [Introducción y Visión General](#1-introducción-y-visión-general)
2. [Tecnologías Utilizadas](#2-tecnologías-utilizadas)
   - 2.1 [Vite](#21-vite)
   - 2.2 [FFmpeg.wasm](#22-ffmpegwasm)
   - 2.3 [Lucide Icons](#23-lucide-icons)
3. [Arquitectura del Proyecto](#3-arquitectura-del-proyecto)
   - 3.1 [Estructura de Carpetas](#31-estructura-de-carpetas)
   - 3.2 [Principio de Separación de Responsabilidades](#32-principio-de-separación-de-responsabilidades)
   - 3.3 [Flujo de Datos General](#33-flujo-de-datos-general)
4. [Configuración del Proyecto](#4-configuración-del-proyecto)
   - 4.1 [package.json](#41-packagejson)
   - 4.2 [vite.config.js — Headers COOP/COEP](#42-viteconfigjs--headers-coopcoep)
5. [Capa Core — Lógica de Negocio](#5-capa-core--lógica-de-negocio)
   - 5.1 [states.js — Máquina de Estados](#51-statesjs--máquina-de-estados)
   - 5.2 [CreditManager.js — Sistema de Tokens](#52-creditmanagerjs--sistema-de-tokens)
6. [Capa Services — Motor de Transcodificación](#6-capa-services--motor-de-transcodificación)
   - 6.1 [FFmpegService.js — Singleton del Motor](#61-ffmpegservicejs--singleton-del-motor)
   - 6.2 [Ciclo de Vida del Motor FFmpeg](#62-ciclo-de-vida-del-motor-ffmpeg)
   - 6.3 [Sistema de Archivos Virtual (FS)](#63-sistema-de-archivos-virtual-fs)
7. [Capa UI — Módulos de Interfaz](#7-capa-ui--módulos-de-interfaz)
   - 7.1 [UIRouter.js — Navegación por Pestañas](#71-uirouterjs--navegación-por-pestañas)
   - 7.2 [VideoModule.js — Convertidor WebM](#72-videomodulejs--convertidor-webm)
   - 7.3 [GifModule.js — Creador de GIF](#73-gifmodulejs--creador-de-gif)
8. [Capa Utils — Funciones de Ayuda](#8-capa-utils--funciones-de-ayuda)
   - 8.1 [formatters.js](#81-formattersjs)
9. [Punto de Entrada — main.js](#9-punto-de-entrada--mainjs)
10. [¿Cómo Funciona la Conversión de Videos (MP4 → WebM)?](#10-cómo-funciona-la-conversión-de-videos-mp4--webm)
    - 10.1 [Flujo Paso a Paso](#101-flujo-paso-a-paso)
    - 10.2 [Comando FFmpeg Explicado](#102-comando-ffmpeg-explicado)
    - 10.3 [¿Qué es CRF?](#103-qué-es-crf)
    - 10.4 [¿Por Qué VP8 y No VP9?](#104-por-qué-vp8-y-no-vp9)
11. [¿Cómo Funciona la Conversión de GIFs?](#11-cómo-funciona-la-conversión-de-gifs)
    - 11.1 [Flujo Paso a Paso](#111-flujo-paso-a-paso)
    - 11.2 [Proceso de Dos Pasadas (Palettegen + Paletteuse)](#112-proceso-de-dos-pasadas-palettegen--paletteuse)
    - 11.3 [Filtros de Video Explicados](#113-filtros-de-video-explicados)
    - 11.4 [Marca de Agua de Texto](#114-marca-de-agua-de-texto)
    - 11.5 [Marca de Agua con Imagen](#115-marca-de-agua-con-imagen)
    - 11.6 [Recorte de Duración (Trim)](#116-recorte-de-duración-trim)
12. [Errores Comunes y Soluciones](#12-errores-comunes-y-soluciones)
13. [Glosario de Términos](#13-glosario-de-términos)
14. [Próximos Pasos y Mejoras Futuras](#14-próximos-pasos-y-mejoras-futuras)

---

## 1. Introducción y Visión General

Esta aplicación es un **SaaS de procesamiento de medios** que permite a los usuarios:

- **Convertir videos MP4 a WebM** optimizados directamente en el navegador.
- **Crear GIFs animados** a partir de cualquier video, con opciones avanzadas de personalización.

**Lo que hace especial a esta app**: todo el procesamiento ocurre **en el navegador del usuario** (client-side). No se envía ningún video a un servidor externo. Esto se logra gracias a **FFmpeg.wasm**, una versión compilada de FFmpeg que corre dentro de WebAssembly.

### ¿Qué significa esto en la práctica?

```
┌──────────────────────────────────────────────────┐
│              NAVEGADOR DEL USUARIO               │
│                                                  │
│  ┌──────────┐    ┌──────────────┐    ┌────────┐  │
│  │  Tu App  │───▶│ FFmpeg.wasm  │───▶│ Output │  │
│  │  (UI)    │    │  (Motor)     │    │ (File) │  │
│  └──────────┘    └──────────────┘    └────────┘  │
│                                                  │
│  ✅ Sin servidor    ✅ Privacidad    ✅ Gratis    │
└──────────────────────────────────────────────────┘
```

No hay un servidor de backend procesando videos. Todo corre en la pestaña del navegador.

---

## 2. Tecnologías Utilizadas

### 2.1 Vite

**¿Qué es?** Vite es un *build tool* (herramienta de construcción) para proyectos web. Piensa en él como el "compilador" de tu proyecto. 

**¿Qué hace por nosotros?**
- Sirve los archivos en un servidor local de desarrollo (`localhost:5173`).
- Permite usar `import`/`export` de módulos ES6.
- Hot Module Replacement (HMR): cuando guardas un archivo, el navegador se actualiza automáticamente sin recargar toda la página.
- Compila todo en un bundle optimizado para producción con `npm run build`.

**¿Por qué es necesario y no simplemente un `index.html` abierto en el navegador?**  
Porque FFmpeg.wasm utiliza `SharedArrayBuffer`, una API del navegador que **solo funciona** en contextos seguros (HTTPS o localhost) con los headers COOP/COEP activados. Vite nos permite configurar estos headers.

### 2.2 FFmpeg.wasm

**¿Qué es?** Es una versión de [FFmpeg](https://ffmpeg.org/) (la herramienta de línea de comandos más potente del mundo para procesar audio y video) compilada a **WebAssembly** (WASM) para que funcione dentro del navegador.

**Paquetes que usamos:**

| Paquete | Versión | Función |
|---------|---------|---------|
| `@ffmpeg/ffmpeg` | ^0.12.15 | La API principal. Provee la clase `FFmpeg`. |
| `@ffmpeg/util` | ^0.12.2 | Utilidades como `fetchFile()` (lee archivos) y `toBlobURL()` (convierte URLs a Blob URLs para evitar problemas de CORS). |

**¿De dónde sale el motor WASM?**  
El archivo binario `ffmpeg-core.wasm` (~31MB) se descarga en tiempo de ejecución desde un CDN (unpkg.com). No se incluye en el bundle de tu app.

```
https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm
```

### 2.3 Lucide Icons

**¿Qué es?** Una librería de iconos SVG de código abierto, ligera y moderna. Alternativa a Font Awesome pero sin el peso de una fuente completa.

**¿Cómo funciona?**  
En el HTML pones un placeholder: `<i data-lucide="video"></i>`  
Luego en JavaScript, `createIcons()` busca todos esos placeholders y los reemplaza con el SVG real del icono correspondiente.

---

## 3. Arquitectura del Proyecto

### 3.1 Estructura de Carpetas

```
mp4 to webp/
├── index.html              ← Estructura HTML (la "vista")
├── vite.config.js          ← Configuración de Vite y headers de seguridad
├── package.json            ← Dependencias y scripts npm
├── DOCUMENTACION.md        ← Este archivo
│
└── src/                    ← Todo el código fuente
    ├── main.js             ← 🚀 Punto de entrada (el "director de orquesta")
    │
    ├── assets/             ← Recursos estáticos
    │   └── style.css       ← Estilos CSS globales
    │
    ├── core/               ← 🧠 Lógica de negocio (NO toca el DOM)
    │   ├── states.js       ← Definición de estados de la app
    │   └── CreditManager.js← Sistema de tokens/créditos
    │
    ├── services/           ← ⚙️ Servicios externos
    │   └── FFmpegService.js← Wrapper del motor FFmpeg.wasm
    │
    ├── ui/                 ← 🎨 Controladores de interfaz
    │   ├── UIRouter.js     ← Navegación entre pestañas
    │   ├── VideoModule.js  ← Convertidor MP4 → WebM
    │   └── GifModule.js    ← Creador de GIF con opciones avanzadas
    │
    └── utils/              ← 🔧 Funciones de ayuda puras
        └── formatters.js   ← Formateo de tamaños de archivo
```

### 3.2 Principio de Separación de Responsabilidades

La idea central es que **cada archivo tiene UNA sola razón para existir**:

```
┌─────────────┐     ┌────────────────┐     ┌──────────────┐
│    CORE      │     │   SERVICES     │     │     UI       │
│ (Reglas de   │     │ (Procesamiento │     │ (Lo que el   │
│  negocio)    │     │  pesado)       │     │  usuario ve) │
│              │     │                │     │              │
│ • ¿Cuántos   │     │ • Cargar WASM  │     │ • Botones    │
│   tokens     │     │ • Convertir    │     │ • Previews   │
│   quedan?    │     │   archivos     │     │ • Barras de  │
│ • ¿Qué       │     │ • Limpiar      │     │   progreso   │
│   estados    │     │   memoria      │     │ • Drag&Drop  │
│   existen?   │     │                │     │              │
└──────┬──────┘     └───────┬────────┘     └──────┬───────┘
       │                    │                      │
       └────────────────────┼──────────────────────┘
                            │
                    ┌───────▼───────┐
                    │   main.js     │
                    │ (Orquestador) │
                    └───────────────┘
```

**¿Por qué importa esto?**

Si mañana quieres cambiar de FFmpeg.wasm a un API en la nube (ej. Cloudinary), **solo modificas `FFmpegService.js`**. El resto de la aplicación (botones, previews, tokens) seguirá funcionando exactamente igual.

### 3.3 Flujo de Datos General

```
Usuario sube video
       │
       ▼
  UI Module (VideoModule o GifModule)
       │ 1. Valida el archivo
       │ 2. Muestra preview
       │ 3. Consulta créditos
       │
       ▼
  CreditManager
       │ ¿Tiene suficientes tokens?
       │   SÍ → consume tokens → continúa
       │   NO → desactiva botón → fin
       │
       ▼
  FFmpegService
       │ 1. Carga motor WASM (si no está cargado)
       │ 2. Escribe archivo al FS virtual
       │ 3. Ejecuta comando FFmpeg
       │ 4. Lee archivo de salida
       │ 5. Limpia FS virtual
       │
       ▼
  UI Module (de vuelta)
       │ 1. Crea Blob URL del resultado
       │ 2. Muestra preview
       │ 3. Muestra tamaño del archivo
       │ 4. Habilita botón de descarga
       ▼
  ¡ Listo !
```

---

## 4. Configuración del Proyecto

### 4.1 package.json

```json
{
  "name": "mp4-to-webm",
  "private": true,
  "version": "0.0.0",
  "type": "module",           // ← Habilita import/export de ES6
  "scripts": {
    "dev": "vite",            // ← Servidor de desarrollo
    "build": "vite build",    // ← Compilar para producción
    "preview": "vite preview" // ← Vista previa del build
  },
  "devDependencies": {
    "vite": "^7.3.1"
  },
  "dependencies": {
    "@ffmpeg/ffmpeg": "^0.12.15",  // ← Motor de conversión
    "@ffmpeg/util": "^0.12.2",     // ← Utilidades (fetchFile, toBlobURL)
    "lucide": "^0.575.0"          // ← Iconos SVG
  }
}
```

**Nota**: `"type": "module"` es crucial. Sin esto, Node.js no entiende `import`/`export` y la app no arranca.

### 4.2 vite.config.js — Headers COOP/COEP

```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
});
```

#### ¿Qué son estos headers y por qué son obligatorios?

FFmpeg.wasm utiliza `SharedArrayBuffer`, un tipo especial de memoria compartida entre hilos. Por razones de seguridad (para prevenir ataques como Spectre), los navegadores **bloquean** `SharedArrayBuffer` a menos que la página declare estos headers:

| Header | Valor | Significado |
|--------|-------|-------------|
| `Cross-Origin-Embedder-Policy` | `require-corp` | "Solo cargo recursos que me den permiso explícito" |
| `Cross-Origin-Opener-Policy` | `same-origin` | "Solo comparto ventana con páginas del mismo origen" |

**Si estos headers no están presentes**, FFmpeg.wasm lanzará un error:
```
SharedArrayBuffer no disponible. Requiere un contexto seguro.
```

#### ¿Qué hace `optimizeDeps.exclude`?

Vite intenta pre-compilar todas las dependencias para cargarlas más rápido. Pero FFmpeg es un paquete especial que carga archivos `.wasm` en tiempo de ejecución... si Vite lo pre-compila, rompe ese mecanismo. Con `exclude`, le decimos: "no toques estos paquetes, déjalos como están".

---

## 5. Capa Core — Lógica de Negocio

Esta capa contiene las **reglas de negocio** de la aplicación. **Nunca toca el DOM** (ni `document.getElementById`, ni `addEventListener`). Es pura lógica que podría funcionar incluso en Node.js.

### 5.1 states.js — Máquina de Estados

```javascript
export const APP_STATES = {
  IDLE: 'IDLE',               // App en reposo, esperando acción del usuario
  LOADING_ENGINE: 'LOADING_ENGINE', // Descargando ffmpeg-core.wasm (~31MB)
  UPLOADING: 'UPLOADING',     // Leyendo archivo del usuario
  PROCESSING: 'PROCESSING',   // FFmpeg ejecutando conversión
  SUCCESS: 'SUCCESS',         // Conversión completada
  ERROR: 'ERROR'              // Algo falló
};
```

**¿Para qué sirve?** Define los posibles estados de la aplicación. En lugar de usar strings sueltos como `'loading'` por el código (propenso a typos), usas `APP_STATES.LOADING_ENGINE`.

**Ejemplo de uso futuro:**
```javascript
if (currentState === APP_STATES.PROCESSING) {
  disableAllButtons();
}
```

### 5.2 CreditManager.js — Sistema de Tokens

Este es el "banco" de la aplicación. Cada conversión cuesta tokens:
- **Video → WebM**: 1 token
- **Video → GIF**: 2 tokens

```javascript
export class CreditManager {
  constructor(initialCredits = 10) {
    // Lee créditos de localStorage, o usa 10 por defecto
    this.credits = parseInt(localStorage.getItem('saas_credits')) || initialCredits;
    this.listeners = [];
  }
```

#### Métodos explicados:

| Método | ¿Qué hace? | Ejemplo |
|--------|-------------|---------|
| `balance` | Getter. Devuelve los créditos actuales. | `creditManager.balance // → 8` |
| `consume(amount)` | Resta tokens. Retorna `false` si no hay suficientes. | `creditManager.consume(2) // → true/false` |
| `add(amount)` | Suma tokens (para recargas futuras). | `creditManager.add(10)` |
| `persist()` | Guarda créditos en `localStorage`. | Se llama automáticamente. |
| `subscribe(callback)` | Registra una función que se ejecuta cada vez que cambian los créditos. | Ver abajo. |
| `notify()` | Avisa a todos los suscriptores que los créditos cambiaron. | Se llama automáticamente. |

#### Patrón Observer (Suscripción)

El `CreditManager` usa el **patrón Observer** para notificar cambios:

```javascript
// En main.js — suscribirse a cambios
creditManager.subscribe(tokens => {
  // Esta función se ejecuta cada vez que los tokens cambian
  creditDisplay.textContent = tokens;
});

// En VideoModule — también suscrito
creditManager.subscribe(tokens => {
  if (tokens <= 0) this.ui.btn.disabled = true;
});
```

**¿Por qué este patrón?** Porque múltiples partes de la UI necesitan reaccionar cuando los créditos cambian. Sin el patrón Observer, cada módulo tendría que "preguntar" constantemente si los créditos cambiaron (polling). Con Observer, el `CreditManager` les "avisa" automáticamente.

#### Persistencia con localStorage

```javascript
persist() {
  localStorage.setItem('saas_credits', this.credits);
}
```

`localStorage` es un almacenamiento del navegador que **sobrevive** al cierre de la pestaña, al recargar la página, e incluso al reiniciar el PC. Los datos solo se borran si el usuario limpia manualmente los datos del navegador.

---

## 6. Capa Services — Motor de Transcodificación

### 6.1 FFmpegService.js — Singleton del Motor

Este archivo es el **corazón técnico** de toda la aplicación. Es un *wrapper* (envoltorio) alrededor de la librería `@ffmpeg/ffmpeg` que:

1. Gestiona la carga del motor WASM.
2. Protege contra cargas duplicadas.
3. Expone métodos simplificados para los módulos de UI.
4. Maneja la limpieza de memoria.

```javascript
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

class FFmpegService {
  constructor() {
    this.ffmpeg = new FFmpeg();      // Instancia del motor
    this.loaded = false;              // ¿Ya se cargó el WASM?
    this.isFFmpegLoading = false;     // ¿Está cargando ahora mismo?
  }
```

#### ¿Por qué es un Singleton?

Al final del archivo:
```javascript
export const ffmpegService = new FFmpegService();
```

Solo se crea **UNA** instancia. Todos los módulos (`VideoModule`, `GifModule`) comparten la misma instancia. ¿Por qué? Porque cargar `ffmpeg-core.wasm` cuesta ~31MB de descarga y ~50MB de RAM. Si cada módulo creara su propia instancia, el navegador colapsaría.

### 6.2 Ciclo de Vida del Motor FFmpeg

```
┌──────────┐     ┌──────────────┐     ┌───────────┐
│ new       │────▶│   load()     │────▶│  exec()   │
│ FFmpeg()  │     │ (descarga    │     │ (ejecuta  │
│           │     │  .wasm)      │     │  comando) │
└──────────┘     └──────────────┘     └─────┬─────┘
                                            │
                                    ┌───────▼───────┐
                                    │  readFile()   │
                                    │ (lee salida)  │
                                    └───────┬───────┘
                                            │
                                    ┌───────▼───────┐
                                    │ deleteFile()  │
                                    │ (limpia RAM)  │
                                    └───────────────┘
```

#### Método `load()` — Carga con protección anti-duplicados

```javascript
async load(onProgress = () => {}) {
  if (this.loaded) return;         // ✅ Ya cargado, no hacer nada
    
  if (this.isFFmpegLoading) {      // ✅ Otro módulo lo está cargando
    while (this.isFFmpegLoading) { //    Esperar a que termine
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }

  this.isFFmpegLoading = true;     // 🔒 Bloquear para que nadie más cargue
```

**¿Por qué esta doble verificación?** Imagina que el usuario hace clic en "Convertir Video" y luego rápidamente cambia a "Crear GIF" y hace clic ahí también. Sin esta protección, ambos módulos intentarían cargar el WASM simultáneamente, causando un error.

#### Método `writeFile()` — Escritura al FS Virtual

```javascript
async writeFile(name, data) {
  await this.ffmpeg.writeFile(name, data);
}
```

FFmpeg.wasm tiene su propio **sistema de archivos virtual** (explicado abajo). Este método mete un archivo en ese FS para que FFmpeg pueda leerlo.

#### Método `exec()` — Ejecución de Comandos

```javascript
async exec(args) {
  await this.ffmpeg.exec(args);
}
```

Es equivalente a escribir en una terminal:
```bash
ffmpeg -i input.mp4 -c:v libvpx -crf 30 output.webm
```
Pero `args` se pasa como array:
```javascript
['-i', 'input.mp4', '-c:v', 'libvpx', '-crf', '30', 'output.webm']
```

#### Método `deleteFile()` — Limpieza Segura

```javascript
async deleteFile(name) {
  try { await this.ffmpeg.deleteFile(name); } catch(e) {}
}
```

El `try/catch` silencioso es **intencional**. Si intentas borrar un archivo que no existe (porque la conversión falló antes de crearlo), FFmpeg lanza un error. Con el `catch` vacío, lo ignoramos silenciosamente.

### 6.3 Sistema de Archivos Virtual (FS)

FFmpeg.wasm corre en un **sandbox** del navegador. No puede acceder a tu disco duro real. Entonces, ¿cómo lee y escribe archivos?

Usa un **sistema de archivos virtual** implementado en la RAM del navegador (usando Emscripten FS, una capa de abstracción de archivos similar a un disco virtual):

```
┌─────────────────────────────────────────────┐
│         Sistema de Archivos Virtual         │
│  (Solo existe en la RAM del navegador)      │
│                                             │
│  /                                          │
│  ├── input.mp4      (tu video subido)       │
│  ├── out.webm       (el video convertido)   │
│  ├── temp_input.mp4 (video para GIF)        │
│  ├── palette.png    (paleta de colores GIF) │
│  ├── out.gif        (el GIF generado)       │
│  ├── font.ttf       (fuente para watermark) │
│  └── watermark.png  (imagen de watermark)   │
│                                             │
│  ⚠️ Todo se pierde al recargar la página    │
└─────────────────────────────────────────────┘
```

**IMPORTANTE**: Si no limpias los archivos después de cada conversión, la RAM se llena y el navegador lanza `ErrnoError: FS error`. Por eso cada módulo llama a `deleteFile()` al terminar.

---

## 7. Capa UI — Módulos de Interfaz

### 7.1 UIRouter.js — Navegación por Pestañas

Este módulo gestiona la navegación entre las 2 páginas principales (Video y GIF):

```javascript
export const UIRouter = {
  elements: {
    navVideo: document.getElementById('nav-video'),    // Botón del sidebar
    navGif: document.getElementById('nav-gif'),        // Botón del sidebar
    videoPage: document.getElementById('video-page'),  // Container principal
    gifPage: document.getElementById('gif-page')       // Container principal
  },

  switchPage(page) {
    if (page === 'video') {
      this.elements.videoPage.classList.remove('hidden');   // Mostrar video
      this.elements.gifPage.classList.add('hidden');        // Ocultar GIF
      this.elements.navVideo.classList.add('active');       // Resaltar tab
      this.elements.navGif.classList.remove('active');
    } else {
      // Lo contrario
    }
  }
};
```

**¿Cómo funciona la clase `hidden`?** En CSS:
```css
.hidden { display: none; }
```
Es simplemente un toggle de visibilidad. Cuando añades `hidden` a un elemento, desaparece. Cuando lo quitas, aparece.

### 7.2 VideoModule.js — Convertidor WebM

Este módulo orquesta toda la experiencia de conversión de video:

#### Estructura del objeto

```javascript
export const VideoModule = {
  file: null,    // El archivo de video que subió el usuario (tipo File/Blob)
  ui: { ... },   // Referencias a elementos del DOM (cacheados)

  init() { ... },       // Registra los event listeners
  handleFile() { ... }, // Procesa el archivo subido
  convert() { ... }     // Ejecuta la conversión
};
```

#### Flujo de `init()`

```
init()
  ├── dropZone.click → abre selector de archivos
  ├── input.change → handleFile(file)
  ├── convert-btn.click → convert()
  ├── url-btn.click → fetch(url) → handleFile(blob)
  └── creditManager.subscribe → habilitar/deshabilitar botón
```

#### Flujo de `convert()`

```
convert()
  ├── 1. creditManager.consume(1)      // ¿Hay token?
  ├── 2. ffmpegService.load()           // Cargar motor (si no lo está)
  ├── 3. ffmpegService.writeFile()      // Meter video en FS virtual
  ├── 4. ffmpegService.exec(...)        // Ejecutar conversión VP8
  ├── 5. ffmpegService.readFile()       // Leer resultado
  ├── 6. new Blob([data])              // Crear archivo descargable
  ├── 7. URL.createObjectURL(blob)     // Crear URL temporal
  ├── 8. Mostrar preview + ahorro      // Actualizar UI
  └── 9. ffmpegService.deleteFile()    // 🧹 Limpiar FS virtual
```

### 7.3 GifModule.js — Creador de GIF

Este es el módulo más complejo de la aplicación. Maneja:
- Subida de video con preview
- Detección de duración del video
- Control de FPS
- Recorte de duración (inicio/fin)
- Control de colores (paleta)
- Resolución ajustable
- Marca de agua de texto (con descarga de fuente)
- Marca de agua con imagen (con opacidad y tamaño)

#### Propiedades del estado

```javascript
export const GifModule = {
  file: null,           // Archivo de video cargado
  videoDuration: 0,     // Duración del video en segundos
  fontLoaded: false,    // ¿Se descargó la fuente TTF?
  wmMode: 'text',       // Modo de watermark: 'text' | 'image' | 'none'
  wmImageFile: null,    // Archivo de imagen para watermark
  ui: {},               // Referencias DOM (se llenan en init)
```

#### Sistema de Tabs para Marca de Agua

```javascript
switchWmTab(mode) {
  this.wmMode = mode;
  // Desactivar todos los tabs
  [tabText, tabImage, tabNone].forEach(t => t.classList.remove('active'));
  // Activar el seleccionado
  if (mode === 'text') tabText.classList.add('active');
  
  // Mostrar/ocultar paneles
  panelText.classList.toggle('hidden', mode !== 'text');
  panelImage.classList.toggle('hidden', mode !== 'image');
  positionSection.classList.toggle('hidden', mode === 'none');
}
```

#### Detección de Duración del Video

Cuando el usuario sube un video, creamos un elemento `<video>` invisible para leer su metadata:

```javascript
const tempVideo = document.createElement('video');
tempVideo.preload = 'metadata';  // Solo descarga los metadatos, no todo el video
tempVideo.src = url;
tempVideo.onloadedmetadata = () => {
  this.videoDuration = tempVideo.duration;  // Duración en segundos
  // Ajustar controles de recorte
  this.ui.end.max = this.videoDuration;
  this.ui.end.value = Math.min(5, this.videoDuration);
};
```

#### Carga de Fuentes (Para watermark de texto)

FFmpeg.wasm **no tiene acceso a las fuentes del sistema operativo**. Si quieres usar `drawtext`, debes inyectar un archivo `.ttf` en el filesystem virtual.

```javascript
async loadFont() {
  if (this.fontLoaded) return true;

  for (const url of FONT_URLS) {    // Intenta múltiples CDNs
    try {
      const response = await fetch(url);
      if (!response.ok) continue;    // Si falla, intenta el siguiente
      const fontData = await response.arrayBuffer();
      await ffmpegService.writeFile('font.ttf', new Uint8Array(fontData));
      this.fontLoaded = true;
      return true;
    } catch (err) {
      console.warn('[Font] Falló:', url);
    }
  }
  return false;  // Ninguna fuente funcionó
}
```

Las URLs de fallback apuntan a Google Fonts gstatic, el CDN más fiable del mundo:
```
https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf
https://fonts.gstatic.com/s/opensans/v35/memSYaGs126MI...ttf
```

---

## 8. Capa Utils — Funciones de Ayuda

### 8.1 formatters.js

```javascript
export const formatSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
```

**¿Qué hace?** Convierte un número de bytes a un string legible:
- `formatSize(0)` → `'0 Bytes'`
- `formatSize(1024)` → `'1 KB'`
- `formatSize(5242880)` → `'5 MB'`
- `formatSize(1073741824)` → `'1 GB'`

**¿Cómo funciona la matemática?**
1. `Math.log(bytes) / Math.log(1024)` calcula "cuántas veces puedo dividir por 1024".
   - 1024 bytes → resultado 1 → índice `'KB'`
   - 1048576 bytes → resultado 2 → índice `'MB'`
2. `Math.floor()` redondea hacia abajo para obtener el índice del array `sizes`.
3. `(bytes / Math.pow(k, i)).toFixed(2)` divide y limita a 2 decimales.

---

## 9. Punto de Entrada — main.js

```javascript
import './assets/style.css';           // 1. Cargar estilos globales
import { createIcons, ... } from 'lucide'; // 2. Importar iconos
import { VideoModule } from './ui/VideoModule';
import { GifModule } from './ui/GifModule';
import { UIRouter } from './ui/UIRouter';
import { creditManager } from './core/CreditManager';

const initApp = () => {
  // Paso 1: Reemplazar <i data-lucide="..."> por SVGs reales
  createIcons({ icons: { Zap, Video, Image, ... } });

  // Paso 2: Activar navegación por pestañas
  UIRouter.init();

  // Paso 3: Conectar display de créditos a la UI
  const creditDisplay = document.getElementById('credit-count');
  creditManager.subscribe(tokens => {
    if (creditDisplay) creditDisplay.textContent = tokens;
  });

  // Paso 4: Iniciar módulos de conversión
  VideoModule.init();
  GifModule.init();
};

// Esperar a que el DOM esté listo antes de iniciar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();  // DOM ya está listo (script cargado con defer/module)
}
```

**¿Por qué el check de `readyState`?**  
Los scripts `type="module"` (como el nuestro en `index.html`) se cargan con `defer` automáticamente, lo que significa que el DOM ya suele estar listo cuando se ejecutan. Pero el check es una protección extra para navegadores edge-case.

---

## 10. ¿Cómo Funciona la Conversión de Videos (MP4 → WebM)?

### 10.1 Flujo Paso a Paso

```
1. Usuario sube video.mp4 (desde su PC o URL)
   │
2. Se gasta 1 token
   │
3. Se carga FFmpeg.wasm (primera vez: ~31MB descarga)
   │
4. El video se copia al FS virtual como "input.mp4"
   │
5. Se ejecuta el comando FFmpeg de conversión
   │
6. FFmpeg procesa frame por frame:
   │  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐
   │  │ F1  │─▶│ F2  │─▶│ F3  │─▶│ ... │ Decodifica → Recodifica
   │  └─────┘  └─────┘  └─────┘  └─────┘
   │
7. Se lee "out.webm" del FS virtual
   │
8. Se crea un Blob y se muestra en la preview
   │
9. Se calcula el ahorro: tamaño_original - tamaño_webm
   │
10. Se limpian los archivos del FS virtual
```

### 10.2 Comando FFmpeg Explicado

```javascript
await ffmpegService.exec([
  '-i', inputName,      // Input: el archivo de entrada
  '-c:v', 'libvpx',     // Codec de Video: VP8 (WebM)
  '-crf', crf,          // Calidad: factor de tasa constante
  '-b:v', '1M',         // Bitrate máximo: 1 Megabit/segundo
  '-c:a', 'libvorbis',  // Codec de Audio: Vorbis (compatible con WebM)
  'out.webm'            // Output: archivo de salida
]);
```

#### Desglose de cada flag:

| Flag | Valor | Significado |
|------|-------|-------------|
| `-i` | `input.mp4` | Archivo de entrada |
| `-c:v` | `libvpx` | Codec de video = VP8. "c:v" significa "codec:video" |
| `-crf` | `15-50` | Constant Rate Factor. Menor número = mejor calidad, mayor archivo |
| `-b:v` | `1M` | Bitrate máximo. Limita el tamaño para no agotar la RAM |
| `-c:a` | `libvorbis` | Codec de audio compatible con el contenedor WebM |
| (último arg) | `out.webm` | Nombre del archivo de salida |

### 10.3 ¿Qué es CRF?

CRF (Constant Rate Factor) es el método más inteligente de controlar la calidad:

```
CRF 15 ─────── Alta calidad ──── Archivo grande
CRF 30 ─────── Media calidad ─── Archivo mediano  (Default de la app)
CRF 50 ─────── Baja calidad ──── Archivo pequeño
```

A diferencia del bitrate fijo, CRF adapta la compresión **por escena**:
- Escenas estáticas (persona hablando): usa pocos bits.
- Escenas con movimiento rápido (explosiones): usa más bits.

### 10.4 ¿Por Qué VP8 y No VP9?

Inicialmente se usó VP9 (`libvpx-vp9`), que produce archivos más pequeños. Pero **causaba errores de memoria** en FFmpeg.wasm:

```
ErrnoError: FS error
Memory out of bounds
```

**¿Por qué?** VP9 es mucho más complejo computacionalmente. Necesita más RAM para sus buffers internos. En un navegador (donde la memoria disponible es limitada), esto provocaba crashes para videos de más de ~10 segundos.

VP8 (`libvpx`) es menos eficiente en compresión pero mucho más **estable** en entornos con memoria limitada. Para un SaaS cliente-side, la estabilidad es más importante que un 10% extra de compresión.

---

## 11. ¿Cómo Funciona la Conversión de GIFs?

### 11.1 Flujo Paso a Paso

```
1. Usuario sube video (cualquier formato)
   │
2. Se muestra preview del video + duración
   │
3. Usuario configura: FPS, duración, colores, resolución, watermark
   │
4. Se gastan 2 tokens
   │
5. Se carga FFmpeg.wasm (si no está cargado)
   │
6. ═══ PASO 1: Generar paleta ═══
   │  FFmpeg analiza los colores del video y crea palette.png
   │  (una imagen pequeña con los N colores más representativos)
   │
7. ═══ PASO 2: Crear GIF ═══
   │  FFmpeg usa palette.png para convertir cada frame a GIF
   │  con los colores óptimos
   │
8. Se lee out.gif, se muestra preview y peso del archivo
   │
9. Se limpia el FS virtual
```

### 11.2 Proceso de Dos Pasadas (Palettegen + Paletteuse)

Este es el concepto más importante de la conversión GIF. Sin este proceso, los GIFs se verían "feos" con colores pixelados.

#### ¿Por qué las dos pasadas?

El formato GIF solo admite **256 colores máximo** por frame. Si tu video tiene millones de colores (como cualquier video moderno), ¿cómo eliges cuáles 256 mantener?

**Método ingenuo** (sin paleta): FFmpeg elige los colores "a lo bruto", causando bandas de color y dithering horrible.

**Método profesional** (con paleta): Se analizan TODOS los frames del video primero para encontrar los 256 colores más representativos, y luego se aplican.

```
═══════════════════════════════
 PASO 1: palettegen (Análisis)
═══════════════════════════════

  Frame 1    Frame 2    Frame 3    ...    Frame N
  ┌─────┐   ┌─────┐   ┌─────┐          ┌─────┐
  │🟥🟦🟩│   │🟨🟥🟪│   │🟦🟩🟧│          │🟫🟥🟦│
  └──┬──┘   └──┬──┘   └──┬──┘          └──┬──┘
     │         │         │                 │
     └────────┬┘─────────┘─────────────────┘
              │
              ▼
     ┌──────────────────┐
     │   palette.png    │  ← 16x16 imagen con los
     │ 🟥🟦🟩🟨🟪🟧🟫⬜│     N colores más usados
     └──────────────────┘

═══════════════════════════════
 PASO 2: paletteuse (Aplicación)
═══════════════════════════════

  Frame 1 + palette.png → Frame 1 con colores optimizados
  Frame 2 + palette.png → Frame 2 con colores optimizados
  ...
  → out.gif
```

#### Comando del Paso 1 (palettegen):

```javascript
await ffmpegService.exec([
  '-ss', '0',          // Inicio del recorte
  '-i', inputName,     // Video de entrada
  '-t', '5',           // Duración máxima a analizar
  '-vf', 'fps=15,scale=320:-1,palettegen=max_colors=128',
  '-y', 'palette.png'  // Salida: imagen de paleta
]);
```

La magia está en `-vf` (video filter):
- `fps=15` → solo analizar 15 frames por segundo
- `scale=320:-1` → reducir a 320px de ancho
- `palettegen=max_colors=128` → generar paleta con máximo 128 colores

#### Comando del Paso 2 (paletteuse):

```javascript
const complex = `[0:v]fps=15,scale=320:-1[x];[x][1:v]paletteuse=dither=sierra2_4a`;
await ffmpegService.exec([
  '-ss', '0',
  '-i', inputName,       // Input 0: video
  '-t', '5',
  '-i', 'palette.png',   // Input 1: paleta
  '-filter_complex', complex,
  '-y', 'out.gif'
]);
```

**¿Qué es `filter_complex`?**  
Es como una "plomería" donde conectas múltiples entradas y filtros:

```
[0:v] = Stream de video del Input 0 (el video)
  │
  ├── fps=15            → Reducir fotogramas
  ├── scale=320:-1      → Reducir resolución
  │
  ▼ etiquetado como [x]
  
[1:v] = Stream de video del Input 1 (palette.png)
  │
  ▼
  
[x] + [1:v] → paletteuse=dither=sierra2_4a → out.gif
```

**¿Qué es `dither=sierra2_4a`?**  
Es un algoritmo de **dithering** que simula colores intermedios usando patrones de puntos. Sin dithering, los degradados se ven como "escalones" de color. Con Sierra 2-4A, los degradados son suaves.

### 11.3 Filtros de Video Explicados

Los filtros se **encadenan** con comas y se aplican en orden:

```
fps=15,scale=320:-1,drawtext=...
  │        │            │
  1º       2º           3º
```

| Filtro | Función | Ejemplo |
|--------|---------|---------|
| `fps=N` | Establece los fotogramas por segundo | `fps=10` (10 fps, archivo ligero) |
| `scale=W:-1` | Redimensiona. `-1` calcula la altura para mantener proporción | `scale=320:-1` (320px de ancho) |
| `drawtext=...` | Superpone texto sobre el video | Ver sección 11.4 |
| `palettegen` | Genera la paleta óptima de colores | `palettegen=max_colors=128` |
| `paletteuse` | Aplica la paleta al video | `paletteuse=dither=sierra2_4a` |
| `overlay` | Superpone una imagen sobre otra | Ver sección 11.5 |
| `colorchannelmixer` | Modifica canales de color (incluido alfa/opacidad) | `colorchannelmixer=aa=0.8` |
| `format=rgba` | Convierte a formato con canal alfa (transparencia) | Necesario para opacidad |

### 11.4 Marca de Agua de Texto

```javascript
drawtext=fontfile=font.ttf:text='Mi SaaS':fontcolor=white:fontsize=20:shadowcolor=black:shadowx=2:shadowy=2:x=w-tw-10:y=h-th-10
```

| Parámetro | Valor | Significado |
|-----------|-------|-------------|
| `fontfile` | `font.ttf` | Ruta a la fuente TTF en el FS virtual (obligatorio en WASM) |
| `text` | `'Mi SaaS'` | El texto a mostrar |
| `fontcolor` | `white` | Color del texto |
| `fontsize` | `20` | Tamaño en píxeles |
| `shadowcolor` | `black` | Color de la sombra |
| `shadowx/y` | `2` | Desplazamiento de la sombra (para que el texto se lea sobre fondos claros) |
| `x` | `w-tw-10` | Posición X. `w` = ancho del video, `tw` = ancho del texto |
| `y` | `h-th-10` | Posición Y. `h` = alto del video, `th` = alto del texto |

**Posiciones comunes:**

```
┌──────────────────────┐
│ x=10:y=10      x=w-tw-10:y=10 │
│ (Sup. Izq.)    (Sup. Der.)     │
│                                │
│    x=(w-tw)/2:y=(h-th)/2      │
│         (Centro)               │
│                                │
│ x=10:y=h-th-10  x=w-tw-10:y=h-th-10 │
│ (Inf. Izq.)      (Inf. Der.)  │
└──────────────────────┘
```

### 11.5 Marca de Agua con Imagen

Cuando el usuario elige poner una imagen (logo) como watermark, el pipeline es más complejo:

```javascript
const complex = [
  // 1. Aplicar filtros base al video
  `[0:v]fps=15,scale=320:-1[base]`,
  
  // 2. Procesar la imagen watermark:
  //    - Escalarlo al tamaño elegido (ej: 32x32)
  //    - Mantener proporciones (force_original_aspect_ratio)
  //    - Convertir a RGBA (para tener canal alfa)
  //    - Aplicar opacidad (colorchannelmixer aa=0.8 = 80% opaco)
  `[1:v]scale=32:32:force_original_aspect_ratio=decrease,format=rgba,colorchannelmixer=aa=0.8[wm]`,
  
  // 3. Superponer watermark sobre el video
  `[base][wm]overlay=x=W-w-10:y=H-h-10[out]`,
  
  // 4. Aplicar paleta de colores para GIF
  `[out][2:v]paletteuse=dither=sierra2_4a`
].join(';');
```

**¿Cómo funciona la opacidad?**

`colorchannelmixer=aa=0.8` modifica el canal alfa (transparencia):
- `aa=1.0` → 100% opaco (sin transparencia)
- `aa=0.5` → 50% opaco (semitransparente)
- `aa=0.1` → 10% opaco (casi invisible)

**Variables de posición en `overlay` vs `drawtext`:**

| Variable | En `overlay` | En `drawtext` |
|----------|-------------|---------------|
| Ancho del video | `W` | `w` |
| Alto del video | `H` | `h` |
| Ancho del elemento | `w` | `tw` |
| Alto del elemento | `h` | `th` |

Sí, **son diferentes**. FFmpeg usa convenciones distintas para cada filtro. Es algo confuso pero así funciona.

### 11.6 Recorte de Duración (Trim)

Para crear GIFs de solo unos segundos, usamos `-ss` (seek) y `-t` (duration):

```javascript
await ffmpegService.exec([
  '-ss', '2.5',    // Empezar en el segundo 2.5
  '-i', inputName,
  '-t', '3.0',     // Durar solo 3 segundos (del 2.5 al 5.5)
  '-vf', '...',
  'out.gif'
]);
```

| Flag | Significado | Ejemplo |
|------|-------------|---------|
| `-ss` | **Seek**: segundo en el que empieza el recorte | `-ss 2.5` = empezar en 2.5s |
| `-t` | **Time**: duración del recorte | `-t 3.0` = durar 3 segundos |

**Posición importa**: `-ss` ANTES de `-i` es más rápido (seek por keyframes) que después (decodifica todo hasta llegar al punto).

---

## 12. Errores Comunes y Soluciones

### `SharedArrayBuffer no disponible`
**Causa**: Los headers COOP/COEP no están configurados.  
**Solución**: Verificar `vite.config.js` tiene los headers correctos. Solo funciona en `localhost` o `HTTPS`.

### `ErrnoError: FS error`
**Causa**: El sistema de archivos virtual de FFmpeg está lleno o intentas leer un archivo que no existe (porque un paso anterior falló).  
**Solución**: Siempre limpiar archivos con `deleteFile()` después de cada conversión. Si persiste, recarga la página.

### `No font filename provided`
**Causa**: Usaste `drawtext` sin el parámetro `fontfile=`. FFmpeg.wasm no tiene acceso a fuentes del sistema.  
**Solución**: Descargar una fuente TTF, cargarla al FS virtual con `writeFile()`, y referenciarla con `fontfile=font.ttf`.

### `Memory out of bounds`
**Causa**: El video es demasiado grande o el codec consume demasiada RAM.  
**Solución**: Usar VP8 en lugar de VP9. Limitar el bitrate con `-b:v 1M`. Reducir la resolución.

### `palette.png: No such file or directory`
**Causa**: El paso 1 (palettegen) falló silenciosamente (por un error en la cadena de filtros), y palette.png nunca se creó. Luego el paso 2 intenta leerlo y falla.  
**Solución**: Revisar los logs de consola `[FFmpeg]` para encontrar el error real del paso 1.

### `Failed to resolve import "./assets/style.css"`
**Causa**: El archivo CSS no existe en la ruta especificada.  
**Solución**: Verificar que `src/assets/style.css` existe. Si moviste archivos, actualiza la ruta del `import`.

---

## 13. Glosario de Términos

| Término | Definición |
|---------|-----------|
| **WASM** | WebAssembly. Formato binario que permite ejecutar código C/C++ en el navegador a velocidad casi nativa. |
| **Blob** | Binary Large Object. Representa datos binarios en JavaScript (como un archivo en memoria). |
| **Blob URL** | URL temporal (`blob:https://...`) que apunta a un Blob en memoria. Se crea con `URL.createObjectURL()`. |
| **CDN** | Content Delivery Network. Red de servidores que distribuyen archivos estáticamente (como las fuentes de Google Fonts). |
| **CORS** | Cross-Origin Resource Sharing. Política de seguridad que controla qué recursos puede cargar una web desde otros dominios. |
| **COOP/COEP** | Cross-Origin Opener/Embedder Policy. Headers HTTP necesarios para `SharedArrayBuffer`. |
| **SharedArrayBuffer** | Tipo de memoria compartida entre hilos de JavaScript. Necesario para que FFmpeg.wasm ejecute threads internos. |
| **Codec** | Codificador/Decodificador. Algoritmo que comprime y descomprime audio/video (VP8, H.264, Vorbis, AAC). |
| **VP8** | Codec de video de Google, usado en WebM. Menos eficiente que VP9 pero más estable en memoria limitada. |
| **CRF** | Constant Rate Factor. Método de control de calidad que adapta la compresión por escena. |
| **Bitrate** | Cantidad de datos por segundo en un stream. `1M` = 1 megabit por segundo. |
| **Dithering** | Técnica que simula colores intermedios usando patrones de puntos, mejorando degradados en paletas limitadas. |
| **Paleta** | Conjunto reducido de colores (máximo 256 en GIF) que representan toda la imagen. |
| **Filter Complex** | Cadena de procesamiento de FFmpeg que permite conectar múltiples inputs y filtros de forma flexible. |
| **Overlay** | Filtro de FFmpeg que superpone una imagen/video sobre otro. |
| **Singleton** | Patrón de diseño donde solo existe UNA instancia de una clase en toda la aplicación. |
| **Observer** | Patrón de diseño donde un objeto notifica automáticamente a sus "suscriptores" cuando su estado cambia. |
| **localStorage** | API del navegador para almacenar datos persistentes (sobrevive al cierre del navegador). |

---

## 14. Próximos Pasos y Mejoras Futuras

### Funcionalidad
- [ ] Historial de conversiones (guardar en `IndexedDB`)
- [ ] Recorte visual con timeline arrastrando marcadores sobre el video
- [ ] Soporte para lotes (convertir múltiples archivos)
- [ ] Diferentes algoritmos de dithering seleccionables

### Arquitectura
- [ ] Implementar la máquina de estados (`states.js`) para bloquear la UI durante procesamiento
- [ ] Conectar `CreditManager` a un backend real (Supabase, Firebase)
- [ ] Añadir tests unitarios para `FFmpegService` y `CreditManager`
- [ ] Considerar Service Workers para cachear el WASM core

### Rendimiento
- [ ] Lazy loading del CSS del módulo GIF (solo cargarlo cuando se navega a esa pestaña)
- [ ] Compresión del bundle con Brotli para producción
- [ ] Analizar el uso de memoria con Chrome DevTools Memory Profiler

---

> 📝 **Nota**: Esta documentación fue generada con asistencia de IA durante el proceso de desarrollo.  
> Cada sección refleja el código real del proyecto en su estado actual.  
> Fecha: 21 de Febrero de 2026.
