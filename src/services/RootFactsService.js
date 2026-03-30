import { pipeline, env } from '@huggingface/transformers';
import { TONE_CONFIG } from '../utils/config.js';
import { isWebGPUSupported, logError } from '../utils/common.js';

env.allowLocalModels = false;

export class RootFactsService {
  constructor() {
    this.generator = null;
    this.isModelLoaded = false;
    this.isGenerating = false;
    this.config = null;
    this.currentBackend = null;
    this.currentTone = TONE_CONFIG.defaultTone;
  }

  // TODO [Basic] Muat model dan inisialisasi pipeline text2text-generation
  // TODO [Advance] Implementasikan strategi Backend Adaptive
  async loadModel(onProgress) {
    try {
      this.currentBackend = isWebGPUSupported() ? 'webgpu' : 'webgl';

      this.generator = await pipeline(
        'text2text-generation',
        'Xenova/flan-t5-small',
        {
          device: this.currentBackend,
          progress_callback: (progressInfo) => {
            if (onProgress && progressInfo.status === 'progress') {
              onProgress(progressInfo.progress ? progressInfo.progress / 100 : 0.5);
            } else if (onProgress && progressInfo.status === 'ready') {
              onProgress(1.0);
            }
          }
        }
      );

      this.isModelLoaded = true;
      return true;
    } catch (error) {
      logError('RootFactsService.loadModel', error);

      try {
        this.currentBackend = 'wasm';
        this.generator = await pipeline(
          'text2text-generation',
          'Xenova/flan-t5-small',
          {
            device: 'wasm',
          }
        );
        this.isModelLoaded = true;
        return true;
      } catch (fallbackError) {
        logError('RootFactsService.loadModel Fallback', fallbackError);
        throw fallbackError;
      }
    }
  }

  // TODO [Advance] Konfigurasi tone fakta yang dihasilkan
  setTone(tone) {
    const validTones = TONE_CONFIG.availableTones.map((t) => t.value);
    if (validTones.includes(tone)) {
      this.currentTone = tone;
    }
  }

  // TODO [Basic] Lakukan prediksi pada elemen gambar yang diberikan dan kembalikan hasilnya
  // TODO [Skilled] Konfigurasikan parameter generasi berdasarkan kebutuhan
  // TODO [Advance] Implemenasikan parameter tone untuk mengatur nada fakta yang dihasilkan
  async generateFacts(vegetableName) {
    if (!this.isReady()) {
      throw new Error('AI Generator model is not ready yet');
    }

    this.isGenerating = true;

    try {
      let toneDescription = 'interesting';
      switch (this.currentTone) {
      case 'funny':
        toneDescription = 'funny and humorous';
        break;
      case 'professional':
        toneDescription = 'scientific and professional';
        break;
      case 'casual':
        toneDescription = 'casual and friendly';
        break;
      case 'normal':
      default:
        toneDescription = 'interesting';
        break;
      }

      const prompt = `Write a single, unique, and ${toneDescription} fun fact about the vegetable ${vegetableName}.`;

      const output = await this.generator(prompt, {
        max_new_tokens: 150,
        temperature: 0.7,
        top_p: 0.9,
        do_sample: true
      });

      this.isGenerating = false;

      if (output && output.length > 0 && output[0].generated_text) {
        return output[0].generated_text;
      }
      return 'No fun fact could be generated.';

    } catch (error) {
      this.isGenerating = false;
      logError('RootFactsService.generateFacts', error);
      throw error;
    }
  }

  // TODO [Basic] Periksa apakah model sudah dimuat dan siap digunakan
  isReady() {
    return this.isModelLoaded && this.generator !== null;
  }
}
