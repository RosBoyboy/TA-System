'use client';

import React, { useRef, useState, useEffect } from 'react';

interface SignaturePadProps {
  onChange: (signatureData: string | null) => void;
  required?: boolean;
  label?: string;
  description?: string;
}

export default function SignaturePad({
  onChange,
  required = false,
  label = 'Employee E-Signature',
  description,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [activeMode, setActiveMode] = useState<'draw' | 'upload'>('draw');
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string>('');

  // Setup Canvas context
  const getCanvasContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0F172A'; // Slate-900 ink
    return ctx;
  };

  // Resize canvas to match display size accurately with DPI scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeMode !== 'draw') return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, [activeMode]);

  const saveStateToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev, imageData]);
  };

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5 };
    const rect = canvas.getBoundingClientRect();

    const pressure = typeof e.pressure === 'number' && e.pressure > 0 ? e.pressure : 0.5;
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure,
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Only primary button or stylus/touch
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const ctx = getCanvasContext();
    if (!ctx) return;
    saveStateToHistory();

    const canvas = canvasRef.current;
    if (canvas && typeof canvas.setPointerCapture === 'function') {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}
    }

    const { x, y, pressure } = getCoordinates(e);
    const baseWidth = 2.5;
    ctx.lineWidth = e.pointerType === 'pen' && pressure ? Math.max(1.2, baseWidth * pressure * 1.5) : baseWidth;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = getCanvasContext();
    if (!ctx) return;

    const { x, y, pressure } = getCoordinates(e);
    const baseWidth = 2.5;
    if (e.pointerType === 'pen' && pressure) {
      ctx.lineWidth = Math.max(1.2, baseWidth * pressure * 1.5);
    }
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (canvas && e && typeof canvas.releasePointerCapture === 'function') {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
    }

    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
    setHasDrawn(false);
    onChange(null);
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = [...history];
    const previousState = newHistory.pop();
    setHistory(newHistory);

    if (previousState) {
      ctx.putImageData(previousState, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
      onChange(null);
    }
  };

  // Handle File Upload alternative
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid PNG or JPEG image.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Signature file size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setUploadedPreview(dataUrl);
      onChange(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveUploaded = () => {
    setUploadedPreview(null);
    setUploadError('');
    onChange(null);
  };

  return (
    <div className="space-y-2.5">
      {/* Mode Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E5E5E7] pb-2 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <label className="block text-[11px] font-semibold text-[#1D1D1F] uppercase tracking-wider">
              {label} {required && <span className="text-rose-500">*</span>}
            </label>
            <span className="h-5 inline-flex items-center px-2 rounded-[4px] text-[10px] font-semibold bg-[#1B4332]/10 text-[#1B4332] border border-[#1B4332]/20">
              Stylus Pen / Board / Mouse
            </span>
          </div>
          {description && (
            <p className="text-[11px] text-[#86868B] mt-0.5">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-[6px] border border-[#E5E5E7] text-[11px] font-medium self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setActiveMode('draw');
              if (uploadedPreview) onChange(null);
            }}
            className={`h-6 px-2.5 rounded-[4px] transition-colors cursor-pointer ${
              activeMode === 'draw'
                ? 'bg-[#0F4C2E] text-white shadow-2xs font-semibold'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Draw / Stylus
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMode('upload');
              if (hasDrawn) onChange(uploadedPreview || null);
            }}
            className={`h-6 px-2.5 rounded-[4px] transition-colors cursor-pointer ${
              activeMode === 'upload'
                ? 'bg-[#0F4C2E] text-white shadow-2xs font-semibold'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Upload File
          </button>
        </div>
      </div>

      {activeMode === 'draw' ? (
        <div className="space-y-2">
          <div className="relative border border-dashed border-[#E5E5E7] rounded-[8px] bg-[#F5F5F7] overflow-hidden touch-none h-36 flex flex-col justify-between">
            <canvas
              ref={canvasRef}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              onPointerLeave={stopDrawing}
              style={{ touchAction: 'none' }}
              className="w-full h-full cursor-crosshair touch-none select-none"
            />
            {!hasDrawn && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-[#86868B] text-[12px] select-none p-4 text-center">
                <div className="flex items-center gap-2 mb-1 text-[#86868B]">
                  <svg className="w-4 h-4 text-[#1B4332]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span className="text-[#E5E5E7]">|</span>
                  <svg className="w-4 h-4 text-[#86868B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="font-semibold text-[#1D1D1F] text-[12px]">Sign here with your Stylus Pen, Board, or Mouse</span>
                <span className="text-[11px] text-[#86868B] mt-0.5">Smooth pen pressure &amp; drawing tablet digitizers supported</span>
              </div>
            )}
            <div className="absolute bottom-3.5 left-6 right-6 border-b border-[#E5E5E7] pointer-events-none"></div>
          </div>

          <div className="flex items-center justify-between text-[12px]">
            <span
              className={`text-[11px] font-medium flex items-center gap-1.5 ${
                hasDrawn ? 'text-emerald-700' : required ? 'text-amber-700' : 'text-[#86868B]'
              }`}
            >
              {hasDrawn ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"></span>
                  <span>✓ E-Signature captured &amp; attached</span>
                </>
              ) : required ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                  <span>Signature required to proceed</span>
                </>
              ) : (
                <span>Optional signature</span>
              )}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleUndo}
                disabled={history.length === 0}
                className="h-7 px-2.5 bg-[#FFFFFF] border border-[#E5E5E7] hover:bg-[#F2F2F7] text-[#1D1D1F] rounded-[6px] text-[12px] font-medium disabled:opacity-40 cursor-pointer transition-colors"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={!hasDrawn}
                className="h-7 px-2.5 bg-[#FFFFFF] border border-[#E5E5E7] hover:bg-rose-50 hover:text-rose-600 text-[#1D1D1F] rounded-[6px] text-[12px] font-medium disabled:opacity-40 cursor-pointer transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {uploadedPreview ? (
            <div className="border border-[#E5E5E7] rounded-[6px] p-3 bg-[#FFFFFF] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-16 h-11 border border-[#E5E5E7] rounded-[4px] bg-[#F5F5F7] flex items-center justify-center overflow-hidden">
                  <img src={uploadedPreview} alt="Signature Preview" className="max-h-full max-w-full object-contain" />
                </div>
                <div>
                  <span className="text-[12px] font-semibold text-[#1D1D1F] block">Uploaded Signature</span>
                  <span className="text-[11px] text-emerald-700 font-medium">✓ Ready for registration</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveUploaded}
                className="h-7 px-2.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-[6px] text-[12px] font-medium cursor-pointer transition-colors"
              >
                Remove
              </button>
            </div>
          ) : (
            <label className="border border-dashed border-[#E5E5E7] rounded-[8px] p-5 text-center bg-[#F5F5F7] hover:bg-[#F2F2F7] cursor-pointer block transition-colors">
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleFileUpload}
                className="hidden"
              />
              <svg className="w-5 h-5 mx-auto mb-1 text-[#86868B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-[12px] font-semibold text-[#1D1D1F] block">Click to upload signature image</span>
              <span className="text-[11px] text-[#86868B] block mt-0.5">PNG (recommended transparent) or JPEG under 2MB</span>
            </label>
          )}

          {uploadError && <p className="text-[11px] text-rose-600 font-medium">{uploadError}</p>}
        </div>
      )}
    </div>
  );
}
