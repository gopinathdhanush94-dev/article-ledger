import React, { useEffect, useRef, useState } from 'react';

const CAMERA_FORMATS = [
  'qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e',
  'code_128', 'code_39', 'code_93', 'codabar', 'itf',
  'data_matrix', 'aztec', 'pdf417'
];

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
}

export default function ScannerModal({ onClose, onScan, products }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const scannerInputRef = useRef(null);
  const [mode, setMode] = useState(isMobileDevice() ? 'camera' : 'reader');
  const [readerValue, setReaderValue] = useState('');
  const [status, setStatus] = useState('');
  const [cameraState, setCameraState] = useState('idle');
  const [error, setError] = useState('');

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
    if (mode === 'reader') setTimeout(() => scannerInputRef.current?.focus(), 80);
  }, [mode]);

  const findProduct = (raw) => {
    const value = String(raw || '').trim();
    if (!value) return null;
    const normalized = value.toLowerCase().replace(/\s+/g, '');
    const exact = products.find(p => [p.ean, p.article_no, p.model, p.hsn, p.id]
      .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
      .some(v => String(v).trim().toLowerCase().replace(/\s+/g, '') === normalized));
    if (exact) return exact;

    // QR codes sometimes contain a URL or text around the EAN. Try a 8–14 digit token.
    const digits = value.match(/\d{8,14}/g) || [];
    for (const token of digits) {
      const hit = products.find(p => String(p.ean || '').replace(/\D/g, '') === token);
      if (hit) return hit;
    }
    return null;
  };

  const handleValue = (value) => {
    const product = findProduct(value);
    if (product) {
      stopCamera();
      onScan(product);
      return true;
    }
    setStatus(`No matching article found for “${String(value).trim()}”`);
    return false;
  };

  const startCamera = async () => {
    setError('');
    setStatus('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is not supported by this browser. Use an external barcode reader.');
      return;
    }
    if (!('BarcodeDetector' in window)) {
      setError('Camera scanning is not supported by this browser. Use an external barcode reader or switch to Chrome/Edge on mobile.');
      return;
    }
    try {
      let formats = CAMERA_FORMATS;
      if (typeof window.BarcodeDetector.getSupportedFormats === 'function') {
        const supported = await window.BarcodeDetector.getSupportedFormats();
        formats = CAMERA_FORMATS.filter(f => supported.includes(f));
      }
      const detector = new window.BarcodeDetector({ formats });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraState('running');
      setStatus('Point the camera at the QR code or barcode.');

      const scan = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2 || !streamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length) {
            const raw = codes[0].rawValue || '';
            if (raw && handleValue(raw)) return;
          }
        } catch (e) {
          // Camera can briefly fail while autofocus changes; keep scanning.
        }
        rafRef.current = requestAnimationFrame(scan);
      };
      rafRef.current = requestAnimationFrame(scan);
    } catch (e) {
      stopCamera();
      setError(e?.name === 'NotAllowedError'
        ? 'Camera permission was denied. Allow camera access and try again.'
        : 'Unable to start the camera. Use an external reader instead.');
    }
  };

  const submitReader = (e) => {
    e.preventDefault();
    handleValue(readerValue);
  };

  return (
    <div className="scanner-overlay" role="dialog" aria-modal="true" aria-label="Scan barcode or QR code" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="scanner-modal">
        <div className="scanner-header">
          <div>
            <div className="scanner-kicker">PRODUCT LOOKUP</div>
            <h2>Scan QR / Barcode</h2>
            <p>Find the article instantly from its EAN, Article No. or product code.</p>
          </div>
          <button type="button" className="scanner-close" onClick={onClose} aria-label="Close scanner">×</button>
        </div>

        <div className="scanner-mode-tabs">
          <button type="button" className={mode === 'camera' ? 'active' : ''} onClick={() => { stopCamera(); setMode('camera'); }}>📷 Camera</button>
          <button type="button" className={mode === 'reader' ? 'active' : ''} onClick={() => { stopCamera(); setMode('reader'); }}>▣ External Reader</button>
        </div>

        {mode === 'camera' ? (
          <div className="scanner-camera-panel">
            <div className="scanner-viewfinder">
              <video ref={videoRef} muted playsInline />
              {cameraState !== 'running' && <div className="scanner-camera-placeholder"><span>⌁</span><strong>Camera scanner</strong><small>Use the rear camera and keep the code inside the frame.</small></div>}
              <div className="scanner-frame" />
            </div>
            <button type="button" className="btn btn-teal scanner-start" onClick={cameraState === 'running' ? stopCamera : startCamera}>
              {cameraState === 'running' ? 'Stop camera' : 'Start camera'}
            </button>
          </div>
        ) : (
          <form className="scanner-reader-panel" onSubmit={submitReader}>
            <div className="reader-icon">▣</div>
            <h3>Use your external barcode reader</h3>
            <p>Click the field, scan the barcode, and let the reader send its usual Enter key. USB and Bluetooth readers that act like a keyboard work automatically.</p>
            <input
              ref={scannerInputRef}
              autoFocus
              value={readerValue}
              onChange={e => setReaderValue(e.target.value)}
              placeholder="Scan here…"
              aria-label="Barcode scanner input"
            />
            <div className="scanner-reader-actions">
              <button type="submit" className="btn btn-teal">Find Article</button>
              <button type="button" className="btn" onClick={() => setReaderValue('')}>Clear</button>
            </div>
          </form>
        )}

        {status && <div className="scanner-status">{status}</div>}
        {error && <div className="scanner-error">{error}</div>}

        <div className="scanner-footer">Supported: QR, EAN-13/EAN-8, UPC, Code 128 and other common barcode formats.</div>
      </div>
    </div>
  );
}
