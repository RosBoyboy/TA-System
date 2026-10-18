'use client';

import React, { useRef, useState, useEffect } from 'react';

interface SignaturePadProps {
  onChange: (signatureData: string | null) => void;
  required?: boolean;
}

export default function SignaturePad({ onChange }: SignaturePadProps) {
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

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const ctx = getCanvasContext();
    if (!ctx) return;
    saveStateToHistory();

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = getCanvasContext();
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
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
    <div className="space-y-3">
      {/* Mode Selector Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <label className="block text-xs font-bold text-slate-700">
          Employee E-Signature *
        </label>
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveMode('draw');
              if (uploadedPreview) onChange(null);
            }}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              activeMode === 'draw'
                ? 'bg-white text-slate-800 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Draw Signature
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMode('upload');
              if (hasDrawn) onChange(uploadedPreview || null);
            }}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              activeMode === 'upload'
                ? 'bg-white text-slate-800 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Upload File
          </button>
        </div>
      </div>

      {activeMode === 'draw' ? (
        <div className="space-y-2">
          <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/60 overflow-hidden touch-none h-36 flex flex-col justify-between">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-full cursor-crosshair"
            />
            {!hasDrawn && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 text-xs">
                <svg className="w-6 h-6 mb-1 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>Sign here with stylus, finger, or mouse</span>
              </div>
            )}
            <div className="absolute bottom-4 left-6 right-6 border-b border-slate-300/60 pointer-events-none"></div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500 font-medium">
              {hasDrawn ? '✓ Signature captured on canvas' : 'Signature required'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={history.length === 0}
                className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-[11px] font-semibold disabled:opacity-40 cursor-pointer"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={!hasDrawn}
                className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-lg text-[11px] font-semibold disabled:opacity-40 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {uploadedPreview ? (
            <div className="border border-slate-200 rounded-xl p-4 bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-16 h-12 border border-slate-100 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden">
                  <img src={uploadedPreview} alt="Signature Preview" className="max-h-full max-w-full object-contain" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Uploaded Signature</span>
                  <span className="text-[10px] text-emerald-600 font-medium">Ready for registration</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveUploaded}
                className="px-2.5 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-semibold"
              >
                Remove
              </button>
            </div>
          ) : (
            <label className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50/60 hover:bg-slate-50 cursor-pointer block transition-colors">
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleFileUpload}
                className="hidden"
              />
              <svg className="w-6 h-6 mx-auto mb-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-bold text-slate-700 block">Click to upload signature image</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">PNG (recommended transparent) or JPEG under 2MB</span>
            </label>
          )}

          {uploadError && <p className="text-[11px] text-rose-600 font-semibold">{uploadError}</p>}
        </div>
      )}
    </div>
  );
}
