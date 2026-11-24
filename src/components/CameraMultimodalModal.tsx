import React, { useEffect, useRef, useState } from 'react';
import { Camera, Film, Mic, QrCode, RefreshCw, Send, Square, X } from 'lucide-react';
import { AppLocale } from '../data/trilingual';
import { transcribeWithSequentialWhisper } from '../engine/localAiBridge';
import { stripExifAndCompressImage } from '../utils/imageSanitizer';

interface CameraMultimodalModalProps {
  isOpen: boolean;
  locale: AppLocale;
  personName: string;
  onClose: () => void;
  onSubmitFrames: (payload: {
    question: string;
    framesDataUrls: string[];
    mediaKind: 'CAMERA_FRAME' | 'VIDEO_BURST';
  }) => void;
  onDetectedQrToken?: (token: string) => void;
}

export const CameraMultimodalModal: React.FC<CameraMultimodalModalProps> = ({
  isOpen,
  locale,
  personName,
  onClose,
  onSubmitFrames,
  onDetectedQrToken,
}) => {
  const isUrdu = locale === 'ur';
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState('');
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [capturingBurst, setCapturingBurst] = useState(false);
  const [question, setQuestion] = useState('');
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [qrStatus, setQrStatus] = useState('');

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedFrames([]);
      setQuestion('');
      setCameraError('');
      setQrStatus('');
      return;
    }

    let cancelled = false;
    setCameraError('');
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => {
        setCameraError(
          isUrdu
            ? 'کیمرہ دستیاب نہیں یا اجازت نہیں ملی۔ براہِ کرم چیٹ میں تصویر اپ لوڈ بٹن استعمال کریں۔'
            : 'Camera access unavailable or denied. You can still upload a photo directly in chat.'
        );
      });

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [isOpen, facingMode, isUrdu]);

  if (!isOpen) return null;

  const captureSingleSanitizedFrame = async (): Promise<string | null> => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;
    const canvas = document.createElement('canvas');
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, vw, vh);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) return null;
    const clean = await stripExifAndCompressImage(blob, 960, 0.82);
    return clean.dataUrl;
  };

  const handleSnapPhoto = async () => {
    const url = await captureSingleSanitizedFrame();
    if (url) {
      setCapturedFrames([url]);
    }
  };

  const handleCaptureVideoBurst = async () => {
    setCapturingBurst(true);
    const frames: string[] = [];
    for (let i = 0; i < 3; i++) {
      const url = await captureSingleSanitizedFrame();
      if (url) frames.push(url);
      if (i < 2) {
        await new Promise((r) => setTimeout(r, 1100));
      }
    }
    setCapturedFrames(frames);
    setCapturingBurst(false);
  };

  const handleScanQrFromFeed = async () => {
    setQrStatus('');
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const BD = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (img: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
    if (!BD) {
      setQrStatus(
        isUrdu
          ? 'اس براؤزر میں خودکار کیو آر سکین دستیاب نہیں؛ ٹوکن کوڈ مریض قطار میں لکھیں۔'
          : 'Native BarcodeDetector unavailable in this browser. Enter token manually in BHU Queue.'
      );
      return;
    }
    try {
      const detector = new BD({ formats: ['qr_code'] });
      const codes = await detector.detect(video);
      if (codes.length > 0) {
        const raw = codes[0].rawValue;
        setQrStatus(`QR: ${raw.slice(0, 60)}`);
        onDetectedQrToken?.(raw);
      } else {
        setQrStatus(isUrdu ? 'کوئی کیو آر کوڈ نظر نہیں آیا۔ کیمرہ قریب لائیں۔' : 'No QR code detected in frame. Hold steady.');
      }
    } catch {
      setQrStatus('Unable to read QR code.');
    }
  };

  const handleVoiceQuestion = async () => {
    setRecordingVoice(true);
    try {
      const res = await transcribeWithSequentialWhisper(isUrdu ? 'ur' : 'en');
      if (res.transcript) {
        setQuestion((q) => (q ? `${q} ${res.transcript}` : res.transcript));
      }
    } catch {
      // ignore
    } finally {
      setRecordingVoice(false);
    }
  };

  const handleSend = () => {
    if (capturedFrames.length === 0) return;
    const text =
      question.trim() ||
      (isUrdu
        ? `${personName} کے لیے کیمرہ تصویر/ویڈیو فریمز کا جائزہ لیں اور بتائیں کیا کرنا چاہیے۔`
        : `Please inspect these camera frames for ${personName} and advise clearly.`);
    onSubmitFrames({
      question: text,
      framesDataUrls: capturedFrames,
      mediaKind: capturedFrames.length > 1 ? 'VIDEO_BURST' : 'CAMERA_FRAME',
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        dir={isUrdu ? 'rtl' : 'ltr'}
        className="w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] p-5 sm:p-6 space-y-4 my-auto"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className={`font-display text-xl font-medium ${isUrdu ? 'font-urdu urdu-safe' : ''}`}>
              {isUrdu ? `${personName} — لائیو کیمرہ و ویڈیو معائنہ` : `Live Camera & Video Discussion — ${personName}`}
            </h3>
            <p className="text-[11px] text-[var(--muted)]">
              {isUrdu
                ? 'صرف رپورٹس، زخم، سانس یا خوراک دکھانے کے لیے۔ کیمرہ سے بلڈ پریشر یا شوگر نہیں ناپی جا سکتی۔'
                : 'Inspect reports, rash, wound, posture, or meals. Visual frames strip EXIF GPS tags locally and never measure BP/glucose.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close camera modal"
            className="min-h-[40px] min-w-[40px] rounded-full border border-[var(--border)] flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-black/15">
          <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
            className="absolute top-3 right-3 min-h-[36px] px-3 rounded-full bg-black/65 text-white text-xs inline-flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> {isUrdu ? 'کیمرہ بدلیں' : 'Switch Camera'}
          </button>
        </div>

        {cameraError && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-500/30 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-200">
            {cameraError}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSnapPhoto}
            className="min-h-[42px] px-4 rounded-full azure-pill-active text-xs font-medium inline-flex items-center gap-1.5"
          >
            <Camera className="h-4 w-4" /> {isUrdu ? 'تصویر کھینچیں' : 'Capture Frame'}
          </button>

          <button
            type="button"
            disabled={capturingBurst}
            onClick={handleCaptureVideoBurst}
            className="min-h-[42px] px-4 rounded-full border border-[var(--accent)] text-[var(--accent)] text-xs font-medium inline-flex items-center gap-1.5"
          >
            <Film className="h-4 w-4" />
            {capturingBurst
              ? isUrdu
                ? '3 سیکنڈ ویڈیو فریمز محفوظ ہو رہے ہیں...'
                : 'Capturing 3-sec video burst...'
              : isUrdu
                ? '3 سیکنڈ ویڈیو برسٹ (3 فریمز)'
                : '3-Sec Video Burst (3 Frames)'}
          </button>

          <button
            type="button"
            onClick={handleScanQrFromFeed}
            className="min-h-[42px] px-4 rounded-full border border-[var(--border)] text-xs font-medium inline-flex items-center gap-1.5"
          >
            <QrCode className="h-4 w-4" /> {isUrdu ? 'کیو آر سکین' : 'Scan QR'}
          </button>
        </div>

        {qrStatus && (
          <div className="rounded-xl bg-[var(--accent-soft)] px-3.5 py-2 text-xs font-mono-tabular">
            {qrStatus}
          </div>
        )}

        {capturedFrames.length > 0 && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {capturedFrames.map((src, idx) => (
                <img
                  key={idx}
                  src={src}
                  alt={`Captured frame ${idx + 1}`}
                  className="h-24 w-32 object-cover rounded-xl border border-black/15 shrink-0"
                />
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                maxLength={320}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={
                  isUrdu
                    ? 'تصویر یا صورتحال کے بارے میں پوچھیں یا وضاحت لکھیں...'
                    : 'Explain what you are showing or ask a question...'
                }
                className="flex-1 min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 text-sm"
              />
              <button
                type="button"
                onClick={handleVoiceQuestion}
                className="min-h-[44px] px-4 rounded-full border border-[var(--border)] text-xs font-medium inline-flex items-center justify-center gap-1.5"
              >
                {recordingVoice ? <Square className="h-3.5 w-3.5 text-[#DC2626]" /> : <Mic className="h-3.5 w-3.5 text-[var(--accent)]" />}
                {recordingVoice ? '...' : isUrdu ? 'بولیں' : 'Voice'}
              </button>
              <button
                type="button"
                onClick={handleSend}
                className="min-h-[44px] px-5 rounded-full azure-pill-active text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" /> {isUrdu ? 'چیٹ میں بھیجیں' : 'Send to Chat'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
