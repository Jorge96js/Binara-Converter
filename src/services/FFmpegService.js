import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

class FFmpegService {
  constructor() {
    this.ffmpeg = new FFmpeg();
    this.loaded = false;
    this.isFFmpegLoading = false;
  }

  async load(onProgress = () => {}) {
    if (this.loaded) return;
    
    if (this.isFFmpegLoading) {
      while (this.isFFmpegLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isFFmpegLoading = true;
    
    try {
      if (!window.SharedArrayBuffer) {
        throw new Error("SharedArrayBuffer no disponible. Requiere un contexto seguro (https/localhost).");
      }

      this.ffmpeg.on('log', ({ message }) => console.debug('[FFmpeg]', message));
      this.ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100));
      });

      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      
      this.loaded = true;
    } catch (err) {
      console.error("FFmpeg Load Error:", err);
      throw err;
    } finally {
      this.isFFmpegLoading = false;
    }
  }

  async run(inputBlob, commandArray, outputName) {
    const inputName = `input_${Date.now()}`;
    await this.ffmpeg.writeFile(inputName, await fetchFile(inputBlob));
    
    try {
      await this.ffmpeg.exec(['-i', inputName, ...commandArray, outputName]);
      const data = await this.ffmpeg.readFile(outputName);
      
      // Cleanup
      await this.ffmpeg.deleteFile(inputName);
      await this.ffmpeg.deleteFile(outputName);
      
      return data;
    } catch (err) {
      // Intentar limpiar en caso de error
      try { await this.ffmpeg.deleteFile(inputName); } catch(e){}
      throw err;
    }
  }

  async deleteFile(name) {
    try { await this.ffmpeg.deleteFile(name); } catch(e) {}
  }

  async writeFile(name, data) {
    await this.ffmpeg.writeFile(name, data);
  }

  async exec(args) {
    await this.ffmpeg.exec(args);
  }

  async readFile(name) {
    return await this.ffmpeg.readFile(name);
  }
}

export const ffmpegService = new FFmpegService();
