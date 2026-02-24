import { ffmpegService } from '../services/FFmpegService';
import { creditManager } from '../core/CreditManager';
import { formatSize } from '../utils/formatters';
import { fetchFile } from '@ffmpeg/util';

// URLs de fuentes con fallback (Google Fonts gstatic)
const FONT_URLS = [
  'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf',
  'https://fonts.gstatic.com/s/opensans/v35/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4gaVI.ttf',
];
const FONT_FILE = 'font.ttf';
const WM_IMG_FILE = 'watermark.png';

export const GifModule = {
  file: null,
  videoDuration: 0,
  fontLoaded: false,
  wmMode: 'text', // 'text' | 'image' | 'none'
  wmImageFile: null,

  ui: {},

  init() {
    // Cachear todos los elementos del DOM
    this.ui = {
      dropZone: document.getElementById('gif-drop-zone'),
      input: document.getElementById('gif-file-input'),
      previewContainer: document.getElementById('gif-input-preview-container'),
      originalPreview: document.getElementById('gif-original-preview'),
      videoInfo: document.getElementById('gif-video-info'),
      videoDurationLabel: document.getElementById('gif-video-duration'),
      btn: document.getElementById('gif-convert-btn'),
      progressSection: document.getElementById('gif-progress-section'),
      progressFill: document.getElementById('gif-progress-fill'),
      status: document.getElementById('gif-status-message'),
      previews: document.getElementById('gif-previews'),
      result: document.getElementById('gif-result'),
      download: document.getElementById('gif-download-btn'),
      filesize: document.getElementById('gif-filesize'),
      fps: document.getElementById('gif-fps'),
      fpsValue: document.getElementById('gif-fps-value'),
      start: document.getElementById('gif-start'),
      end: document.getElementById('gif-end'),
      durationLabel: document.getElementById('gif-duration-label'),
      colors: document.getElementById('gif-colors'),
      colorsValue: document.getElementById('gif-colors-value'),
      res: document.getElementById('gif-res'),
      wmText: document.getElementById('gif-watermark-text'),
      wmPos: document.getElementById('gif-watermark-pos'),
      // Tabs de marca de agua
      wmTabText: document.getElementById('wm-tab-text'),
      wmTabImage: document.getElementById('wm-tab-image'),
      wmTabNone: document.getElementById('wm-tab-none'),
      wmPanelText: document.getElementById('wm-panel-text'),
      wmPanelImage: document.getElementById('wm-panel-image'),
      wmPositionSection: document.getElementById('wm-position-section'),
      // Imagen watermark
      wmImgDrop: document.getElementById('wm-img-drop'),
      wmImgInput: document.getElementById('gif-wm-image-input'),
      wmImgPreview: document.getElementById('wm-img-preview'),
      wmImgSize: document.getElementById('gif-wm-img-size'),
      wmImgOpacity: document.getElementById('gif-wm-img-opacity'),
      wmImgOpacityValue: document.getElementById('gif-wm-img-opacity-value'),
      urlInput: document.getElementById('gif-url-input'),
      urlBtn: document.getElementById('gif-url-btn'),
    };

    // Eventos principales
    this.ui.dropZone.addEventListener('click', () => this.ui.input.click());
    this.ui.input.addEventListener('change', (e) => this.handleFile(e.target.files[0]));
    this.ui.btn.addEventListener('click', () => this.convert());

    // URL remota
    this.ui.urlBtn.addEventListener('click', async () => {
      const url = this.ui.urlInput.value.trim();
      if (!url) return;
      try {
        this.ui.status.textContent = 'Descargando video...';
        this.ui.status.style.color = 'var(--text-muted)';
        
        // Proxy interno propio para saltar restricciones y COEP
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
        
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error('No se pudo acceder al video (El servidor remoto lo bloquea)');
        
        const blob = await res.blob();
        
        // Verificación básica de que recibimos algo útil
        if (!blob.type.includes('video') && blob.size < 1000) {
          throw new Error('El archivo no parece ser un video válido o el acceso fue denegado.');
        }

        const file = new File([blob], 'remote-video.mp4', { type: blob.type || 'video/mp4' });
        this.handleFile(file);
        this.ui.urlInput.value = ''; // Limpiar campo
      } catch (e) {
        console.error("GIF URL Fetch error:", e);
        this.ui.status.textContent = 'Error: ' + e.message;
        this.ui.status.style.color = 'var(--error)';
        alert('Error al cargar URL: ' + e.message + '\n\nNota: Es posible que el sitio remoto bloquee incluso las conexiones por proxy.');
      }
    });

    // Drag & drop video
    this.ui.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); this.ui.dropZone.classList.add('drag-over'); });
    this.ui.dropZone.addEventListener('dragleave', () => this.ui.dropZone.classList.remove('drag-over'));
    this.ui.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.ui.dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) this.handleFile(e.dataTransfer.files[0]);
    });

    // Sliders en tiempo real
    this.ui.fps.addEventListener('input', () => {
      this.ui.fpsValue.textContent = `${this.ui.fps.value} fps`;
    });
    this.ui.colors.addEventListener('input', () => {
      this.ui.colorsValue.textContent = this.ui.colors.value;
    });
    this.ui.wmImgOpacity.addEventListener('input', () => {
      this.ui.wmImgOpacityValue.textContent = `${this.ui.wmImgOpacity.value}%`;
    });

    // Actualizar label de duración
    const updateDurationLabel = () => {
      const s = parseFloat(this.ui.start.value) || 0;
      const e = parseFloat(this.ui.end.value) || 5;
      const dur = Math.max(0, e - s);
      this.ui.durationLabel.textContent = `Duración del GIF: ${dur.toFixed(1)}s`;
    };
    this.ui.start.addEventListener('input', updateDurationLabel);
    this.ui.end.addEventListener('input', updateDurationLabel);

    // Tabs de marca de agua
    this.ui.wmTabText.addEventListener('click', () => this.switchWmTab('text'));
    this.ui.wmTabImage.addEventListener('click', () => this.switchWmTab('image'));
    this.ui.wmTabNone.addEventListener('click', () => this.switchWmTab('none'));

    // Imagen watermark upload
    this.ui.wmImgDrop.addEventListener('click', () => this.ui.wmImgInput.click());
    this.ui.wmImgInput.addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      this.wmImageFile = f;
      const url = URL.createObjectURL(f);
      this.ui.wmImgPreview.src = url;
      this.ui.wmImgPreview.classList.remove('hidden');
    });

    creditManager.subscribe(tokens => {
      if (this.file && tokens >= 2) this.ui.btn.disabled = false;
      else if (tokens < 2) this.ui.btn.disabled = true;
    });
  },

  switchWmTab(mode) {
    this.wmMode = mode;
    // Actualizar tabs
    [this.ui.wmTabText, this.ui.wmTabImage, this.ui.wmTabNone].forEach(t => t.classList.remove('active'));
    if (mode === 'text') this.ui.wmTabText.classList.add('active');
    else if (mode === 'image') this.ui.wmTabImage.classList.add('active');
    else this.ui.wmTabNone.classList.add('active');

    // Mostrar/ocultar paneles
    this.ui.wmPanelText.classList.toggle('hidden', mode !== 'text');
    this.ui.wmPanelImage.classList.toggle('hidden', mode !== 'image');
    this.ui.wmPositionSection.classList.toggle('hidden', mode === 'none');
  },

  handleFile(file) {
    if (!file) return;
    this.file = file;

    const url = URL.createObjectURL(file);
    this.ui.originalPreview.src = url;
    this.ui.previewContainer.classList.remove('hidden');

    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      this.videoDuration = tempVideo.duration;
      const mins = Math.floor(this.videoDuration / 60);
      const secs = (this.videoDuration % 60).toFixed(1);
      this.ui.videoDurationLabel.textContent = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      this.ui.videoInfo.classList.remove('hidden');

      this.ui.start.max = Math.max(0, this.videoDuration - 0.5);
      this.ui.end.max = this.videoDuration;
      this.ui.end.value = Math.min(5, this.videoDuration).toFixed(1);
      this.ui.start.value = 0;

      const dur = Math.min(5, this.videoDuration);
      this.ui.durationLabel.textContent = `Duración del GIF: ${dur.toFixed(1)}s`;
    };

    this.ui.btn.disabled = creditManager.balance < 2;
    this.ui.previews.classList.add('hidden');
    this.ui.status.textContent = 'Video listo.';
    this.ui.status.style.color = 'var(--text-muted)';
  },

  async loadFont() {
    if (this.fontLoaded) return true;
    for (const url of FONT_URLS) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        const fontData = await response.arrayBuffer();
        await ffmpegService.writeFile(FONT_FILE, new Uint8Array(fontData));
        this.fontLoaded = true;
        return true;
      } catch (err) {
        console.warn('[Font] Falló:', url, err.message);
      }
    }
    this.fontLoaded = false;
    return false;
  },

  /**
   * Calcula las coordenadas de overlay/drawtext según la posición seleccionada.
   * Para overlay usa W/H (dimensiones del video) y w/h (dimensiones del overlay).
   * Para drawtext usa w/h (dimensiones del video) y tw/th (dimensiones del texto).
   */
  getPosition(type) {
    const p = this.ui.wmPos.value;
    if (type === 'overlay') {
      switch (p) {
        case 'top_left': return 'x=10:y=10';
        case 'top_right': return 'x=W-w-10:y=10';
        case 'bottom_left': return 'x=10:y=H-h-10';
        case 'bottom_right': return 'x=W-w-10:y=H-h-10';
        case 'center': return 'x=(W-w)/2:y=(H-h)/2';
        default: return 'x=10:y=10';
      }
    } else {
      switch (p) {
        case 'top_left': return 'x=10:y=10';
        case 'top_right': return 'x=w-tw-10:y=10';
        case 'bottom_left': return 'x=10:y=h-th-10';
        case 'bottom_right': return 'x=w-tw-10:y=h-th-10';
        case 'center': return 'x=(w-tw)/2:y=(h-th)/2';
        default: return 'x=10:y=10';
      }
    }
  },

  async convert() {
    if (!this.file || !creditManager.consume(2)) return;

    try {
      this.ui.btn.disabled = true;
      this.ui.progressSection.style.display = 'block';
      this.ui.progressFill.style.width = '0%';
      this.ui.status.textContent = 'Cargando motor...';
      this.ui.status.style.color = 'var(--text-muted)';

      await ffmpegService.load(p => {
        this.ui.progressFill.style.width = `${p}%`;
        this.ui.status.textContent = `Cargando motor... ${p}%`;
      });

      const ext = this.file.name.split('.').pop() || 'mp4';
      const inputName = `temp_input.${ext}`;
      await ffmpegService.writeFile(inputName, await fetchFile(this.file));

      const fpsVal = this.ui.fps.value;
      const startSec = parseFloat(this.ui.start.value) || 0;
      const endSec = parseFloat(this.ui.end.value) || 5;
      const duration = Math.max(0.5, endSec - startSec);

      // ===== Construir filtros según el modo de watermark =====
      let useImageWatermark = false;

      if (this.wmMode === 'image' && this.wmImageFile) {
        // --- Modo: Imagen watermark (usa filter_complex diferente) ---
        useImageWatermark = true;
        this.ui.status.textContent = 'Cargando imagen de marca de agua...';
        await ffmpegService.writeFile(WM_IMG_FILE, await fetchFile(this.wmImageFile));

        const size = parseInt(this.ui.wmImgSize.value);
        const opacity = parseInt(this.ui.wmImgOpacity.value) / 100;
        const pos = this.getPosition('overlay');

        // Filtros base del video
        let baseFilters = `fps=${fpsVal}`;
        if (this.ui.res.value !== "-1") baseFilters += `,scale=${this.ui.res.value}:-1`;

        // Paso 1: Palettegen (sin overlay, solo filtros de video)
        this.ui.status.textContent = 'Analizando colores...';
        await ffmpegService.exec([
          '-ss', String(startSec), '-i', inputName, '-t', String(duration),
          '-vf', `${baseFilters},palettegen=max_colors=${this.ui.colors.value}`,
          '-y', 'palette.png'
        ]);

        // Paso 2: GIF con overlay de imagen + paleta
        // filter_complex: escalar watermark, aplicar opacidad, overlay sobre video, paletteuse
        this.ui.status.textContent = 'Generando GIF con marca de agua...';
        const complex = [
          `[0:v]${baseFilters}[base]`,
          `[1:v]scale=${size}:${size}:force_original_aspect_ratio=decrease,format=rgba,colorchannelmixer=aa=${opacity}[wm]`,
          `[base][wm]overlay=${pos}[out]`,
          `[out][2:v]paletteuse=dither=sierra2_4a`
        ].join(';');

        await ffmpegService.exec([
          '-ss', String(startSec), '-i', inputName, '-t', String(duration),
          '-i', WM_IMG_FILE,
          '-i', 'palette.png',
          '-filter_complex', complex,
          '-y', 'out.gif'
        ]);

      } else {
        // --- Modo: Texto o Sin marca ---
        let filters = [];
        filters.push(`fps=${fpsVal}`);
        if (this.ui.res.value !== "-1") filters.push(`scale=${this.ui.res.value}:-1`);

        // Marca de agua de texto
        if (this.wmMode === 'text') {
          const txt = this.ui.wmText.value.trim();
          if (txt) {
            this.ui.status.textContent = 'Descargando fuente...';
            const fontOk = await this.loadFont();
            if (fontOk) {
              const safe = txt.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "'\\''");
              const pos = this.getPosition('drawtext');
              filters.push(`drawtext=fontfile=${FONT_FILE}:text='${safe}':fontcolor=white:fontsize=20:shadowcolor=black:shadowx=2:shadowy=2:${pos}`);
            }
          }
        }

        const vf = filters.join(',');

        // Paso 1: Palettegen
        this.ui.status.textContent = 'Analizando colores...';
        await ffmpegService.exec([
          '-ss', String(startSec), '-i', inputName, '-t', String(duration),
          '-vf', `${vf},palettegen=max_colors=${this.ui.colors.value}`,
          '-y', 'palette.png'
        ]);

        // Paso 2: Paletteuse
        this.ui.status.textContent = 'Generando GIF...';
        const complex = `[0:v]${vf}[x];[x][1:v]paletteuse=dither=sierra2_4a`;
        await ffmpegService.exec([
          '-ss', String(startSec), '-i', inputName, '-t', String(duration),
          '-i', 'palette.png',
          '-filter_complex', complex,
          '-y', 'out.gif'
        ]);
      }

      // === Leer resultado ===
      const data = await ffmpegService.readFile('out.gif');
      const blob = new Blob([data.buffer], { type: 'image/gif' });
      const gifUrl = URL.createObjectURL(blob);

      this.ui.result.src = gifUrl;
      this.ui.filesize.textContent = formatSize(blob.size);
      this.ui.previews.classList.remove('hidden');
      this.ui.status.textContent = '¡GIF creado con éxito!';
      this.ui.status.style.color = 'var(--success)';

      this.ui.download.onclick = () => {
        const a = document.createElement('a');
        a.href = gifUrl;
        a.download = `gif_${Date.now()}.gif`;
        a.click();
      };

      this.ui.previews.scrollIntoView({ behavior: 'smooth' });

      // Cleanup
      await ffmpegService.deleteFile(inputName);
      await ffmpegService.deleteFile('palette.png');
      await ffmpegService.deleteFile('out.gif');
      if (useImageWatermark) await ffmpegService.deleteFile(WM_IMG_FILE);

    } catch (err) {
      console.error("GIF Error:", err);
      this.ui.status.textContent = "Error: " + (err.message || "Fallo en la conversión");
      this.ui.status.style.color = 'var(--error)';
    } finally {
      if (creditManager.balance >= 2) this.ui.btn.disabled = false;
    }
  }
};
