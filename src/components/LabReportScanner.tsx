import React, { useEffect, useState } from 'react';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { FileCheck2, FileText, ScanLine, ShieldCheck, Upload } from 'lucide-react';
import { AppLocale, I18N } from '../data/trilingual';
import { StoredLabRecord } from '../db/encryptedVault';
import { PatientProfile, sanitizePlainText } from '../engine/triageEngine';
import { ExtractedBiomarkers, extractBiomarkers } from '../utils/healthMath';

export type { ExtractedBiomarkers };
export { extractBiomarkers };

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface LabReportScannerProps {
  locale: AppLocale;
  profiles: PatientProfile[];
  savedLabs: StoredLabRecord[];
  onSaveLab: (record: StoredLabRecord) => Promise<void>;
}

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export const LabReportScanner: React.FC<LabReportScannerProps> = ({
  locale,
  profiles,
  savedLabs,
  onSaveLab,
}) => {
  const s = I18N[locale];
  const isUrdu = locale === 'ur';

  const [patientId, setPatientId] = useState(profiles[0]?.id ?? '');
  useEffect(() => {
    if (profiles[0]?.id) setPatientId(profiles[0].id);
  }, [profiles[0]?.id]);
  const [progress, setProgress] = useState(0);
  const [scanStage, setScanStage] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [sourceFileType, setSourceFileType] = useState<'IMAGE' | 'PDF' | 'MANUAL'>('MANUAL');
  const [rawText, setRawText] = useState('');

  const [hemoglobin, setHemoglobin] = useState('');
  const [wbc, setWbc] = useState('');
  const [platelets, setPlatelets] = useState('');
  const [fastingGlucose, setFastingGlucose] = useState('');
  const [hba1c, setHba1c] = useState('');
  const [creatinine, setCreatinine] = useState('');
  const [cholesterol, setCholesterol] = useState('');
  const [altSgpt, setAltSgpt] = useState('');
  const [savedNotice, setSavedNotice] = useState('');

  const applyParsedMarkers = (cleanText: string) => {
    setRawText(cleanText);
    const parsed = extractBiomarkers(cleanText);
    if (parsed.hb) setHemoglobin(parsed.hb);
    if (parsed.wbc) setWbc(parsed.wbc);
    if (parsed.plt) setPlatelets(parsed.plt);
    if (parsed.fbs) setFastingGlucose(parsed.fbs);
    if (parsed.hba1c) setHba1c(parsed.hba1c);
    if (parsed.creatinine) setCreatinine(parsed.creatinine);
    if (parsed.cholesterol) setCholesterol(parsed.cholesterol);
    if (parsed.altSgpt) setAltSgpt(parsed.altSgpt);

    const anyFound = Object.values(parsed).some(Boolean);
    if (!anyFound && cleanText.trim().length > 0) {
      setError(
        isUrdu
          ? 'رپورٹ کا متن پڑھ لیا گیا لیکن خودکار لیب نمبرز واضح نہیں ملے۔ نیچے متن دیکھ کر خانوں میں خود درج کریں۔'
          : 'Text extracted below, but lab labels varied from standard format. Please review the raw text and enter markers manually.'
      );
    }
  };

  const extractPdfReportText = async (file: File): Promise<string> => {
    setScanStage(isUrdu ? 'پی ڈی ایف فائل کھولی جا رہی ہے...' : 'Reading PDF document...');
    setProgress(15);

    const buffer = await file.arrayBuffer();
    let pdfDoc: pdfjsLib.PDFDocumentProxy;
    try {
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
      pdfDoc = await loadingTask.promise;
    } catch (err: unknown) {
      const name = err && typeof err === 'object' && 'name' in err ? String((err as { name: string }).name) : '';
      if (name === 'PasswordException') {
        throw new Error(
          isUrdu
            ? 'یہ پی ڈی ایف پاس ورڈ سے محفوظ (Encrypted) ہے۔ براہِ کرم غیر مقفل پی ڈی ایف یا تصویر اپلوڈ کریں یا نیچے خود نمبرز لکھیں۔'
            : 'This PDF is password-protected/encrypted. Upload an unlocked PDF/photo or enter values manually below.'
        );
      }
      throw new Error(
        isUrdu
          ? 'یہ پی ڈی ایف فائل خراب یا نامکمل ہے، اسے پڑھا نہیں جا سکا۔ نیچے دستی طور پر نمبرز درج کریں۔'
          : 'Unable to parse this PDF (corrupted or unsupported structure). Enter values manually below.'
      );
    }

    const maxPages = Math.min(3, pdfDoc.numPages);
    let combinedText = '';

    for (let p = 1; p <= maxPages; p++) {
      const page = await pdfDoc.getPage(p);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .filter(Boolean);
      combinedText += `${pageStrings.join(' ')}\n`;
    }
    setProgress(45);

    // If PDF already contains digital text (>= 40 meaningful chars), return directly
    const cleanDigital = sanitizePlainText(combinedText);
    if (cleanDigital.replace(/\s+/g, '').length >= 35) {
      setProgress(100);
      return cleanDigital;
    }

    // Fallback for Scanned Image-Only PDFs: render page 1 (and 2 if present) to Canvas and run local Tesseract OCR
    setScanStage(
      isUrdu
        ? 'اسکین شدہ پی ڈی ایف پر آف لائن OCR چلایا جا رہا ہے...'
        : 'Scanned image PDF detected — running offline OCR...'
    );
    let ocrCombined = '';
    const ocrPages = Math.min(2, pdfDoc.numPages);
    for (let p = 1; p <= ocrPages; p++) {
      const page = await pdfDoc.getPage(p);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(2400, Math.floor(viewport.width));
      canvas.height = Math.min(3200, Math.floor(viewport.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      const result = await Tesseract.recognize(canvas, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text' && typeof m.progress === 'number') {
            const base = p === 1 ? 45 : 72;
            setProgress(Math.min(99, Math.round(base + m.progress * 26)));
          }
        },
      });
      ocrCombined += `${result.data.text}\n`;
    }

    const cleanOcr = sanitizePlainText(ocrCombined);
    if (!cleanOcr.trim()) {
      throw new Error(
        isUrdu
          ? 'اسکین شدہ پی ڈی ایف سے واضح تحریر نہیں مل سکی۔ بہتر تصویر لیں یا نیچے خود نمبرز لکھیں۔'
          : 'Scanned PDF had unreadable or blank pages. Upload a sharper photo or enter values manually below.'
      );
    }
    setProgress(100);
    return cleanOcr;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setSavedNotice('');
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
    const isImage = ALLOWED_IMAGE_MIME.has(file.type) || /\.(png|jpe?g|webp)$/i.test(lowerName);

    if (!isPdf && !isImage) {
      setError(
        isUrdu
          ? 'غلط فائل کی قسم۔ براہِ کرم PDF، PNG، JPEG یا WebP رپورٹ اپلوڈ کریں۔'
          : 'Unsupported file format. Please upload a PDF, PNG, JPEG, or WebP lab report.'
      );
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('File exceeds 15 MB limit.');
      return;
    }

    setUploadedFileName(file.name);
    setSourceFileType(isPdf ? 'PDF' : 'IMAGE');
    setScanning(true);
    setProgress(10);

    try {
      if (isPdf) {
        const extracted = await extractPdfReportText(file);
        applyParsedMarkers(extracted);
      } else {
        setScanStage(isUrdu ? 'تصویر سے لیب نمبرز پڑھے جا رہے ہیں...' : 'Running offline image OCR...');
        const result = await Tesseract.recognize(file, 'eng', {
          logger: (m) => {
            if (m.status === 'recognizing text' && typeof m.progress === 'number') {
              setProgress(Math.round(m.progress * 100));
            }
          },
        });
        const clean = sanitizePlainText(result.data.text);
        if (!clean.trim()) {
          setError(
            isUrdu
              ? 'تصویر دھندلی ہے یا کوئی متن نہیں ملا۔ واضح روشنی میں تصویر لیں یا نیچے خود درج کریں۔'
              : 'Image was too blurry or contained no readable text. Enter values manually below.'
          );
        } else {
          applyParsedMarkers(clean);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Local parser could not read this file. Enter values manually below.'
      );
    } finally {
      setScanning(false);
      setScanStage('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const record: StoredLabRecord = {
      id: `lab_${crypto.randomUUID().slice(0, 10)}`,
      patientId: patientId || profiles[0]?.id || 'default',
      scannedAtIso: new Date().toISOString(),
      hemoglobin: hemoglobin.trim() || undefined,
      wbc: wbc.trim() || undefined,
      platelets: platelets.trim() || undefined,
      fastingGlucose: fastingGlucose.trim() || undefined,
      hba1c: hba1c.trim() || undefined,
      creatinine: creatinine.trim() || undefined,
      cholesterol: cholesterol.trim() || undefined,
      altSgpt: altSgpt.trim() || undefined,
      sourceFileType,
      excerpt: sanitizePlainText(rawText).slice(0, 320),
    };
    await onSaveLab(record);
    setSavedNotice(isUrdu ? 'لیب رپورٹ والٹ میں محفوظ ہو گئی۔' : 'Lab markers saved encrypted to your vault.');
    setTimeout(() => setSavedNotice(''), 3000);
  };

  return (
    <div dir={isUrdu ? 'rtl' : 'ltr'} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-7 glass-panel rounded-3xl p-6 space-y-5">
        <div>
          <h1 className={`font-display text-2xl font-medium ${isUrdu ? 'font-urdu text-2xl' : ''}`}>
            {s.labsTitle}
          </h1>
          <p className={`text-xs text-[var(--muted)] mt-1 ${isUrdu ? 'font-urdu text-sm leading-[1.8]' : ''}`}>
            {isUrdu
              ? 'اب پی ڈی ایف (PDF) اور لیب تصویر دونوں آف لائن اسکین ہو جاتی ہیں — ڈیٹا صرف آپ کے فون میں محفوظ رہتا ہے۔'
              : 'Upload a lab PDF (digital or scanned) or report photo — extracted 100% locally in your encrypted vault.'}
          </p>
        </div>

        <label className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-6 cursor-pointer hover:border-[var(--accent)] transition-colors">
          <Upload className="h-6 w-6 text-[var(--accent)] mb-2" />
          <span className="text-sm font-medium text-center">
            {isUrdu ? 'لیب رپورٹ PDF یا تصویر اپلوڈ کریں (PNG, JPEG, WebP, PDF)' : 'Upload Lab PDF or Image (PDF, PNG, JPEG, WebP)'}
          </span>
          {uploadedFileName && (
            <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-[var(--accent)] font-medium">
              <FileCheck2 className="h-3.5 w-3.5" /> {uploadedFileName}
            </span>
          )}
          <input
            type="file"
            accept="application/pdf,.pdf,image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {scanning && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5">
                <ScanLine className="h-3.5 w-3.5 text-[var(--accent)]" /> {scanStage || 'Extracting...'}
              </span>
              <span className="font-mono-tabular">{progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[var(--surface-muted)] overflow-hidden">
              <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-xl border border-amber-600/35 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {profiles.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                {isUrdu ? 'مریض کا نام' : 'Patient Profile'}
              </label>
              <select
                value={patientId || profiles[0]?.id}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-sm"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#525E5A] dark:text-slate-400 mb-1">
                Hemoglobin (g/dL)
              </label>
              <input
                type="text"
                maxLength={24}
                value={hemoglobin}
                onChange={(e) => setHemoglobin(e.target.value)}
                placeholder="12.8"
                className="w-full min-h-[44px] rounded-xl border border-black/15 dark:border-slate-700 bg-transparent px-3 font-mono-tabular text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#525E5A] dark:text-slate-400 mb-1">
                WBC / TLC (/uL)
              </label>
              <input
                type="text"
                maxLength={24}
                value={wbc}
                onChange={(e) => setWbc(e.target.value)}
                placeholder="7400"
                className="w-full min-h-[44px] rounded-xl border border-black/15 dark:border-slate-700 bg-transparent px-3 font-mono-tabular text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#525E5A] dark:text-slate-400 mb-1">
                Platelets (/uL)
              </label>
              <input
                type="text"
                maxLength={24}
                value={platelets}
                onChange={(e) => setPlatelets(e.target.value)}
                placeholder="195000"
                className="w-full min-h-[44px] rounded-xl border border-black/15 dark:border-slate-700 bg-transparent px-3 font-mono-tabular text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#525E5A] dark:text-slate-400 mb-1">
                Fasting / Random Sugar (mg/dL)
              </label>
              <input
                type="text"
                maxLength={24}
                value={fastingGlucose}
                onChange={(e) => setFastingGlucose(e.target.value)}
                placeholder="96"
                className="w-full min-h-[44px] rounded-xl border border-black/15 dark:border-slate-700 bg-transparent px-3 font-mono-tabular text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#525E5A] dark:text-slate-400 mb-1">
                HbA1c (%)
              </label>
              <input
                type="text"
                maxLength={16}
                value={hba1c}
                onChange={(e) => setHba1c(e.target.value)}
                placeholder="5.6"
                className="w-full min-h-[44px] rounded-xl border border-black/15 dark:border-slate-700 bg-transparent px-3 font-mono-tabular text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#525E5A] dark:text-slate-400 mb-1">
                Serum Creatinine (mg/dL)
              </label>
              <input
                type="text"
                maxLength={16}
                value={creatinine}
                onChange={(e) => setCreatinine(e.target.value)}
                placeholder="0.9"
                className="w-full min-h-[44px] rounded-xl border border-black/15 dark:border-slate-700 bg-transparent px-3 font-mono-tabular text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#525E5A] dark:text-slate-400 mb-1">
                Total Cholesterol (mg/dL)
              </label>
              <input
                type="text"
                maxLength={16}
                value={cholesterol}
                onChange={(e) => setCholesterol(e.target.value)}
                placeholder="175"
                className="w-full min-h-[44px] rounded-xl border border-black/15 dark:border-slate-700 bg-transparent px-3 font-mono-tabular text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#525E5A] dark:text-slate-400 mb-1">
                ALT / SGPT (U/L)
              </label>
              <input
                type="text"
                maxLength={16}
                value={altSgpt}
                onChange={(e) => setAltSgpt(e.target.value)}
                placeholder="28"
                className="w-full min-h-[44px] rounded-xl border border-black/15 dark:border-slate-700 bg-transparent px-3 font-mono-tabular text-sm"
              />
            </div>
          </div>

          {rawText && (
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-[var(--muted)]">
                {isUrdu ? 'اخذ شدہ رپورٹ متن' : 'Extracted Report Text (Editable)'}
              </label>
              <textarea
                rows={4}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full rounded-xl border border-black/15 dark:border-slate-700 bg-transparent p-3 font-mono-tabular text-xs"
              />
            </div>
          )}

          <button
            type="submit"
            className="min-h-[46px] px-6 rounded-full azure-pill-active text-sm font-semibold inline-flex items-center gap-2"
          >
            <ShieldCheck className="h-4 w-4" /> {s.labsSaveBtn}
          </button>

          {savedNotice && <p className="text-xs font-medium text-[var(--accent)]">{savedNotice}</p>}
        </form>
      </div>

      <div className="lg:col-span-5 glass-panel rounded-3xl p-6 space-y-4">
        <h2 className="font-display text-lg font-medium">{s.labsHistoryTitle}</h2>
        {savedLabs.length === 0 ? (
          <p className="text-xs text-[#525E5A] dark:text-slate-400">{s.labsEmptyText}</p>
        ) : (
          <div className="space-y-3">
            {savedLabs.map((lab) => (
              <div key={lab.id} className="border-b border-black/8 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between text-xs text-[#525E5A] dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" /> Lab Record {lab.sourceFileType ? `(${lab.sourceFileType})` : ''}
                  </span>
                  <span className="font-mono-tabular">{lab.scannedAtIso.slice(0, 10)}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs font-mono-tabular">
                  <div>Hb: {lab.hemoglobin ?? '--'}</div>
                  <div>WBC: {lab.wbc ?? '--'}</div>
                  <div>PLT: {lab.platelets ?? '--'}</div>
                  <div>Sugar: {lab.fastingGlucose ?? '--'}</div>
                  {lab.hba1c && <div>HbA1c: {lab.hba1c}%</div>}
                  {lab.creatinine && <div>Creat: {lab.creatinine}</div>}
                  {lab.cholesterol && <div>Chol: {lab.cholesterol}</div>}
                  {lab.altSgpt && <div>ALT: {lab.altSgpt}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
