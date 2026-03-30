import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgpu';
import { isWebGPUSupported, validateModelMetadata, logError } from '../utils/common';

export class DetectionService {
  constructor() {
    this.model = null;
    this.labels = [];
    this.config = null;
    this.currentBackend = null;
  }

  // TODO [Basic] Muat model dan metadata secara bersamaan, lalu simpan ke instance
  // TODO [Advance] Implementasikan strategi Backend Adaptive
  async loadModel(onProgress) {
    try {
      if (isWebGPUSupported()) {
        await tf.setBackend('webgpu');
        this.currentBackend = 'webgpu';
      } else {
        await tf.setBackend('webgl');
        this.currentBackend = 'webgl';
      }
      await tf.ready();

      const modelUrl = '/model/model.json';
      const metadataUrl = '/model/metadata.json';

      if (onProgress) onProgress(0.1);

      const [loadedModel, metadataResponse] = await Promise.all([
        tf.loadLayersModel(modelUrl, {
          onProgress: (fraction) => {
            if (onProgress) onProgress(0.1 + fraction * 0.8);
          }
        }),
        fetch(metadataUrl)
      ]);

      this.model = loadedModel;
      const metadata = await metadataResponse.json();

      if (validateModelMetadata(metadata)) {
        this.labels = metadata.labels;
      } else {
        throw new Error('Invalid metadata format');
      }

      if (onProgress) onProgress(1.0);

    } catch (error) {
      logError('DetectionService.loadModel', error);
      throw error;
    }
  }

  // TODO [Basic] Lakukan prediksi pada elemen gambar yang diberikan dan kembalikan hasilnya
  async predict(imageElement) {
    if (!this.isLoaded()) {
      throw new Error('Model is not loaded yet');
    }

    return tf.tidy(() => {
      // Convert image element to tensor
      const imgTensor = tf.browser.fromPixels(imageElement);

      // Resize to 224x224
      const resized = tf.image.resizeBilinear(imgTensor, [224, 224]);

      // Normalize values if needed depending on model
      // standard TM image model preprocessing (0-255 -> 0-1 or -1 to 1)
      const normalized = resized.toFloat().div(tf.scalar(255));

      // Expand dims
      const batched = normalized.expandDims(0);

      // Predict
      const predictions = this.model.predict(batched);

      // Get array of probabilities
      const probs = predictions.dataSync();

      // Find highest probability
      let maxProb = 0;
      let maxClassIndex = -1;
      for (let i = 0; i < probs.length; i++) {
        if (probs[i] > maxProb) {
          maxProb = probs[i];
          maxClassIndex = i;
        }
      }

      if (maxClassIndex !== -1) {
        return {
          result: this.labels[maxClassIndex],
          confidence: Math.round(maxProb * 100),
          isValid: true,
        };
      }

      return { isValid: false };
    });
  }

  // TODO [Basic] Periksa apakah model sudah dimuat dan siap digunakan
  isLoaded() {
    return this.model !== null && this.labels.length > 0;
  }
}
