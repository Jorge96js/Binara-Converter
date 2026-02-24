import { ffmpegService } from '../services/FFmpegService';
import { creditManager } from '../core/CreditManager';
import { formatSize } from '../utils/formatters';
import { fetchFile } from '@ffmpeg/util';

// URLs de fuentes con fallback (Google Fonts gstatic — mismas que GifModule)
const FONT_URLS = [
  'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf',
  'https://fonts.gstatic.com/s/opensans/v35/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4gaVI.ttf',
];
const FONT_FILE = 'font.ttf';
const WM_IMG_FILE = 'vid_watermark.png';

export const VideoModule = {
  file: null,
  fontLoaded: false,
  wmMode: 'text', // 'text' | 'image' | 'none'
  wmImageFile: null,

  ui: {},

  init() {
    // Cachear elementos del DOM
    this.ui = {
      dropZone: document.getElementById('drop-zone'),
      input: document.getElementById('file-input'),
      btn: document.getElementById('convert-btn'),
      progressSection: document.getElementById('progress-section'),
      progressFill: document.getElementById('progress-fill'),
      status: document.getElementById('status-message'),
      previews: document.getElementById('previews'),
      original: document.getElementById('original-preview'),
      result: document.getElementById('optimized-preview'),
      download: document.getElementById('download-btn'),
      savings: document.getElementById('savings-display'),
      qualityRange: document.getElementById('quality-range'),
      qualityValue: document.getElementById('quality-value'),
      res: document.getElementById('vid-res'),
      // Input preview
      inputPreviewContainer: document.getElementById('vid-input-preview-container'),
      inputPreview: document.getElementById('vid-original-preview'),
      videoInfo: document.getElementById('vid-video-info'),
      videoDuration: document.getElementById('vid-video-duration'),
      videoFilesize: document.getElementById('vid-video-filesize'),
      // Result size badges
      originalSize: document.getElementById('vid-original-size'),
      resultSize: document.getElementById('vid-result-size'),
      // Watermark tabs
      wmTabText: document.getElementById('vid-wm-tab-text'),
      wmTabImage: document.getElementById('vid-wm-tab-image'),
      wmTabNone: document.getElementById('vid-wm-tab-none'),
      wmPanelText: document.getElementById('vid-wm-panel-text'),
      wmPanelImage: document.getElementById('vid-wm-panel-image'),
      wmPositionSection: document.getElementById('vid-wm-position-section'),
      wmText: document.getElementById('vid-watermark-text'),
      wmPos: document.getElementById('vid-watermark-pos'),
      // Image watermark
      wmImgDrop: document.getElementById('vid-wm-img-drop'),
      wmImgInput: document.getElementById('vid-wm-image-input'),
      wmImgPreview: document.getElementById('vid-wm-img-preview'),
      wmImgSize: document.getElementById('vid-wm-img-size'),
      wmImgOpacity: document.getElementById('vid-wm-img-opacity'),
      wmImgOpacityValue: document.getElementById('vid-wm-img-opacity-value'),
    };

    // ─── Drop Zone ─────────────────────────
    this.ui.dropZone.addEventListener('click', () => this.ui.input.click());
    this.ui.input.addEventListener('change', (e) => this.handleFile(e.target.files[0]));

    // ─── URL remota ────────────────────────
    document.getElementById('url-btn').addEventListener('click', async () => {
      const input = document.getElementById('url-input');
      const url = input.value.trim();
      if (!url) return;
      try {
        this.ui.status.textContent = 'Descargando video...';
        this.ui.status.style.color = 'var(--text-muted)';
        
        // Usamos nuestro propio Proxy interno
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
        
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error('No se pudo acceder al video (El servidor remoto lo bloquea)');
        
        const blob = await res.blob();
        if (!blob.type.includes('video') && blob.size < 1000) {
           throw new Error('El archivo no parece ser un video válido o el acceso fue denegado.');
        }

        const file = new File([blob], 'remote-video.mp4', { type: blob.type || 'video/mp4' });
        this.handleFile(file);
        input.value = '';
      } catch (e) {
        console.error("Fetch error:", e);
        this.ui.status.textContent = 'Error: ' + e.message;
        this.ui.status.style.color = 'var(--error)';
        alert('Error al cargar URL: ' + e.message + '\n\nNota: Es posible que el sitio remoto bloquee incluso las conexiones por proxy.');
      }
    });

    // ─── Botón convertir ───────────────────
    this.ui.btn.addEventListener('click', () => this.convert());

    // ─── Quality slider feedback ───────────
    this.ui.qualityRange.addEventListener('input', () => {
      const v = parseInt(this.ui.qualityRange.value);
      let label;
      if (v <= 20) label = 'Alta';
      else if (v <= 35) label = 'Media';
      else label = 'Baja';
      this.ui.qualityValue.textContent = `${label} (${v})`;
    });

    // ─── Watermark tabs ────────────────────
    this.ui.wmTabText.addEventListener('click', () => this.switchWmTab('text'));
    this.ui.wmTabImage.addEventListener('click', () => this.switchWmTab('image'));
    this.ui.wmTabNone.addEventListener('click', () => this.switchWmTab('none'));

    // ─── Image watermark upload ────────────
    this.ui.wmImgDrop.addEventListener('click', () => this.ui.wmImgInput.click());
    this.ui.wmImgInput.addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      this.wmImageFile = f;
      const url = URL.createObjectURL(f);
      this.ui.wmImgPreview.src = url;
      this.ui.wmImgPreview.classList.remove('hidden');
      this.ui.wmImgDrop.style.borderColor = 'var(--primary)';
    });

    // ─── Opacity slider feedback ───────────
    this.ui.wmImgOpacity.addEventListener('input', () => {
      this.ui.wmImgOpacityValue.textContent = this.ui.wmImgOpacity.value + '%';
    });

    // ─── Créditos ──────────────────────────
    creditManager.subscribe(tokens => {
      if (this.file && tokens > 0) this.ui.btn.disabled = false;
      else if (tokens <= 0) this.ui.btn.disabled = true;
    });
  },

  switchWmTab(mode) {
    this.wmMode = mode;
    // Reset tabs
    [this.ui.wmTabText, this.ui.wmTabImage, this.ui.wmTabNone].forEach(t => t.classList.remove('active'));
    if (mode === 'text') this.ui.wmTabText.classList.add('active');
    else if (mode === 'image') this.ui.wmTabImage.classList.add('active');
    else this.ui.wmTabNone.classList.add('active');
    // Paneles
    this.ui.wmPanelText.classList.toggle('hidden', mode !== 'text');
    this.ui.wmPanelImage.classList.toggle('hidden', mode !== 'image');
    this.ui.wmPositionSection.classList.toggle('hidden', mode === 'none');
  },

  handleFile(file) {
    if (!file) return;
    this.file = file;

    const url = URL.createObjectURL(file);

    // Mostrar preview del input
    this.ui.inputPreview.src = url;
    this.ui.inputPreviewContainer.classList.remove('hidden');

    // Mostrar tamaño del archivo
    this.ui.videoFilesize.textContent = formatSize(file.size);

    // Detectar duración
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      const dur = tempVideo.duration;
      const mins = Math.floor(dur / 60);
      const secs = (dur % 60).toFixed(1);
      this.ui.videoDuration.textContent = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      this.ui.videoInfo.classList.remove('hidden');
      this.ui.videoInfo.style.display = 'inline-flex';
    };

    // Preparar UI
    this.ui.original.src = url;
    this.ui.previews.classList.add('hidden');
    this.ui.btn.disabled = creditManager.balance < 1;
    this.ui.status.textContent = 'Video listo.';
    this.ui.status.style.color = 'var(--text-muted)';
  },

  /**
   * Carga una fuente TTF en el filesystem virtual de FFmpeg.
   * Intenta múltiples URLs como fallback.
   */
  async loadFont() {
    if (this.fontLoaded) return true;
    for (const url of FONT_URLS) {
      try {
        console.log('[Font] Intentando:', url);
        const response = await fetch(url);
        if (!response.ok) continue;
        const fontData = await response.arrayBuffer();
        await ffmpegService.writeFile(FONT_FILE, new Uint8Array(fontData));
        this.fontLoaded = true;
        console.log('[Font] Cargada correctamente desde:', url);
        return true;
      } catch (err) {
        console.warn('[Font] Falló:', url, err.message);
      }
    }
    this.fontLoaded = false;
    return false;
  },

  /**
   * Calcula coordenadas para overlay/drawtext según la posición.
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
        default: return 'x=W-w-10:y=H-h-10';
      }
    } else {
      // drawtext
      switch (p) {
        case 'top_left': return 'x=10:y=10';
        case 'top_right': return 'x=w-tw-10:y=10';
        case 'bottom_left': return 'x=10:y=h-th-10';
        case 'bottom_right': return 'x=w-tw-10:y=h-th-10';
        case 'center': return 'x=(w-tw)/2:y=(h-th)/2';
        default: return 'x=w-tw-10:y=h-th-10';
      }
    }
  },

  async convert() {
    if (!this.file || !creditManager.consume(1)) return;

    try {
      this.ui.btn.disabled = true;
      this.ui.progressSection.style.display = 'block';
      this.ui.status.textContent = 'Cargando motor...';
      this.ui.status.style.color = 'var(--text-muted)';

      await ffmpegService.load(p => {
        this.ui.progressFill.style.width = `${p}%`;
        this.ui.status.textContent = `Cargando motor... ${p}%`;
      });

      const inputName = 'input.mp4';
      this.ui.status.textContent = 'Procesando video...';
      await ffmpegService.writeFile(inputName, await fetchFile(this.file));

      const crf = this.ui.qualityRange.value;
      const resVal = this.ui.res.value;

      // ─── Construir filtros de video ───
      const vFilters = [];
      if (resVal !== '-1') {
        vFilters.push(`scale=${resVal}:-2`);
      }

      // ─── Marca de agua por texto ───
      if (this.wmMode === 'text') {
        const txt = this.ui.wmText.value.trim();
        if (txt) {
          this.ui.status.textContent = 'Descargando fuente...';
          const fontOk = await this.loadFont();
          if (fontOk) {
            const safe = txt.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "'\\''");
            const pos = this.getPosition('drawtext');
            vFilters.push(`drawtext=fontfile=${FONT_FILE}:text='${safe}':fontcolor=white:fontsize=20:shadowcolor=black:shadowx=2:shadowy=2:${pos}`);
          } else {
            console.warn('[Video] No se pudo cargar la fuente, marca de agua de texto omitida');
          }
        }
      }

      // ─── Marca de agua por imagen ───
      if (this.wmMode === 'image' && this.wmImageFile) {
        this.ui.status.textContent = 'Procesando marca de agua...';
        await ffmpegService.writeFile(WM_IMG_FILE, await fetchFile(this.wmImageFile));

        const size = parseInt(this.ui.wmImgSize.value);
        const opacity = parseInt(this.ui.wmImgOpacity.value) / 100;
        const pos = this.getPosition('overlay');

        // Usar filter_complex para overlay de imagen
        let baseFilter = '';
        if (resVal !== '-1') {
          baseFilter = `scale=${resVal}:-2,`;
        }
        const complex = [
          `[0:v]${baseFilter}format=yuv420p[base]`,
          `[1:v]scale=${size}:${size}:force_original_aspect_ratio=decrease,format=rgba,colorchannelmixer=aa=${opacity}[wm]`,
          `[base][wm]overlay=${pos}[out]`
        ].join(';');

        this.ui.status.textContent = 'Convirtiendo video...';

        await ffmpegService.exec([
          '-i', inputName,
          '-i', WM_IMG_FILE,
          '-filter_complex', complex,
          '-map', '[out]',
          '-map', '0:a?',
          '-c:v', 'libvpx',
          '-crf', crf,
          '-b:v', '1M',
          '-c:a', 'libvorbis',
          '-y', 'out.webm'
        ]);
      } else {
        // Sin imagen de watermark: usar -vf simple
        this.ui.status.textContent = 'Convirtiendo video...';

        const args = ['-i', inputName];
        if (vFilters.length > 0) {
          args.push('-vf', vFilters.join(','));
        }
        args.push('-c:v', 'libvpx', '-crf', crf, '-b:v', '1M', '-c:a', 'libvorbis', '-y', 'out.webm');

        await ffmpegService.exec(args);
      }

      // ─── Leer resultado ───
      const data = await ffmpegService.readFile('out.webm');
      const blob = new Blob([data.buffer], { type: 'video/webm' });
      const url = URL.createObjectURL(blob);

      this.ui.result.src = url;
      this.ui.previews.classList.remove('hidden');
      this.ui.status.textContent = '¡Hecho!';

      // Mostrar tamaños
      this.ui.originalSize.textContent = formatSize(this.file.size);
      this.ui.resultSize.textContent = formatSize(blob.size);

      const saved = this.file.size - blob.size;
      const percent = ((saved / this.file.size) * 100).toFixed(1);
      if (saved > 0) {
        this.ui.savings.innerHTML = `<div class="savings-badge">Ahorro: ${formatSize(saved)} (${percent}%)</div>`;
      } else {
        this.ui.savings.innerHTML = `<div class="savings-badge" style="background: rgba(239,68,68,0.15); color: var(--error);">El resultado es más grande (+${formatSize(Math.abs(saved))})</div>`;
      }

      this.ui.download.onclick = () => {
        const a = document.createElement('a');
        a.href = url;
        a.download = 'video-optimizado.webm';
        a.click();
      };

      // Cleanup
      await ffmpegService.deleteFile(inputName);
      await ffmpegService.deleteFile('out.webm');
      if (this.wmMode === 'image') await ffmpegService.deleteFile(WM_IMG_FILE);

    } catch (err) {
      console.error('[Video] Error:', err);
      this.ui.status.textContent = 'Error: ' + err.message;
      this.ui.status.style.color = 'var(--error)';
    } finally {
      if (creditManager.balance > 0 && this.file) this.ui.btn.disabled = false;
    }
  }
};
