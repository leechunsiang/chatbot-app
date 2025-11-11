import { supabase } from './supabase';

const BUCKET_NAME = 'policy-documents';

export interface UploadResult {
  path: string;
  fullPath: string;
  publicUrl: string;
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadDocument(
  file: File,
  _options?: {
    onProgress?: (progress: number) => void;
  }
): Promise<UploadResult> {
  try {
    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `documents/${fileName}`;

    // Upload file
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      path: data.path,
      fullPath: `${BUCKET_NAME}/${data.path}`,
      publicUrl: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteDocument(filePath: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
}

/**
 * Download a file from Supabase Storage
 */
export async function downloadDocument(filePath: string): Promise<Blob> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(filePath);

    if (error) throw error;
    if (!data) throw new Error('No data received');

    return data;
  } catch (error) {
    console.error('Error downloading document:', error);
    throw error;
  }
}

/**
 * Get public URL for a document
 */
export function getDocumentPublicUrl(filePath: string): string {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * List all documents in storage
 */
export async function listDocuments(path = 'documents') {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(path, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error listing documents:', error);
    throw error;
  }
}
