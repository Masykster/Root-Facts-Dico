export class CameraService {
  constructor() {
    this.stream = null;
    this.video = null;
    this.canvas = null;
    this.config = {
      fps: 30
    };
    this.devices = [];
    this.currentCameraId = null;
  }

  setVideoElement(videoElement) {
    this.video = videoElement;
  }

  setCanvasElement(canvasElement) {
    this.canvas = canvasElement;
  }

  // TODO [Basic] Tambahkan konfigurasi kamera untuk mendapatkan daftar perangkat input video
  // TODO [Basic] Dapatkan constraints kamera berdasarkan konfigurasi dan kamera yang dipilih
  async loadCameras() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      throw new Error('Media Devices API tidak didukung pada browser ini.');
    }

    // Request permission first
    await navigator.mediaDevices.getUserMedia({ video: true });

    const allDevices = await navigator.mediaDevices.enumerateDevices();
    this.devices = allDevices.filter((device) => device.kind === 'videoinput');

    if (this.devices.length === 0) {
      throw new Error('Tidak ada kamera yang ditemukan.');
    }

    return this.devices;
  }

  // TODO [Basic] Memulai kamera dengan perangkat yang dipilih dan menampilkan pada elemen video
  async startCamera(selectedCameraType = 'default') {
    if (!this.video) {
      throw new Error('Elemen video belum diatur.');
    }

    this.stopCamera();

    const constraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: selectedCameraType === 'front' ? 'user' : 'environment',
        frameRate: { ideal: this.config.fps }
      },
      audio: false
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;

      // Wait for video to start playing before resolving
      return new Promise((resolve, reject) => {
        this.video.onloadedmetadata = () => {
          this.video.play()
            .then(resolve)
            .catch(reject);
        };
      });
    } catch (error) {
      console.error('Error starting camera:', error);
      throw error;
    }
  }

  // TODO [Basic] Menghentikan siaran kamera dan membersihkan sumber daya
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  // TODO [Skilled] Implementasikan metode untuk mengatur FPS kamera
  setFPS(fps) {
    this.config.fps = fps;

    // Attempt to apply the constraint dynamically if stream is active
    if (this.stream) {
      const videoTrack = this.stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.applyConstraints({
          frameRate: { ideal: fps }
        }).catch((err) => {
          console.warn('Gagal mengubah frameRate secara dinamis:', err);
        });
      }
    }
  }

  // TODO [Basic] Periksa apakah kamera sedang aktif
  isActive() {
    return this.stream !== null && this.stream.active;
  }

  // TODO [Basic] Periksa apakah elemen video siap untuk digunakan
  isReady() {
    return this.video !== null && this.canvas !== null;
  }
}