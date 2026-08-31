import React, { useEffect, useRef, useState } from 'react';

const CAMERA_FORMATS = [
  'qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e',
  'code_128', 'code_39', 'code_93', 'codabar', 'itf',
  'data_matrix', 'aztec', 'pdf417'
];

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
}

function normalize(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, '');
}

export default function ScannerModal({ onClose, onScan, products }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const inputRef = useRef(null);
  const lastScannedRef = useRef('');
  const scanLockRef = useRef(false);

  const [mode, setMode] = useState(isMobileDevice() ? 'camera' : 'reader');
  const [readerValue, setReaderValue] = useState('');
  const [status, setStatus] = useState('');
  const [cameraState, setCameraState] = useState('idle');
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState('');

  // Completely lock the page behind the scanner. The scanner gets its own
  // scroll container, so touch scrolling can never move the catalogue behind it.
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const previous = {
      bodyOverflow: body.style.overflow,
      bodyTouchAction: body.style.touchAction,
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
    };

    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';

    return () => {
      body.style.overflow = previous.bodyOverflow;
      body.style.touchAction = previous.bodyTouchAction;
      html.style.overflow = previous.htmlOverflow;
      html.style.overscrollBehavior = previous.htmlOverscroll;
    };
  }, []);

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState('idle');
  };

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    if (mode === 'reader') {
      const timer = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  const findProduct = (raw) => {
    const value = String(raw || '').trim();
    if (!value) return null;
    const normalized = normalize(value);

    const exact = products.find(p => [p.ean, p.article_no, p.model, p.hsn, p.id]
      .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
      .some(v => normalize(v) === normalized));
    if (exact) return exact;

    // QR payloads can contain URLs/text. Try numeric tokens as EAN candidates.
    const digits = value.match(/\d{8,14}/g) || [];
    for (const token of digits) {
      const hit = products.find(p => String(p.ean || '').replace(/\D/g, '') === token);
      if (hit) return hit;
    }
    return null;
  };

  const handleValue = (value) => {
    const raw = String(value || '').trim();
    if (!raw || scanLockRef.current) return false;

    const product = findProduct(raw);
    if (product) {
      scanLockRef.current = true;
      stopCamera();
      onScan(product);
      return true;
    }

    // Explicit modal popup for an unknown EAN/QR/barcode.
    setNotFound(raw);
    setStatus('');
    return false;
  };

  const startCamera = async () => {
    setError('');
    setStatus('');
    setNotFound('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is not available in this browser. Please use Chrome/Edge/Safari or an external barcode reader.');
      return;
    }

    if (!('BarcodeDetector' in window)) {
      setError('This browser does not provide native barcode scanning. Use Chrome/Edge/Safari on mobile, or switch to External Reader on desktop.');
      return;
    }

    try {
      let formats = CAMERA_FORMATS;
      if (typeof window.BarcodeDetector.getSupportedFormats === 'function') {
        const supported = await window.BarcodeDetector.getSupportedFormats();
        formats = CAMERA_FORMATS.filter(f => supported.includes(f));
      }
      if (!formats.length) throw new Error('No supported barcode formats');

      const detector = new window.BarcodeDetector({ formats });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (!videoRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraState('running');
      setStatus('Ready — point the rear camera at the QR code or barcode.');

      const scan = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2 || !streamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length && codes[0]?.rawValue) {
            const raw = codes[0].rawValue.trim();
            // Avoid repeatedly popping the same unknown code while it remains in frame.
            if (raw !== lastScannedRef.current) {
              lastScannedRef.current = raw;
              handleValue(raw);
            }
          }
        } catch (_) {
          // Autofocus/exposure changes can temporarily fail detection; continue.
        }
        if (streamRef.current) rafRef.current = requestAnimationFrame(scan);
      };

      lastScannedRef.current = '';
      rafRef.current = requestAnimationFrame(scan);
    } catch (e) {
      stopCamera();
      setError(e?.name === 'NotAllowedError'
        ? 'Camera permission was denied. Allow camera access for this site and reopen the scanner.'
        : 'Unable to start the rear camera. Please use External Reader if your browser blocks camera scanning.');
    }
  };

  // Auto-start camera whenever the scanner opens in camera mode or the user
  // switches back to Camera. No Start Camera button is required.
  useEffect(() => {
    if (mode !== 'camera') return;
    const timer = setTimeout(() => startCamera(), 60);
    return () => clearTimeout(timer);
  }, [mode]);

  const switchMode = (nextMode) => {
    stopCamera();
    setError('');
    setStatus('');
    setNotFound('');
    setReaderValue('');
    lastScannedRef.current = '';
    scanLockRef.current = false;
    setMode(nextMode);
  };

  const submitReader = (e) => {
    e.preventDefault();
    handleValue(readerValue);
  };

  const handleReaderChange = (e) => {
    const value = e.target.value;
    setReaderValue(value);

    // Most keyboard-wedge scanners finish with Enter. Some readers don't.
    // If a complete EAN/UPC-like value arrives, resolve it immediately.
    const compact = value.replace(/\s+/g, '');
    if (/^\d{8,14}$/.test(compact)) {
      const product = findProduct(compact);
      if (product) handleValue(compact);
    }
  };

  const close = () => {
    stopCamera();
    onClose();
  };

  return (
    <div
      className="scanner-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Scan barcode or QR code"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="scanner-modal">
        <div className="scanner-header">
          <div>
            <div className="scanner-kicker">PRODUCT LOOKUP</div>
            <h2>Scan QR / Barcode</h2>
            <p>Find the article instantly from its EAN, Article No. or product code.</p>
          </div>
          <button type="button" className="scanner-close" onClick={close} aria-label="Close scanner">×</button>
        </div>

        <div className="scanner-mode-tabs">
          <button type="button" className={mode === 'camera' ? 'active' : ''} onClick={() => switchMode('camera')}>📷 Camera</button>
          <button type="button" className={mode === 'reader' ? 'active' : ''} onClick={() => switchMode('reader')}>▣ External Reader</button>
        </div>

        <div className="scanner-scroll-area">
          {mode === 'camera' ? (
            <div className="scanner-camera-panel">
              <div className="scanner-viewfinder">
                <video ref={videoRef} muted playsInline autoPlay />
                {cameraState !== 'running' && (
                  <div className="scanner-camera-placeholder">
                    <span>⌁</span>
                    <strong>Starting camera…</strong>
                    <small>The rear camera starts automatically. Keep the code inside the frame.</small>
                  </div>
                )}
                <div className="scanner-frame" />
              </div>
              <div className="scanner-auto-note">Camera is active automatically when permission is available.</div>
            </div>
          ) : (
            <form className="scanner-reader-panel" onSubmit={submitReader}>
              <div className="reader-icon">▣</div>
              <h3>External reader ready</h3>
              <p>USB or Bluetooth barcode readers that work like a keyboard can scan directly. The input is focused automatically.</p>
              <input
                ref={inputRef}
                autoFocus
                value={readerValue}
                onChange={handleReaderChange}
                placeholder="Ready for scan…"
                aria-label="Barcode scanner input"
                inputMode="none"
                autoComplete="off"
              />
              <div className="scanner-reader-actions">
                <button type="submit" className="btn btn-teal">Find Article</button>
                <button type="button" className="btn" onClick={() => { setReaderValue(''); inputRef.current?.focus({ preventScroll: true }); }}>Clear</button>
              </div>
            </form>
          )}

          {status && <div className="scanner-status">{status}</div>}
          {error && <div className="scanner-error">{error}</div>}
        </div>

        <div className="scanner-footer">Supported: QR, EAN-13/EAN-8, UPC, Code 128 and other common barcode formats.</div>

        {notFound && (
          <div className="scanner-not-found-backdrop" role="presentation">
            <div className="scanner-not-found" role="alertdialog" aria-modal="true" aria-label="Code not available">
              <div className="scanner-not-found-icon">!</div>
              <div className="scanner-not-found-kicker">NOT AVAILABLE</div>
              <h3>Code not found in Article Ledger</h3>
              <p>This QR / barcode is not available in the database.</p>
              <div className="scanner-code-value">{notFound}</div>
              <button type="button" className="btn btn-teal" onClick={() => { setNotFound(''); lastScannedRef.current = ''; if (mode === 'reader') inputRef.current?.focus({ preventScroll: true }); }}>Scan Another</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
