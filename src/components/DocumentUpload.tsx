import { useState, useRef } from 'react';
import { Upload, X, AlertCircle } from 'lucide-react';
import { createPolicyDocument } from '@/lib/documents';

interface DocumentUploadProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function DocumentUpload({ onClose, onSuccess }: DocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED_FILE_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'text/plain', // .txt
  ];

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleFileSelect = (file: File) => {
    setError(null);

    // Validate file type
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setError('Invalid file type. Please upload PDF, Word (DOC/DOCX), or TXT files only.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds 10MB limit.');
      return;
    }

    setSelectedFile(file);
    
    // Auto-fill title from filename if empty
    if (!title) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setTitle(nameWithoutExt);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim()) {
      setError('Please select a file and provide a title.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      await createPolicyDocument(
        selectedFile,
        {
          title: title.trim(),
          description: description.trim() || undefined,
          category: category.trim() || undefined,
          status,
        },
        (progress) => {
          setUploadProgress(progress);
        }
      );

      // Success!
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type === 'application/pdf') return '📕';
    if (type.includes('word')) return '📘';
    if (type === 'text/plain') return '📄';
    return '📁';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-4 border-black rounded-xl p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-black text-black flex items-center gap-2">
            📤 Upload Document
          </h2>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="text-black hover:text-black/70 font-black text-2xl disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-400 border-3 border-black rounded-lg p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-black flex-shrink-0" />
              <p className="font-bold text-black">{error}</p>
            </div>
          </div>
        )}

        {/* File Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`mb-6 border-4 border-dashed rounded-xl p-8 transition-all ${
            isDragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-black bg-gray-50'
          }`}
        >
          {!selectedFile ? (
            <div className="text-center">
              <Upload className="h-16 w-16 text-black/40 mx-auto mb-4" strokeWidth={2.5} />
              <p className="font-black text-black text-lg mb-2">
                Drop your file here or click to browse
              </p>
              <p className="font-bold text-black/60 text-sm mb-4">
                PDF, Word (DOC/DOCX), or TXT files up to 10MB
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-cyan-400 border-3 border-black rounded-lg px-6 py-3 font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Browse Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileInputChange}
                className="hidden"
                disabled={isUploading}
              />
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="text-5xl">{getFileIcon(selectedFile.type)}</div>
              <div className="flex-1">
                <p className="font-black text-black text-lg">{selectedFile.name}</p>
                <p className="font-bold text-black/60 text-sm">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              {!isUploading && (
                <button
                  onClick={() => setSelectedFile(null)}
                  className="bg-red-400 border-3 border-black rounded-lg p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                >
                  <X className="h-5 w-5 text-black" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {isUploading && uploadProgress > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-black text-sm">Uploading...</span>
              <span className="font-black text-black">{uploadProgress}%</span>
            </div>
            <div className="h-4 bg-gray-200 border-3 border-black rounded-lg overflow-hidden">
              <div
                className="h-full bg-green-400 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-4 mb-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-black text-black mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title"
              className="w-full px-4 py-3 border-3 border-black rounded-lg font-bold text-black placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-cyan-400"
              disabled={isUploading}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-black text-black mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the document"
              rows={3}
              className="w-full px-4 py-3 border-3 border-black rounded-lg font-bold text-black placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-cyan-400 resize-none"
              disabled={isUploading}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-black text-black mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border-3 border-black rounded-lg font-bold text-black focus:outline-none focus:ring-4 focus:ring-cyan-400"
              disabled={isUploading}
            >
              <option value="">Select a category</option>
              <option value="HR Policies">HR Policies</option>
              <option value="Benefits">Benefits</option>
              <option value="Procedures">Procedures</option>
              <option value="Guidelines">Guidelines</option>
              <option value="Training">Training</option>
              <option value="Compliance">Compliance</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-black text-black mb-2">
              Status
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStatus('draft')}
                disabled={isUploading}
                className={`flex-1 px-4 py-3 border-3 border-black rounded-lg font-black text-black transition-all ${
                  status === 'draft'
                    ? 'bg-yellow-400 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                📝 Draft
              </button>
              <button
                type="button"
                onClick={() => setStatus('published')}
                disabled={isUploading}
                className={`flex-1 px-4 py-3 border-3 border-black rounded-lg font-black text-black transition-all ${
                  status === 'published'
                    ? 'bg-green-400 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                ✅ Published
              </button>
            </div>
            <p className="text-xs font-bold text-black/60 mt-2">
              💡 Tip: Only published documents will be processed for AI chatbot responses
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleUpload}
            disabled={isUploading || !selectedFile || !title.trim()}
            className="flex-1 bg-green-400 border-3 border-black rounded-lg px-6 py-3 font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0"
          >
            {isUploading ? (
              <>🔄 Uploading...</>
            ) : (
              <>📤 Upload Document</>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="flex-1 bg-red-400 border-3 border-black rounded-lg px-6 py-3 font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✖️ Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
