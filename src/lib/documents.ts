import { supabase } from './supabase';
import { uploadDocument, deleteDocument as deleteStorageDocument } from './storage';
import { logActivity } from './activities';
import { extractTextFromDocument, processDocumentForRAG } from './rag';

export interface PolicyDocument {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  category: string | null;
  tags: string[];
  version: number;
  status: 'draft' | 'published' | 'archived';
  is_enabled: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  processed_at?: string | null;
  processing_error?: string | null;
  extracted_text_length?: number;
}

export interface CreateDocumentInput {
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  status?: 'draft' | 'published';
}

/**
 * Get all policy documents
 */
export async function getPolicyDocuments(filters?: {
  status?: string;
  category?: string;
  search?: string;
}): Promise<PolicyDocument[]> {
  try {
    let query = supabase
      .from('policy_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching policy documents:', error);
    throw error;
  }
}

/**
 * Get a single policy document by ID
 */
export async function getPolicyDocument(id: string): Promise<PolicyDocument | null> {
  try {
    const { data, error } = await supabase
      .from('policy_documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching policy document:', error);
    throw error;
  }
}

/**
 * Upload and create a new policy document
 */
export async function createPolicyDocument(
  file: File,
  metadata: CreateDocumentInput,
  onProgress?: (progress: number) => void
): Promise<PolicyDocument> {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    // Upload file to storage
    const uploadResult = await uploadDocument(file, { onProgress });

    // Create database record
    const { data, error } = await supabase
      .from('policy_documents')
      .insert({
        title: metadata.title,
        description: metadata.description || null,
        file_path: uploadResult.path,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        category: metadata.category || null,
        tags: metadata.tags || [],
        status: metadata.status || 'draft',
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Log activity if user has organization
    const { data: orgData } = await supabase
      .from('organization_users')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (orgData?.organization_id) {
      await logActivity(
        orgData.organization_id,
        user.id,
        'document_uploaded',
        `Document "${metadata.title}" was uploaded`,
        { documentName: metadata.title, fileName: file.name }
      );
    }

    // Process document for RAG if published (supports PDF, Word, TXT)
    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];
    
    if (supportedTypes.includes(file.type) && metadata.status === 'published') {
      processDocumentAsync(data.id, uploadResult.path, file.type).catch(error => {
        console.error('Background processing error:', error);
      });
    }

    return data;
  } catch (error) {
    console.error('Error creating policy document:', error);
    throw error;
  }
}

/**
 * Update a policy document
 */
export async function updatePolicyDocument(
  id: string,
  updates: Partial<CreateDocumentInput>
): Promise<PolicyDocument> {
  try {
    const { data, error } = await supabase
      .from('policy_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating policy document:', error);
    throw error;
  }
}

/**
 * Delete a policy document
 */
export async function deletePolicyDocument(id: string): Promise<void> {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    
    // Get document to get file path
    const document = await getPolicyDocument(id);
    if (!document) throw new Error('Document not found');

    // Delete from storage
    await deleteStorageDocument(document.file_path);

    // Delete from database
    const { error } = await supabase
      .from('policy_documents')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Log activity if user has organization
    if (user) {
      const { data: orgData } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (orgData?.organization_id) {
        await logActivity(
          orgData.organization_id,
          user.id,
          'document_deleted',
          `Document "${document.title}" was deleted`,
          { documentName: document.title }
        );
      }
    }
  } catch (error) {
    console.error('Error deleting policy document:', error);
    throw error;
  }
}

/**
 * Get document statistics
 */
export async function getDocumentStats() {
  try {
    const { data, error } = await supabase
      .from('policy_documents')
      .select('status');

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      published: data?.filter(d => d.status === 'published').length || 0,
      draft: data?.filter(d => d.status === 'draft').length || 0,
      archived: data?.filter(d => d.status === 'archived').length || 0,
    };

    return stats;
  } catch (error) {
    console.error('Error fetching document stats:', error);
    throw error;
  }
}

/**
 * Process document asynchronously in the background
 */
async function processDocumentAsync(documentId: string, filePath: string, fileType: string): Promise<void> {
  try {
    await supabase
      .from('policy_documents')
      .update({ processing_status: 'processing' })
      .eq('id', documentId);

    console.log(`📄 Extracting text from document (${fileType})...`);

    const result = await extractTextFromDocument(filePath, fileType, documentId);

    const pagesInfo = result.metadata.pages ? ` from ${result.metadata.pages} pages` : '';
    console.log(`✅ Text extracted: ${result.text.length} characters${pagesInfo}`);

    await processDocumentForRAG(documentId, result.text);

    await supabase
      .from('policy_documents')
      .update({
        processing_status: 'completed',
        processed_at: new Date().toISOString(),
        extracted_text_length: result.text.length,
        processing_error: null,
      })
      .eq('id', documentId);

    console.log('✅ Document fully processed for RAG');
  } catch (error) {
    console.error('⚠️ Failed to process document:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    await supabase
      .from('policy_documents')
      .update({
        processing_status: 'failed',
        processing_error: errorMessage,
      })
      .eq('id', documentId);
  }
}

/**
 * Reprocess a document (for failed or outdated documents)
 */
export async function reprocessDocument(documentId: string): Promise<void> {
  try {
    const document = await getPolicyDocument(documentId);
    if (!document) throw new Error('Document not found');

    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];

    if (!supportedTypes.includes(document.file_type)) {
      throw new Error('This document type cannot be reprocessed');
    }

    await processDocumentAsync(documentId, document.file_path, document.file_type);
  } catch (error) {
    console.error('Error reprocessing document:', error);
    throw error;
  }
}

/**
 * Toggle document enabled status for RAG
 */
export async function toggleDocumentEnabled(documentId: string, isEnabled: boolean): Promise<void> {
  try {
    const { error } = await supabase
      .from('policy_documents')
      .update({ is_enabled: isEnabled })
      .eq('id', documentId);

    if (error) throw error;

    console.log(`✅ Document ${isEnabled ? 'enabled' : 'disabled'} for RAG`);
  } catch (error) {
    console.error('Error toggling document enabled status:', error);
    throw error;
  }
}
