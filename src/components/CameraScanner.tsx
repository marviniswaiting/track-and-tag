import { BrowserMultiFormatReader } from '@zxing/browser';
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useModalDialog } from './useModalDialog';

export function CameraScanner({ onResult, onClose }: { onResult: (text: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const onResultRef = useRef(onResult);
  const [error, setError] = useState('');
  const dialog = useModalDialog<HTMLElement>(onClose);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  useEffect(() => {
    let active = true;
    let controls: { stop(): void } | undefined;
    const videoElement = video.current;
    if (!videoElement) {
      setError('Camera preview could not be created.');
      return;
    }

    const reader = new BrowserMultiFormatReader();
    void reader.decodeFromConstraints(
      { audio: false, video: { facingMode: { ideal: 'environment' } } },
      videoElement,
      result => {
        if (active && result) {
          active = false;
          controls?.stop();
          onResultRef.current(result.getText());
        }
      },
    ).then(value => {
      controls = value;
      if (!active) value.stop();
    }).catch(cause => {
      if (active) setError(cause instanceof Error ? cause.message : 'Camera could not start.');
    });

    return () => {
      active = false;
      controls?.stop();
      const stream = videoElement.srcObject as MediaStream | null;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  return <div className="modal-backdrop" role="presentation">
    <section ref={dialog} className="modal scanner" role="dialog" aria-modal="true" aria-labelledby="camera-title">
      <header>
        <div><p className="eyebrow">Optical scan</p><h2 id="camera-title">QR / DataMatrix</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close camera"><X /></button>
      </header>
      {error
        ? <div className="callout error" role="alert">Camera unavailable: {error}</div>
        : <>
          <div className="camera-frame"><video ref={video} muted playsInline aria-label="Live camera preview" /><div className="reticle" /></div>
          <p className="hint">Hold the code steady inside the frame. Camera access stays on this device.</p>
        </>}
    </section>
  </div>;
}
