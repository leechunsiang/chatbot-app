import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Search, FileText, Download, Loader2, X, AlertCircle, RefreshCw, CheckCircle, XCircle, Clock, Database, Power, PowerOff } from 'lucide-react';
import { getPolicyDocuments, createPolicyDocument, deletePolicyDocument, reprocessDocument, toggleDocumentEnabled, type PolicyDocument } from '@/lib/documents';
import { getDocumentPublicUrl } from '@/lib/storage';
import { formatDistanceToNow } from 'date-fns';
import { getRAGDiagnostics, testRAGSearch } from '@/lib/rag';

export function DocumentManagement() {
  const [documents, setDocuments] = useState<PolicyDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'draft' | 'published'>('draft');

  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [searchQuery, statusFilter]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getPolicyDocuments({
        search: searchQuery || undefined,
        status: statusFilter || undefined,
      });
      setDocuments(data);
    } catch (err: any) {
      console.error('Error loading documents:', err);
      const errorMessage = err?.message || 'Failed to load documents';
      if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
        setError('Database table not found. Please run the migration from SETUP_FILE_UPLOAD.md');
      } else {
        setError('Failed to load documents. Check console for details.');
      }
      setDocuments([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
      if (!allowedTypes.includes(file.type)) {
        setError('Only PDF and DOCX files are allowed');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      setUploadFile(file);
      setUploadTitle(file.name.replace(/\.[^/.]+$/, '')); // Remove extension
      setShowUploadDialog(true);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle.trim()) {
      setError('Please provide a file and title');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      await createPolicyDocument(uploadFile, {
        title: uploadTitle,
        description: uploadDescription || undefined,
        category: uploadCategory || undefined,
        status: uploadStatus,
      });

      // Reset form
      setUploadFile(null);
      setUploadTitle('');
      setUploadDescription('');
      setUploadCategory('');
      setUploadStatus('draft');
      setShowUploadDialog(false);

      // Reload documents
      await loadDocuments();
    } catch (err) {
      console.error('Error uploading document:', err);
      setError('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      setError(null);
      await deletePolicyDocument(id);
      await loadDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document');
    }
  };

  const handleDownload = async (doc: PolicyDocument) => {
    try {
      const url = getDocumentPublicUrl(doc.file_path);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Error downloading document:', err);
      setError('Failed to download document');
    }
  };

  const handleReprocess = async (doc: PolicyDocument) => {
    if (!confirm(`Reprocess "${doc.title}"? This will re-extract text and recreate embeddings.`)) return;

    try {
      setError(null);
      await reprocessDocument(doc.id);
      await loadDocuments();
    } catch (err) {
      console.error('Error reprocessing document:', err);
      setError('Failed to reprocess document');
    }
  };

  const handleToggleEnabled = async (doc: PolicyDocument) => {
    const action = doc.is_enabled ? 'disable' : 'enable';
    
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} "${doc.title}" for RAG? ${doc.is_enabled ? 'This document will NOT be used in chatbot responses.' : 'This document will be available for chatbot responses.'}`)) return;

    try {
      setError(null);
      await toggleDocumentEnabled(doc.id, !doc.is_enabled);
      await loadDocuments();
    } catch (err) {
      console.error('Error toggling document enabled status:', err);
      setError(`Failed to ${action} document`);
    }
  };

  const getProcessingStatusBadge = (doc: PolicyDocument) => {
    if (!doc.processing_status || doc.file_type !== 'application/pdf') return null;

    const statusConfig = {
      pending: { icon: Clock, label: 'Pending', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
      processing: { icon: Loader2, label: 'Processing', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
      completed: { icon: CheckCircle, label: 'Processed', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
      failed: { icon: XCircle, label: 'Failed', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    };

    const config = statusConfig[doc.processing_status];
    if (!config) return null;

    const Icon = config.icon;
    const isSpinning = doc.processing_status === 'processing';

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 whitespace-nowrap ${config.className}`}
        title={doc.processing_error || config.label}
      >
        <Icon className={`h-3 w-3 ${isSpinning ? 'animate-spin' : ''}`} />
        {config.label}
      </span>
    );
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const loadDiagnostics = async () => {
    try {
      setIsLoadingDiagnostics(true);
      const data = await getRAGDiagnostics();
      setDiagnostics(data);
      setShowDiagnostics(true);
    } catch (err) {
      console.error('Error loading diagnostics:', err);
      setError('Failed to load RAG diagnostics');
    } finally {
      setIsLoadingDiagnostics(false);
    }
  };

  const handleTestSearch = async () => {
    try {
      setError(null);
      const result = await testRAGSearch('company leave policy');
      console.log('RAG Test Search Result:', result);
      if (result.success) {
        alert(`Test successful! Found ${result.chunksFound} document chunks. Check console for details.`);
      } else {
        alert(`Test failed: ${result.error}`);
      }
    } catch (err) {
      console.error('Error testing RAG search:', err);
      setError('Failed to test RAG search');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Policy Documents</h2>
          <p className="text-muted-foreground mt-1">
            Upload and manage policy documents for the chatbot
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadDiagnostics} variant="outline" className="gap-2" disabled={isLoadingDiagnostics}>
            {isLoadingDiagnostics ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            RAG Diagnostics
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-destructive font-semibold">Error</p>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-destructive hover:text-destructive/80">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Upload Dialog */}
      {showUploadDialog && uploadFile && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Upload Document Details</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowUploadDialog(false);
                  setUploadFile(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription>
              File: {uploadFile.name} ({formatFileSize(uploadFile.size)})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Title *</label>
              <Input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Enter document title"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Input
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Enter document description"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <Input
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                placeholder="e.g., Benefits, Time Off, Workplace"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <select
                value={uploadStatus}
                onChange={(e) => setUploadStatus(e.target.value as 'draft' | 'published')}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
              {uploadFile?.type === 'application/pdf' && uploadStatus === 'published' && (
                <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1">
                  <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>Published PDFs are automatically processed for chatbot search. This may take a few moments after upload.</span>
                </p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUploadDialog(false);
                  setUploadFile(null);
                }}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={isUploading || !uploadTitle.trim()}>
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* RAG Diagnostics */}
      {showDiagnostics && diagnostics && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                RAG System Diagnostics
              </span>
              <Button variant="ghost" size="icon" onClick={() => setShowDiagnostics(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription>
              Current status of the Retrieval-Augmented Generation system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold">{diagnostics.totalDocuments}</p>
              </div>
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-2xl font-bold text-green-600">{diagnostics.publishedDocuments}</p>
              </div>
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                <p className="text-sm text-muted-foreground">With Embeddings</p>
                <p className="text-2xl font-bold text-blue-600">{diagnostics.documentsWithChunks}</p>
              </div>
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                <p className="text-sm text-muted-foreground">Total Chunks</p>
                <p className="text-2xl font-bold">{diagnostics.totalChunks}</p>
              </div>
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                <p className="text-sm text-muted-foreground">Avg Chunks/Doc</p>
                <p className="text-2xl font-bold">{diagnostics.avgChunksPerDocument}</p>
              </div>
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                <p className="text-sm text-muted-foreground">Search Status</p>
                <p className="text-lg font-bold">
                  {diagnostics.totalChunks > 0 ? (
                    <span className="text-green-600">Ready</span>
                  ) : (
                    <span className="text-red-600">No Data</span>
                  )}
                </p>
              </div>
            </div>
            <div className="pt-2 border-t">
              <Button onClick={handleTestSearch} variant="outline" className="w-full">
                <Search className="h-4 w-4 mr-2" />
                Test Search with Sample Query
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                This will search for "company leave policy" and log results to console
              </p>
            </div>
            {diagnostics.totalChunks === 0 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-2">No embeddings found</p>
                <ul className="text-sm text-amber-700 dark:text-amber-500 space-y-1 list-disc list-inside">
                  <li>Upload PDF documents and set status to "Published"</li>
                  <li>Wait for processing to complete (check Processing Status badge)</li>
                  <li>Verify OpenAI API key is configured in environment variables</li>
                  <li>Check browser console for processing errors</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>All Documents</CardTitle>
          <CardDescription>
            {isLoading ? 'Loading...' : `${documents.length} policy document${documents.length !== 1 ? 's' : ''} available`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No documents found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload your first policy document to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {doc.category && (
                          <>
                            <span className="px-2 py-0.5 rounded-full bg-muted">{doc.category}</span>
                            <span>•</span>
                          </>
                        )}
                        <span>v{doc.version}</span>
                        <span>•</span>
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span>Uploaded {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        doc.status === 'published'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : doc.status === 'draft'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {doc.status}
                    </span>
                    {getProcessingStatusBadge(doc)}
                    {/* Enable/Disable Toggle for Published Documents */}
                    {doc.status === 'published' && (
                      <Button
                        variant={doc.is_enabled ? "outline" : "ghost"}
                        size="icon"
                        onClick={() => handleToggleEnabled(doc)}
                        title={doc.is_enabled ? 'Disable for RAG (document will not be used in chatbot responses)' : 'Enable for RAG (document will be used in chatbot responses)'}
                        className={doc.is_enabled ? 'border-green-500 text-green-600 hover:bg-green-50 dark:border-green-600 dark:text-green-500 dark:hover:bg-green-950' : 'text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400'}
                      >
                        {doc.is_enabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                      </Button>
                    )}
                    {doc.file_type === 'application/pdf' && (doc.processing_status === 'failed' || doc.processing_status === 'pending') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleReprocess(doc)}
                        title="Reprocess document"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} title="Download">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)} title="Delete">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
