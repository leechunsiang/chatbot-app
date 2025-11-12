import { supabase } from './supabase';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true
});

export interface DocumentChunk {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  similarity?: number;
}

/**
 * Create embeddings for a text chunk
 */
export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    throw error;
  }
}

/**
 * Split document text into manageable chunks
 */
export function splitIntoChunks(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    const chunk = text.slice(startIndex, endIndex);
    chunks.push(chunk.trim());
    
    // Move forward by chunkSize minus overlap
    startIndex += chunkSize - overlap;
    
    // Break if we've reached the end
    if (endIndex === text.length) break;
  }

  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Process a document and store its chunks with embeddings
 */
export async function processDocumentForRAG(
  documentId: string,
  documentText: string
): Promise<void> {
  try {
    // Split document into chunks
    const chunks = splitIntoChunks(documentText);

    // Delete existing chunks for this document
    await supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId);

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Create embedding
      const embedding = await createEmbedding(chunk);

      // Store chunk with embedding
      const { error } = await supabase
        .from('document_chunks')
        .insert({
          document_id: documentId,
          content: chunk,
          chunk_index: i,
          embedding,
        });

      if (error) throw error;
    }

    console.log(`✅ Processed ${chunks.length} chunks for document ${documentId}`);
  } catch (error) {
    console.error('Error processing document for RAG:', error);
    throw error;
  }
}

/**
 * Search for relevant document chunks based on a query
 */
export async function searchDocumentChunks(
  query: string,
  matchThreshold: number = 0.7,
  matchCount: number = 5
): Promise<DocumentChunk[]> {
  try {
    // Create embedding for the query
    const queryEmbedding = await createEmbedding(query);

    // Search for similar chunks using the Postgres function
    const { data, error } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error searching document chunks:', error);
    throw error;
  }
}

/**
 * Extract text from PDF using backend Edge Function
 */
export async function extractTextFromPDF(
  filePath: string,
  documentId: string
): Promise<{ text: string; metadata: { pages: number; length: number } }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      throw new Error('Not authenticated');
    }

    const functionUrl = `${supabaseUrl}/functions/v1/process-pdf`;

    console.log('Calling Edge Function to extract PDF text...');

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.data.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filePath,
        documentId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'PDF processing failed');
    }

    return {
      text: result.text,
      metadata: result.metadata || { pages: 0, length: result.text.length },
    };
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}

/**
 * Get all document chunks for a specific document
 */
export async function getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
  const { data, error } = await supabase
    .from('document_chunks')
    .select('*')
    .eq('document_id', documentId)
    .order('chunk_index');

  if (error) throw error;

  return data || [];
}

/**
 * Build context from relevant document chunks
 */
export function buildContextFromChunks(chunks: DocumentChunk[]): string {
  if (chunks.length === 0) return '';

  const context = chunks
    .map((chunk, index) => `[Document ${index + 1}]\n${chunk.content}`)
    .join('\n\n---\n\n');

  return context;
}
