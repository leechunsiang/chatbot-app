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
  matchThreshold: number = 0.5,
  matchCount: number = 5
): Promise<DocumentChunk[]> {
  try {
    console.log('🔍 RAG Search - Query:', query);
    console.log('🔍 RAG Search - Threshold:', matchThreshold, 'Count:', matchCount);

    const queryEmbedding = await createEmbedding(query);
    console.log('✅ RAG Search - Query embedding created:', queryEmbedding.length, 'dimensions');

    const { data, error } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) {
      console.error('❌ RAG Search - RPC error:', error);
      throw error;
    }

    console.log(`✅ RAG Search - Found ${data?.length || 0} matching chunks`);

    if (data && data.length > 0) {
      data.forEach((chunk: any, idx: number) => {
        console.log(`  📄 Chunk ${idx + 1}: Similarity ${(chunk.similarity * 100).toFixed(1)}%, Length: ${chunk.content?.length || 0} chars`);
      });
    } else {
      console.warn('⚠️ RAG Search - No matching chunks found. Possible issues:');
      console.warn('  - No published documents with embeddings in database');
      console.warn('  - Similarity threshold too high');
      console.warn('  - Query not semantically similar to document content');
    }

    return data || [];
  } catch (error) {
    console.error('❌ RAG Search - Error:', error);
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
    .map((chunk, index) => {
      const similarityPercent = chunk.similarity ? `(${(chunk.similarity * 100).toFixed(1)}% match)` : '';
      return `[Document ${index + 1}] ${similarityPercent}\n${chunk.content}`;
    })
    .join('\n\n---\n\n');

  return context;
}

/**
 * Get RAG system diagnostics
 */
export async function getRAGDiagnostics(): Promise<{
  totalChunks: number;
  totalDocuments: number;
  publishedDocuments: number;
  documentsWithChunks: number;
  avgChunksPerDocument: number;
}> {
  try {
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('document_id');

    if (chunksError) throw chunksError;

    const { data: docs, error: docsError } = await supabase
      .from('policy_documents')
      .select('id, status');

    if (docsError) throw docsError;

    const uniqueDocumentsWithChunks = new Set(chunks?.map(c => c.document_id) || []).size;
    const publishedDocs = docs?.filter(d => d.status === 'published').length || 0;

    return {
      totalChunks: chunks?.length || 0,
      totalDocuments: docs?.length || 0,
      publishedDocuments: publishedDocs,
      documentsWithChunks: uniqueDocumentsWithChunks,
      avgChunksPerDocument: uniqueDocumentsWithChunks > 0
        ? Math.round((chunks?.length || 0) / uniqueDocumentsWithChunks)
        : 0,
    };
  } catch (error) {
    console.error('Error getting RAG diagnostics:', error);
    throw error;
  }
}

/**
 * Test RAG search with a sample query
 */
export async function testRAGSearch(query: string = 'company policy'): Promise<{
  success: boolean;
  chunksFound: number;
  chunks: DocumentChunk[];
  error?: string;
}> {
  try {
    const chunks = await searchDocumentChunks(query, 0.3, 10);
    return {
      success: true,
      chunksFound: chunks.length,
      chunks,
    };
  } catch (error) {
    return {
      success: false,
      chunksFound: 0,
      chunks: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
