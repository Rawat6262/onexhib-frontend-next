"use client";

import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';

// Generic drag-and-drop Excel uploader. Callers supply `uploadFn(file, onProgress)`
// already bound to whatever parent ID the backend needs (exhibition/company id, etc).
const ExcelUploadModal = ({
  isOpen,
  onClose,
  onSuccess,
  title,
  successNoun,
  uploadFn,
  requiredColumns,
  optionalColumnsNote,
}) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const dragRef = useRef(null);

  const allowedFormats = ['.xlsx', '.xls', '.csv'];

  const handleFileSelect = (selectedFile) => {
    setError('');
    setSuccess('');

    if (!selectedFile) return;

    const fileName = selectedFile.name.toLowerCase();
    const isValidFormat = allowedFormats.some(format => fileName.endsWith(format));

    if (!isValidFormat) {
      setError(`Invalid file format. Allowed formats: ${allowedFormats.join(', ')}`);
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current?.classList.add('drag-active');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current?.classList.remove('drag-active');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current?.classList.remove('drag-active');

    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    setError('');

    try {
      const response = await uploadFn(file, setUploadProgress);
      setSuccess(`✓ Successfully uploaded ${response.count} ${successNoun}`);
      setFile(null);
      setUploadProgress(0);

      setTimeout(() => {
        onSuccess?.(response.data);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Upload failed');
      setLoading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setUploadProgress(0);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {/* Header */}
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose} disabled={loading}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-content">
          {/* Upload Area */}
          <div
            ref={dragRef}
            className="upload-area"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={allowedFormats.join(',')}
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
              style={{ display: 'none' }}
              disabled={loading}
            />

            {!file ? (
              <div className="upload-prompt">
                <div className="upload-icon">
                  <Upload size={48} />
                </div>
                <h3>Drop your Excel file here</h3>
                <p>or click to browse</p>
                <span className="file-types">
                  Supported: {allowedFormats.join(', ')} (Max 10MB)
                </span>
              </div>
            ) : (
              <div className="file-selected">
                <div className="file-info">
                  <div className="file-icon">📄</div>
                  <div>
                    <p className="file-name">{file.name}</p>
                    <p className="file-size">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                {!loading && (
                  <button className="remove-file-btn" onClick={removeFile}>
                    <X size={20} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {loading && (
            <div className="progress-container">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="progress-text">
                <Loader size={16} className="spinner" />
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              <p>{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="alert alert-success">
              <CheckCircle size={20} />
              <p>{success}</p>
            </div>
          )}

          {/* Requirements Info */}
          <div className="requirements-box">
            <h4>Required Excel Columns:</h4>
            <ul>
              {requiredColumns.map((col) => (
                <li key={col}>{col}</li>
              ))}
            </ul>
            {optionalColumnsNote && (
              <p className="optional-note">{optionalColumnsNote}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={!file || loading}
          >
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .modal-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 600px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
        }

        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .close-btn:hover:not(:disabled) {
          background: #f3f4f6;
          color: #1f2937;
        }

        .close-btn:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .modal-content {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .upload-area {
          border: 2px dashed #d1d5db;
          border-radius: 10px;
          padding: 32px 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          background: #fafbfc;
        }

        .upload-area:hover:not(.drag-active) {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .upload-area.drag-active {
          border-color: #3b82f6;
          background: #dbeafe;
          transform: scale(1.02);
        }

        .upload-prompt {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .upload-icon {
          color: #3b82f6;
          animation: float 2s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        .upload-prompt h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }

        .upload-prompt p {
          margin: 0;
          font-size: 14px;
          color: #6b7280;
        }

        .file-types {
          display: inline-block;
          font-size: 12px;
          color: #9ca3af;
          margin-top: 8px;
          background: white;
          padding: 4px 12px;
          border-radius: 20px;
          border: 1px solid #e5e7eb;
        }

        .file-selected {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .file-icon {
          font-size: 32px;
        }

        .file-name {
          margin: 0;
          font-weight: 600;
          color: #1f2937;
          word-break: break-all;
        }

        .file-size {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: #9ca3af;
        }

        .remove-file-btn {
          background: #fee2e2;
          border: none;
          color: #dc2626;
          padding: 8px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .remove-file-btn:hover {
          background: #fca5a5;
        }

        .progress-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #2563eb);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .progress-text {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #3b82f6;
          font-weight: 500;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .alert {
          padding: 12px 16px;
          border-radius: 8px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .alert p {
          margin: 0;
          font-size: 14px;
        }

        .alert-error {
          background: #fee2e2;
          color: #7f1d1d;
          border: 1px solid #fca5a5;
        }

        .alert-success {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #86efac;
        }

        .requirements-box {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
        }

        .requirements-box h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
        }

        .requirements-box ul {
          margin: 0;
          padding-left: 20px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 8px;
          list-style: none;
          padding: 0;
        }

        .requirements-box li {
          font-size: 13px;
          color: #4b5563;
          padding: 4px 0;
          position: relative;
          padding-left: 20px;
        }

        .requirements-box li::before {
          content: '✓';
          position: absolute;
          left: 0;
          color: #10b981;
          font-weight: bold;
        }

        .optional-note {
          margin: 12px 0 0 0;
          font-size: 12px;
          color: #6b7280;
          font-style: italic;
        }

        .modal-footer {
          display: flex;
          gap: 12px;
          padding: 20px 24px;
          border-top: 1px solid #e5e7eb;
          justify-content: flex-end;
        }

        .btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .btn-primary:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #e5e7eb;
          color: #1f2937;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #d1d5db;
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .modal-container {
            width: 95%;
          }

          .upload-area {
            padding: 20px 16px;
          }

          .requirements-box ul {
            grid-template-columns: 1fr;
          }

          .modal-footer {
            flex-direction: column;
          }

          .btn {
            width: 100%;
          }
        }

        /* Dark mode (.dark on <html>, toggled by next-themes) */
        .dark .modal-container { background: #111827; }
        .dark .modal-header { border-bottom-color: #1f2937; }
        .dark .modal-header h2 { color: #f3f4f6; }
        .dark .close-btn { color: #9ca3af; }
        .dark .close-btn:hover:not(:disabled) { background: #1f2937; color: #f3f4f6; }
        .dark .upload-area { border-color: #4b5563; background: #1f2937; }
        .dark .upload-area:hover:not(.drag-active) { border-color: #60a5fa; background: #1e3a8a; }
        .dark .upload-area.drag-active { border-color: #60a5fa; background: #1e3a8a; }
        .dark .upload-prompt h3 { color: #f3f4f6; }
        .dark .upload-prompt p { color: #9ca3af; }
        .dark .file-types { background: #111827; color: #9ca3af; border-color: #374151; }
        .dark .file-name { color: #f3f4f6; }
        .dark .file-size { color: #9ca3af; }
        .dark .remove-file-btn { background: #450a0a; color: #f87171; }
        .dark .remove-file-btn:hover { background: #7f1d1d; }
        .dark .progress-bar { background: #374151; }
        .dark .alert-error { background: #450a0a; color: #fca5a5; border-color: #7f1d1d; }
        .dark .alert-success { background: #052e16; color: #86efac; border-color: #166534; }
        .dark .requirements-box { background: #1f2937; border-color: #374151; }
        .dark .requirements-box h4 { color: #f3f4f6; }
        .dark .requirements-box li { color: #9ca3af; }
        .dark .optional-note { color: #9ca3af; }
        .dark .modal-footer { border-top-color: #1f2937; }
        .dark .btn-secondary { background: #374151; color: #f3f4f6; }
        .dark .btn-secondary:hover:not(:disabled) { background: #4b5563; }
      `}</style>
    </div>
  );
};

export default ExcelUploadModal;
