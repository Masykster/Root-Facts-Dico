import { useEffect, useRef, useState, useCallback } from 'react';
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
  const servicesRef = useRef({ detector: null, camera: null, generator: null });
  const [currentTone, setCurrentTone] = useState('normal');

  // TODO [Basic] Inisialisasi layanan deteksi, kamera, dan generator fakta saat aplikasi dimuat
  useEffect(() => {
    const initServices = async () => {
      try {
        const detector = new DetectionService();
        const camera = new CameraService();
        const generator = new RootFactsService();

        // Keep a stable ref so closures always see the latest services
        servicesRef.current = { detector, camera, generator };
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
        actions.setError(`Gagal menginisialisasi layanan: ${error.message}`);
        actions.setModelStatus('Error Memuat Model');
      }
    };

    initServices();

    // Cleanup only on unmount
    return () => {
      if (detectionCleanupRef.current) {
        cancelAnimationFrame(detectionCleanupRef.current);
      }
      if (servicesRef.current.camera) {
        servicesRef.current.camera.stopCamera();
      }
    };
  }, []);

  // TODO [Basic] Fungsi untuk memulai loop deteksi
  const startDetectionLoop = useCallback(async () => {
    const { detector, camera, generator } = servicesRef.current;

    if (!isRunningRef.current || !camera || !camera.isActive() || !detector || !detector.isLoaded()) {
      return;
    }

    try {
      const pred = await detector.predict(camera.video);

      // Guard: user may have stopped scanning while predict() was running
      if (!isRunningRef.current) return;

      if (isValidDetection(pred)) {
        // Stop scanning, proceed to facts
        isRunningRef.current = false;
        actions.setRunning(false);
        camera.stopCamera();
        if (detectionCleanupRef.current) {
          cancelAnimationFrame(detectionCleanupRef.current);
          detectionCleanupRef.current = null;
        }

        // Show result
        actions.setAppState('result');
        actions.setDetectionResult({
          className: pred.result,
          score: pred.confidence / 100
        });

        // Generate fun fact
        try {
          const funFact = await generator.generateFacts(pred.result);
          actions.setFunFactData(funFact);
        } catch (err) {
          actions.setFunFactData('error');
        }

        return; // end loop
      }
    } catch (err) {
      console.error('Detection error:', err);
    }

    // Continue loop only if still running
    if (isRunningRef.current) {
      const delay = Math.max(1000 / (camera.config?.fps || 30), 33);
      detectionCleanupRef.current = setTimeout(() => {
        requestAnimationFrame(startDetectionLoop);
      }, delay);
    }
  }, [actions]);

  // TODO [Basic] Fungsi untuk memulai dan menghentikan kamera
  const handleToggleCamera = useCallback(async () => {
    const { camera } = servicesRef.current;

    if (!camera) return;

    if (isRunningRef.current) {
      // Stop
      isRunningRef.current = false;
      actions.setRunning(false);
      camera.stopCamera();
      if (detectionCleanupRef.current) {
        cancelAnimationFrame(detectionCleanupRef.current);
        clearTimeout(detectionCleanupRef.current);
        detectionCleanupRef.current = null;
      }
      actions.setAppState('idle');
    } else {
      // Start
      try {
        actions.setError(null);
        actions.resetResults();

        await camera.startCamera();
        isRunningRef.current = true;
        actions.setRunning(true);
        actions.setAppState('analyzing');

        // Small delay to let camera stabilize
        setTimeout(() => {
          if (isRunningRef.current) {
            startDetectionLoop();
          }
        }, APP_CONFIG.analyzingDelay || 500);

      } catch (err) {
        actions.setError(`Gagal memulai kamera: ${err.message}`);
      }
    }
  }, [actions, startDetectionLoop]);

  // TODO [Advance] Fungsi untuk mengubah nada fakta yang dihasilkan
  const handleToneChange = (newTone) => {
    setCurrentTone(newTone);
    if (servicesRef.current.generator) {
      servicesRef.current.generator.setTone(newTone);
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
