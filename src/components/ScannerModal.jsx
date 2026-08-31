import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
}

export default function ScannerModal({ onClose, onScan, products }) {
  const videoRef = useRef(null);
  const readerInputRef = useRef(null);
  const controlsRef = useRef(null);
  const codeReaderRef = useRef(null);
  const readerTimerRef = useRef(null);
  const handledRef = useRef(false);
  const previousBodyOverflowRef = useRef('');

  const [mode, setMode] = useState(isMobileDevice() ? 'camera' : 'reader');
  const [readerValue, setReaderValue] = useState('');
  const [status, setStatus] = useState('');
  const [cameraState, setCameraState] = useState('starting');
  const [error, setError] = useState('');

  // Prevent the page behind the scanner from moving/flickering on mobile.
  useEffect(() => {
    previousBodyOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = previousBodyOverflowRef.current;
      document.body.style.overscrollBehavior = '';
    };
  }, []);

  const stopCamera = () => {
    try { controlsRef.current?.stop?.(); } catch (_) {}
    controlsRef.current = null;
    try { codeReaderRef.current?.reset?.(); } catch (_) {}
    codeReaderRef.current = null;

    const video = videoRef.current;
    if (video?.srcObject) {
      try { video.srcObject.getTracks().forEach(track => track.stop()); } catch (_) {}
      video.srcObject = null;
    }
    setCameraState('idle');
  };

  useEffect(() => () => {
    if (readerTimerRef.current) clearTimeout(readerTimerRef.current);
    stopCamera();
  }, []);

  const findProduct = (raw) => {
    const value = String(raw || '').trim();
    if (!value) return null;

    const normalize = (v) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, '');
    const normalized = normalize(value);

    const exact = products.find(p =>
      [p.ean, p.article_no, p.model, p.hsn, p.id]
        .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
        .some(v => normalize(v) === normalized)
    );
    if (exact) return exact;

    // QR codes can contain a URL or text around the actual EAN/article number.
    const tokens = value.match(/\d{8,14}/g) || [];
    for (const token of tokens) {
      const hit = products.find(p =>
        [p.ean, p.article_no, p.model, p.hsn]
          .some(v => String(v ?? '').replace(/\D/g, '') === token)
      );
      if (hit) return hit;
    }
    return null;
  };

  const handleValue = (value) => {
    if (handledRef.current) return true;
    const clean = String(value || '').trim();
    if (!clean) return false;

    const product = findProduct(clean);
    if (product) {
      handledRef.current = true;
      stopCamera();
      onScan(product);
      return true;
    }

    setStatus(`No matching article found for “${clean}”`);
    return false;
  };

  const startCamera = async () => {
    if (cameraState === 'running' || cameraState === 'starting') return;

    setError('');
    setStatus('Opening rear camera…');
    setCameraState('starting');
    handledRef.current = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('error');
      setError('Camera access is not available in this browser. Please use Chrome, Edge, Safari, or an external reader.');
      return;
    }

    try {
      const reader = new BrowserMultiFormatReader();
      codeReaderRef.current = reader;

      const controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        },
        videoRef.current,
        (result, scanError) => {
          if (result) {
            const raw = result.getText?.() || '';
            if (raw) handleValue(raw);
            return;
          }
          // ZXing emits frequent NotFound errors while searching; those are normal.
          if (scanError && scanError.name !== 'NotFoundException') {
            // Keep scanning. A transient autofocus/decode error should not stop the camera.
          }
        }
      );

      controlsRef.current = controls;
      setCameraState('running');
      setStatus('Point the rear camera at the QR code or barcode.');
    } catch (e) {
      stopCamera();
      setCameraState('error');
      if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') {
        setError('Camera permission was denied. Allow camera access for this site and reopen the scanner.');
      } else if (e?.name === 'NotFoundError') {
        setError('No camera was found. You can use an external barcode reader instead.');
      } else {
        setError('Unable to start the camera in this browser. Switch to Camera again or use External Reader.');
      }
    }
  };

  // Camera starts automatically when the scanner opens and whenever Camera is selected.
  useEffect(() => {
    if (mode !== 'camera') return undefined;
    const timer = setTimeout(() => startCamera(), 0);
    return () => clearTimeout(timer);
  }, [mode]);

  const focusReader = () => {
    setTimeout(() => readerInputRef.current?.focus(), 0);
  };

  useEffect(() => {
    if (mode !== 'reader') return undefined;
    focusReader();
    const onWindowFocus = () => focusReader();
    window.addEventListener('focus', onWindowFocus);
    return () => window.removeEventListener('focus', onWindowFocus);
  }, [mode]);

  const processReaderValue = (value) => {
    const clean = String(value || '').trim();
    if (!clean) return;
    if (handleValue(clean)) setReaderValue('');
  };

  const handleReaderChange = (value) => {
    setReaderValue(value);
    if (readerTimerRef.current) clearTimeout(readerTimerRef.current);

    // Some USB/Bluetooth readers do not send Enter. Treat a short burst of
    // keyboard input as one scan after a small quiet period.
    if (value.trim()) {
      readerTimerRef.current = setTimeout(() => processReaderValue(value), 120);
    }
  };

  const submitReader = (e) => {
    e.preventDefault();
    if (readerTimerRef.current) clearTimeout(readerTimerRef.current);
    processReaderValue(readerValue);
  };

  const switchMode = (next) => {
    if (next === mode) return;
    stopCamera();
    setError('');
    setStatus('');
    handledRef.current = false;
    setMode(next);
  };

  return (
    <div
      className="scanner-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Scan barcode or QR code"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="scanner-modal">
        <div className="scanner-header">
          <div>
            <div className="scanner-kicker">PRODUCT LOOKUP</div>
            <h2>Scan QR / Barcode</h2>
            <p>Camera starts automatically. External readers are ready immediately.</p>
          </div>
          <button type="button" className="scanner-close" onClick={onClose} aria-label="Close scanner">×</button>
        </div>

        <div className="scanner-mode-tabs">
          <button type="button" className={mode === 'camera' ? 'active' : ''} onClick={() => switchMode('camera')}>📷 Camera</button>
          <button type="button" className={mode === 'reader' ? 'active' : ''} onClick={() => switchMode('reader')}>▣ External Reader</button>
        </div>

        {mode === 'camera' ? (
          <div className="scanner-camera-panel">
            <div className="scanner-viewfinder">
              <video ref={videoRef} muted playsInline autoPlay />
              {cameraState !== 'running' && (
                <div className="scanner-camera-placeholder">
                  <span>⌁</span>
                  <strong>{cameraState === 'starting' ? 'Starting camera…' : 'Camera scanner'}</strong>
                  <small>{cameraState === 'starting' ? 'Allow camera access if your browser asks.' : 'Point the rear camera at the code.'}</small>
                </div>
              )}
              <div className="scanner-frame" />
            </div>
          </div>
        ) : (
          <form className="scanner-reader-panel" onSubmit={submitReader}>
            <div className="reader-icon">▣</div>
            <h3>External reader ready</h3>
            <p>Just scan. The field is focused automatically and the article opens as soon as the reader sends the code.</p>
            <input
              ref={readerInputRef}
              autoFocus
              inputMode="none"
              value={readerValue}
              onChange={e => handleReaderChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitReader(e); }}
              placeholder="Ready for scan…"
              aria-label="Barcode scanner input"
            />
          </form>
        )}

        {status && <div className="scanner-status">{status}</div>}
        {error && <div className="scanner-error">{error}</div>}

        <div className="scanner-footer">Camera scanning uses ZXing for broader browser support. USB/Bluetooth keyboard-style readers work directly.</div>
      </div>
    </div>
  );
}
