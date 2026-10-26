'use client';

import React, { useState, useRef } from 'react';
import { AttachmentDTO } from '@/types';

interface SupportingDocumentsUploadProps {
  attachments: AttachmentDTO[];
  onChange: (attachments: AttachmentDTO[]) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export default function SupportingDocumentsUpload({
  attachments = [],
  onChange,
  disabled = false,
}: SupportingDocumentsUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');

  const triggerFileInput = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError('');

    const filesToUpload: File[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.toLowerCase().split('.').pop() || '';
      const isAllowedExt = ext === 'pdf' || ext === 'doc' || ext === 'docx';
      const isAllowedMime =
        file.type === 'application/pdf' ||
        file.type === 'application/msword' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      if (!isAllowedExt && !isAllowedMime) {
        setUploadError(`"${file.name}" is not a valid format. Only PDF (.pdf) and Word documents (.doc, .docx) are allowed.`);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        setUploadError(`"${file.name}" (${sizeMb} MB) exceeds the 25MB size limit.`);
        return;
      }

      filesToUpload.push(file);
    }

    if (filesToUpload.length === 0) return;

    setIsUploading(true);

    try {
      const uploadedAttachments: AttachmentDTO[] = [...attachments];

      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `Failed to upload "${file.name}"`);
        }

        uploadedAttachments.push(data.data);
      }

      onChange(uploadedAttachments);
    } catch (err: any) {
      console.error('[Upload Error]', err);
      setUploadError(err.message || 'An error occurred while uploading file(s).');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled || isUploading) return;
    handleFiles(e.dataTransfer.files);
  };

  const handleRemove = (indexToRemove: number) => {
    if (disabled) return;
    const updated = attachments.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled || isUploading}
      />

      {/* Drag & Drop Trigger Area */}
      <div
        onClick={triggerFileInput}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer select-none ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/80 scale-[1.005]'
            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-emerald-400'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#0F4C2E] border border-emerald-100 flex items-center justify-center mx-auto mb-3 shadow-xs">
          {isUploading ? (
            <svg className="w-6 h-6 animate-spin text-[#0F4C2E]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          )}
        </div>

        <p className="text-xs font-bold text-slate-800">
          {isUploading ? 'Uploading supporting document(s)...' : 'Click to upload files or drag and drop'}
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          PDF, DOC, DOCX <span className="font-semibold text-slate-700">(Max 25MB per file)</span>
        </p>
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
          <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{uploadError}</span>
        </div>
      )}

      {/* Attached Files List */}
      {attachments.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider px-1">
            <span>Attached Documents ({attachments.length})</span>
            <span className="text-[10px] text-slate-400 font-medium">Ready for submission</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {attachments.map((file, idx) => {
              const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.color === 'rose';

              return (
                <div
                  key={file.id || idx}
                  className="group relative flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-xs transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Icon Badge */}
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-xs font-bold text-xs ${
                        isPdf ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {isPdf ? (
                        <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            isPdf ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {isPdf ? 'PDF' : 'DOC'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{file.size}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    {file.url && (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-[#0F4C2E] hover:bg-slate-100 rounded-lg transition-colors"
                        title="View / Download file"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}

                    {!disabled && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(idx);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
