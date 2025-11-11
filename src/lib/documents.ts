import { supabase } from './supabase';
import { uploadDocument, deleteDocument as deleteStorageDocument } from './storage';

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
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
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
