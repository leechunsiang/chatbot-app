import { useState, useEffect } from 'react';
import { Download, Trash2, Search, RefreshCw } from 'lucide-react';
import { getPolicyDocuments, deletePolicyDocument, reprocessDocument, type PolicyDocument } from '@/lib/documents';
import { supabase } from '@/lib/supabase';

interface DocumentsViewProps {
  onClose: () => void;
  onUploadClick?: () => void;
}

export function DocumentsView({ onClose, onUploadClick }: DocumentsViewProps) {
  const [documents, setDocuments] = useState<PolicyDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [statusFilter]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const filters: any = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      const docs = await getPolicyDocuments(filters);
      setDocuments(docs);
    } catch (err: any) {
      console.error('Error loading documents:', err);
      setError(err.message || 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      await deletePolicyDocument(documentId);
      setDocuments(docs => docs.filter(d => d.id !== documentId));
      setShowConfirmDelete(null);
    } catch (err: any) {
      console.error('Error deleting document:', err);
      setError(err.message || 'Failed to delete document');
    }
  };

  const handleReprocess = async (documentId: string) => {
    try {
      await reprocessDocument(documentId);
      await loadDocuments();
    } catch (err: any) {
      console.error('Error reprocessing document:', err);
      setError(err.message || 'Failed to reprocess document');
    }
  };

  const handleDownload = async (document: PolicyDocument) => {
    try {
      const { data } = supabase.storage.from('policy-documents').getPublicUrl(document.file_path);
      window.open(data.publicUrl, '_blank');
    } catch (err: any) {
      console.error('Error downloading document:', err);
      setError(err.message || 'Failed to download document');
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(query) ||
      doc.description?.toLowerCase().includes(query) ||
      doc.category?.toLowerCase().includes(query)
    );
  });

  const getFileIcon = (type: string) => {
    if (type === 'application/pdf') return '📕';
    if (type.includes('word')) return '📘';
    if (type === 'text/plain') return '📄';
    return '📁';
  };

  const getStatusColor = (status: string) => {
    if (status === 'published') return 'bg-green-400';
    if (status === 'draft') return 'bg-yellow-400';
    if (status === 'archived') return 'bg-gray-400';
    return 'bg-blue-400';
  };

  const getProcessingStatusColor = (status?: string) => {
    if (status === 'completed') return 'bg-green-400';
    if (status === 'processing') return 'bg-blue-400';
    if (status === 'failed') return 'bg-red-400';
    return 'bg-gray-300';
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-4 border-black rounded-xl p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-black text-black flex items-center gap-2">
            📚 Document Library
          </h2>
          <button
            onClick={onClose}
            className="text-black hover:text-black/70 font-black text-2xl"
          >
            ×
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-400 border-3 border-black rounded-lg p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <p className="font-bold text-black">{error}</p>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-black/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="w-full pl-10 pr-4 py-3 border-3 border-black rounded-lg font-bold text-black placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-cyan-400"
              />
            </div>
            {onUploadClick && (
              <button
                onClick={onUploadClick}
                className="bg-pink-400 border-3 border-black rounded-lg px-6 py-3 font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
              >
                📤 Upload
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {['all', 'published', 'draft', 'archived'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as any)}
                className={`px-4 py-2 border-3 border-black rounded-lg font-black text-black transition-all ${
                  statusFilter === status
                    ? 'bg-cyan-400 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Documents List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-5xl mb-4">⏳</div>
              <p className="font-bold text-black/60">Loading documents...</p>
            </div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-5xl mb-4">📭</div>
              <p className="font-bold text-black/60 mb-2">No documents found</p>
              {onUploadClick && (
                <button
                  onClick={onUploadClick}
                  className="mt-4 bg-cyan-400 border-3 border-black rounded-lg px-6 py-3 font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                >
                  Upload Your First Document
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-gray-50 border-3 border-black rounded-lg p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="text-4xl flex-shrink-0">{getFileIcon(doc.file_type)}</div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <h3 className="font-black text-black text-lg">{doc.title}</h3>
                        {doc.description && (
                          <p className="font-bold text-black/70 text-sm mt-1">{doc.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <span className={`${getStatusColor(doc.status)} border-2 border-black rounded px-2 py-1 text-xs font-black text-black`}>
                          {doc.status}
                        </span>
                        {doc.processing_status && (
                          <span className={`${getProcessingStatusColor(doc.processing_status)} border-2 border-black rounded px-2 py-1 text-xs font-black text-black`}>
                            {doc.processing_status}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm font-bold text-black/60 mb-3">
                      <span>{formatFileSize(doc.file_size)}</span>
                      {doc.category && <span>• {doc.category}</span>}
                      <span>• Uploaded {formatDate(doc.created_at)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="bg-blue-400 border-2 border-black rounded-lg px-3 py-1.5 text-xs font-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </button>
                      {doc.processing_status === 'failed' && (
                        <button
                          onClick={() => handleReprocess(doc.id)}
                          className="bg-yellow-400 border-2 border-black rounded-lg px-3 py-1.5 text-xs font-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all flex items-center gap-1"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Retry
                        </button>
                      )}
                      <button
                        onClick={() => setShowConfirmDelete(doc.id)}
                        className="bg-red-400 border-2 border-black rounded-lg px-3 py-1.5 text-xs font-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>

                    {doc.processing_error && (
                      <div className="mt-2 bg-red-100 border-2 border-black rounded p-2">
                        <p className="text-xs font-bold text-red-800">Error: {doc.processing_error}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Confirm Delete Modal */}
        {showConfirmDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white border-4 border-black rounded-xl p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full mx-4">
              <h3 className="text-2xl font-black text-black mb-4">⚠️ Delete Document?</h3>
              <p className="font-bold text-black/80 mb-6">
                Are you sure you want to delete this document? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDelete(showConfirmDelete)}
                  className="flex-1 bg-red-400 border-3 border-black rounded-lg px-4 py-3 font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowConfirmDelete(null)}
                  className="flex-1 bg-gray-300 border-3 border-black rounded-lg px-4 py-3 font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
