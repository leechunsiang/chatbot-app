import { supabase } from './supabase';
import OpenAI from 'openai';
import mammoth from 'mammoth';

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
  document_title?: string;
  document_category?: string;
  document_description?: string;
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
 * Preprocess user query to extract policy-relevant topics and generate search variations
 */
export async function preprocessQuery(userQuery: string): Promise<{
  originalQuery: string;
  enhancedQueries: string[];
  policyTopic?: string;
}> {
  try {
    const prompt = `You are an HR policy expert. Analyze this employee question and extract the relevant policy topic and generate better search queries.

Employee Question: "${userQuery}"

Provide your response as JSON with:
1. "policyTopic": The main policy area this question relates to (e.g., "Company Property", "Time Off", "Code of Conduct", "Benefits", "Workplace Safety")
2. "searchQueries": Array of 2-3 reformulated queries using formal policy language that would better match policy documents

Example:
Question: "what if i block the company laptop"
Response: {"policyTopic": "Company Property and Assets", "searchQueries": ["blocking company laptop consequences", "misuse of company equipment policy", "damage to company property penalties"]}

Respond ONLY with valid JSON, no markdown or extra text.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates JSON responses for HR policy search optimization. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content || '{}';
    let cleanedContent = content.trim();

    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(cleanedContent);

    return {
      originalQuery: userQuery,
      enhancedQueries: Array.isArray(parsed.searchQueries) ? parsed.searchQueries : [userQuery],
      policyTopic: parsed.policyTopic || undefined,
    };
  } catch (error) {
    console.error('⚠️ Query preprocessing failed, using original query:', error);
    return {
      originalQuery: userQuery,
      enhancedQueries: [userQuery],
    };
  }
}

/**
 * Search for relevant document chunks based on a query
 * CRITICAL: Always requires organizationId for proper data isolation
 */
export async function searchDocumentChunks(
  query: string,
  matchThreshold: number = 0.5,
  matchCount: number = 5,
  organizationId?: string
): Promise<DocumentChunk[]> {
  try {
    if (!organizationId) {
      console.error('❌ RAG Search - Organization ID is required for security');
      throw new Error('Organization ID is required for document search');
    }

    console.log('🔍 RAG Search - Original Query:', query);
    console.log('🔍 RAG Search - Threshold:', matchThreshold, 'Count:', matchCount);
    console.log('🔍 RAG Search - Organization:', organizationId);

    // Preprocess query to get enhanced search terms
    const { enhancedQueries, policyTopic } = await preprocessQuery(query);
    console.log('🧠 Query Analysis - Policy Topic:', policyTopic || 'unknown');
    console.log('🧠 Query Analysis - Enhanced Queries:', enhancedQueries);

    // Search with all query variations and collect results
    const allResults = new Map<string, DocumentChunk>();
    const queriesToSearch = [query, ...enhancedQueries];

    for (const searchQuery of queriesToSearch) {
      const queryEmbedding = await createEmbedding(searchQuery);

      const { data, error } = await supabase.rpc('match_document_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: matchThreshold,
        match_count: matchCount,
        user_organization_id: organizationId,
      });

      if (error) {
        console.error('❌ RAG Search - RPC error for query "' + searchQuery + '":', error);
        continue;
      }

      // Merge results, keeping the highest similarity score for each chunk
      if (data && data.length > 0) {
        data.forEach((chunk: any) => {
          const existing = allResults.get(chunk.id);
          if (!existing || (chunk.similarity > (existing.similarity || 0))) {
            allResults.set(chunk.id, chunk);
          }
        });
      }
    }

    // Convert map to array and sort by similarity
    const combinedResults = Array.from(allResults.values())
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, matchCount);

    console.log(`✅ RAG Search - Found ${combinedResults.length} unique matching chunks from ${queriesToSearch.length} query variations`);

    if (combinedResults.length > 0) {
      combinedResults.forEach((chunk: any, idx: number) => {
        console.log(`  📄 Chunk ${idx + 1}: Similarity ${(chunk.similarity * 100).toFixed(1)}%, Length: ${chunk.content?.length || 0} chars`);
      });
    } else {
      console.warn('⚠️ RAG Search - No matching chunks found. Possible issues:');
      console.warn('  - No published documents with embeddings in database');
      console.warn('  - Similarity threshold too high');
      console.warn('  - Query not semantically similar to document content');
    }

    return combinedResults;
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
 * Extract text from Word document (.docx)
 */
export async function extractTextFromWord(
  filePath: string
): Promise<{ text: string; metadata: { length: number } }> {
  try {
    console.log('📄 Extracting text from Word document...');

    // Download the file from Supabase storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('policy-documents')
      .download(filePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download Word document: ${downloadError?.message}`);
    }

    // Convert Blob to ArrayBuffer
    const arrayBuffer = await fileData.arrayBuffer();

    // Extract text using mammoth
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value.trim();

    console.log(`✅ Text extracted from Word: ${text.length} characters`);

    return {
      text,
      metadata: { length: text.length },
    };
  } catch (error) {
    console.error('Error extracting text from Word:', error);
    throw error;
  }
}

