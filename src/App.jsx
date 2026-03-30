import { useEffect, useRef, useState } from 'react';
import Header from './components/Header';
import CameraSection from './components/CameraSection';
import InfoPanel from './components/InfoPanel';
import { useAppState } from './hooks/useAppState';
import { DetectionService } from './services/DetectionService';
import { CameraService } from './services/CameraService';
import { RootFactsService } from './services/RootFactsService';
import { APP_CONFIG, isValidDetection } from './utils/config';

function App() {
  const { state, actions } = useAppState();
  const detectionCleanupRef = useRef(null);
  const isRunningRef = useRef(false);
  const [currentTone, setCurrentTone] = useState('normal');

  // TODO [Basic] Inisialisasi layanan deteksi, kamera, dan generator fakta saat aplikasi dimuat
  useEffect(() => {
    const initServices = async () => {
      try {
        const detector = new DetectionService();
        const camera = new CameraService();
        const generator = new RootFactsService();

        actions.setServices({ detector, camera, generator });

        let progressD = 0;
        let progressG = 0;

        const updateProgress = () => {
          const totalProgress = Math.round(((progressD + progressG) / 2) * 100);
          if (totalProgress < 100) {
            actions.setModelStatus(`Memuat Model AI... ${totalProgress}%`);
          } else {
            actions.setModelStatus('Model AI Siap');
          }
        };

        const loadPromises = [
          detector.loadModel((p) => { progressD = p; updateProgress(); }),
          generator.loadModel((p) => { progressG = p; updateProgress(); }),
          camera.loadCameras()
        ];

        await Promise.all(loadPromises);

        actions.setModelStatus('Model AI Siap');
      } catch (error) {
        actions.setError(`Gagal menginisialisasi layanan: ${  error.message}`);
        actions.setModelStatus('Error Memuat Model');
      }
    };

    initServices();
  }, []);

  // Sync ref with state
  useEffect(() => {
    isRunningRef.current = state.isRunning;
  }, [state.isRunning]);

  // TODO [Basic] Bersihkan sumber daya saat komponen ditinggalkan
  useEffect(() => {
    return () => {
      if (detectionCleanupRef.current) {
        cancelAnimationFrame(detectionCleanupRef.current);
      }
      if (state.services.camera) {
        state.services.camera.stopCamera();
      }
    };
  }, [state.services.camera]);

  // TODO [Basic] Fungsi untuk memulai loop deteksi
  const startDetectionLoop = async () => {
    const { detector, camera, generator } = state.services;

    if (!isRunningRef.current || !camera.isActive() || !detector.isLoaded()) {
      return;
    }

    try {
      const pred = await detector.predict(camera.video);

      // pred returns { result: 'Vegetable Name', confidence: 0-100, isValid: true }
      // isValidDetection expects { isValid, confidence } compared to detectionConfidenceThreshold
      if (isValidDetection(pred)) {
        // Stop scanning, proceed to facts
        handleToggleCamera(); // stop the loop

        // Show scanning finished ui state
        actions.setAppState('result');
        const mappedResult = {
          className: pred.result,
          score: pred.confidence / 100
        };
        actions.setDetectionResult(mappedResult);

        // Gen fact
        try {
          const funFact = await generator.generateFacts(pred.result);
          actions.setFunFactData(funFact);
        } catch (err) {
          actions.setFunFactData('error');
        }

        return; // end loop
      }
    } catch (err) {
      console.error(err);
    }

    // throttle based on camera fps
    setTimeout(() => {
      detectionCleanupRef.current = requestAnimationFrame(startDetectionLoop);
    }, 1000 / camera.config.fps);
  };

  // TODO [Basic] Fungsi untuk memulai dan menghentikan kamera
  const handleToggleCamera = async () => {
    const { camera } = state.services;

    if (state.isRunning) {
      // Stop
      actions.setRunning(false);
      isRunningRef.current = false;
      camera.stopCamera();
      if (detectionCleanupRef.current) {
        cancelAnimationFrame(detectionCleanupRef.current);
      }
      if (state.appState !== 'result') {
        actions.setAppState('idle');
      }
    } else {
      // Start
      try {
        actions.setError(null);
        actions.resetResults();

        await camera.startCamera();
        actions.setRunning(true);
        isRunningRef.current = true;
        actions.setAppState('analyzing');

        // Small delay to let camera stabilize
        setTimeout(() => {
          startDetectionLoop();
        }, APP_CONFIG.analyzingDelay || 500);

      } catch (err) {
        actions.setError(`Gagal memulai kamera: ${  err.message}`);
      }
    }
  };

  // TODO [Advance] Fungsi untuk mengubah nada fakta yang dihasilkan
  const handleToneChange = (newTone) => {
    setCurrentTone(newTone);
    if (state.services.generator) {
      state.services.generator.setTone(newTone);
    }
  };

  // TODO [Skilled] Fungsi untuk menyalin fakta ke clipboard
  const handleCopyFact = async () => {
    if (state.funFactData && state.funFactData !== 'error') {
      try {
        await navigator.clipboard.writeText(state.funFactData);
        alert('Teks berhasil disalin!');
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  };

  return (
    <div className="app-container">
      <Header modelStatus={state.modelStatus} />

      <main className="main-content">
        <CameraSection
          isRunning={state.isRunning}
          services={state.services}
          modelStatus={state.modelStatus}
          error={state.error}
          currentTone={currentTone}
          onToggleCamera={handleToggleCamera}
          onToneChange={handleToneChange}
        />

        <InfoPanel
          appState={state.appState}
          detectionResult={state.detectionResult}
          funFactData={state.funFactData}
          error={state.error}
          onCopyFact={handleCopyFact}
        />
      </main>

      <footer className="footer">
        <p>Powered by TensorFlow.js & Transformers.js</p>
      </footer>

      {state.error && (
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: '380px',
          padding: '0.875rem 1rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          color: '#991b1b',
          fontSize: '0.8125rem',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 1000
        }}>
          <strong>Error:</strong> {state.error}
          <button
            onClick={() => actions.setError(null)}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: '#991b1b',
              padding: 0,
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