/**
 * Extract text from TXT file
 */
export async function extractTextFromTxt(
  filePath: string
): Promise<{ text: string; metadata: { length: number } }> {
  try {
    console.log('📄 Extracting text from TXT file...');

    // Download the file from Supabase storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('policy-documents')
      .download(filePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download TXT file: ${downloadError?.message}`);
    }

    // Convert Blob to text
    const text = await fileData.text();

    console.log(`✅ Text extracted from TXT: ${text.length} characters`);

    return {
      text,
      metadata: { length: text.length },
    };
  } catch (error) {
    console.error('Error extracting text from TXT:', error);
    throw error;
  }
}

/**
 * Extract text from any supported document type
 */
export async function extractTextFromDocument(
  filePath: string,
  fileType: string,
  documentId: string
): Promise<{ text: string; metadata: any }> {
  console.log(`📄 Processing document: ${filePath} (${fileType})`);

  if (fileType === 'application/pdf') {
    return await extractTextFromPDF(filePath, documentId);
  } else if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType === 'application/msword'
  ) {
    return await extractTextFromWord(filePath);
  } else if (fileType === 'text/plain') {
    return await extractTextFromTxt(filePath);
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
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
      const documentInfo = chunk.document_title ? `\nPolicy Document: ${chunk.document_title}` : '';
      const categoryInfo = chunk.document_category ? `\nCategory: ${chunk.document_category}` : '';
      return `[Document ${index + 1}] ${similarityPercent}${documentInfo}${categoryInfo}\n${chunk.content}`;
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

export async function checkQuestionRelevance(question: string): Promise<boolean> {
  try {
    const prompt = `You are an HR assistant. Determine if the following question is relevant to workplace policies, benefits, HR procedures, or employment-related topics.

Question: "${question}"

Relevant topics include:
- Company policies (time off, dress code, workplace conduct, remote work, etc.)
- Employee benefits (health insurance, retirement, leave policies, etc.)
- HR procedures (onboarding, performance reviews, complaints, etc.)
- Workplace equipment and resources
- Compensation and payroll
- Workplace safety
- Professional development and training
- Any other employment or workplace-related topics

Irrelevant topics include:
- General knowledge questions (sports, entertainment, news, weather, etc.)
- Personal advice unrelated to work
- Technical support for non-work tools
- Any topic not related to the workplace or employment

Respond with ONLY "relevant" or "irrelevant" - no other text.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a classification assistant. Respond with only "relevant" or "irrelevant".'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0,
      max_tokens: 10,
    });

    const result = response.choices[0]?.message?.content?.toLowerCase().trim() || 'irrelevant';
    const isRelevant = result.includes('relevant') && !result.includes('irrelevant');

    console.log(`🎯 Question Relevance Check: "${question}" -> ${isRelevant ? 'RELEVANT' : 'IRRELEVANT'}`);

    return isRelevant;
  } catch (error) {
    console.error('⚠️ Error checking question relevance:', error);
    return true;
  }
}
