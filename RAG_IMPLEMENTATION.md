# RAG (Retrieval Augmented Generation) Implementation Guide

## Overview
The chatbot now uses RAG to answer questions based on uploaded policy documents. When users ask questions, the system:
1. Searches for relevant document chunks using vector similarity
2. Includes relevant context in the AI prompt
3. Keeps conversations focused on HR policies and benefits

## What Was Implemented

### 1. Database Changes (`20251112_add_document_chunks.sql`)
- **document_chunks table**: Stores document content split into chunks with embeddings
- **Vector search function**: `match_document_chunks()` for semantic search
- **RLS policies**: Security policies for document chunk access

### 2. RAG Library (`src/lib/rag.ts`)
- **PDF text extraction**: Extracts text from uploaded PDF files
- **Document chunking**: Splits documents into manageable chunks with overlap
- **Embedding creation**: Creates vector embeddings using OpenAI's text-embedding-3-small
- **Semantic search**: Searches for relevant chunks based on user queries
- **Context building**: Formats relevant chunks into context for the AI

### 3. Updated Documents Library (`src/lib/documents.ts`)
- Automatically processes PDF documents when uploaded and published
- Extracts text and creates embeddings for semantic search

### 4. Enhanced Chat Component (`src/components/Chat.tsx`)
- Searches for relevant document chunks before each message
- Includes relevant context in the system prompt
- Keeps conversation focused on HR/policy topics
- Changed model to `gpt-4o-mini` for better performance

## Setup Instructions

### Step 1: Run Database Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Paste the contents of:
-- supabase/migrations/20251112_add_document_chunks.sql
```

Or if using Supabase CLI:
```bash
npx supabase db push
```

### Step 2: Verify Environment Variables

Make sure your `.env` file has:
```env
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 3: Upload Policy Documents

1. Navigate to the HR Dashboard → Policy Documents
2. Click "Upload Document"
3. Select a PDF file
4. Fill in the details
5. **Important**: Set status to "Published" for the document to be processed for RAG
6. Click "Upload"

The system will:
- Upload the PDF to Supabase Storage
- Extract text from the PDF
- Split the text into chunks (1000 characters each with 200 char overlap)
- Create embeddings for each chunk
- Store everything in the database

### Step 4: Test the Chatbot

1. Go to the chat interface
2. Ask a question related to your uploaded policies
3. Example: "What is the vacation policy?"
4. The bot will:
   - Search for relevant document chunks
   - Include context from your policies
   - Provide an accurate answer based on your documents

## How It Works

### Document Processing Flow
```
PDF Upload → Text Extraction → Chunking → Embedding Creation → Database Storage
```

### Chat Query Flow
```
User Question → Create Query Embedding → Search Similar Chunks → 
Build Context → Send to OpenAI → Return Answer
```

### System Prompt
The chatbot now has a focused system prompt that:
- Identifies as an HR assistant
- Focuses on policy and benefits questions
- Uses document context when available
- Politely redirects off-topic questions
- Encourages checking with HR when specific information isn't available

## Features

### ✅ Implemented
- PDF text extraction using PDF.js
- Document chunking with overlap
- Vector embeddings with OpenAI
- Semantic search for relevant content
- Context-aware responses
- Automatic processing on upload
- Focused conversation scope (HR/policies)

### 🔄 Future Enhancements
- Support for DOCX files
- Manual reprocessing of existing documents
- Document processing status indicator
- Chunk highlighting in responses
- Source attribution (which document answered the question)
- Organization-specific document filtering
- Batch document processing
- Document versioning support

## Troubleshooting

### Documents Not Being Found
1. Check that documents are marked as "published"
2. Verify the `match_document_chunks` function exists in your database
3. Check browser console for RAG processing errors

### PDF Text Extraction Fails
- Only PDF files are currently supported for RAG
- DOCX files are uploaded but not processed for RAG yet
- Check that the PDF is not password-protected or corrupted

### Embedding Errors
- Verify your OpenAI API key is valid and has credits
- Check that the API key has access to `text-embedding-3-small` model
- Look for rate limiting issues in the console

### No Context in Responses
- Ensure documents have been uploaded and published
- Check that the `document_chunks` table has data
- Verify the similarity threshold (currently 0.7) isn't too high

## Cost Considerations

### OpenAI API Costs
- **Embeddings**: ~$0.00002 per 1K tokens (text-embedding-3-small)
- **Chat**: ~$0.00015 per 1K tokens input, ~$0.0006 per 1K tokens output (gpt-4o-mini)

### Example Costs
- Processing a 50-page policy document: ~$0.10-0.20
- 1000 chat queries with context: ~$1-2

## Security

- Document chunks inherit RLS policies from policy_documents
- Only published documents are searchable
- Users can only access documents from their organization (when org filtering is added)
- Embeddings are stored securely in Supabase

## Performance

- Vector search using HNSW index for fast similarity queries
- Chunk size optimized for context window
- Caching can be added for frequently accessed documents
- Parallel processing possible for large documents

## Next Steps

1. **Test with real policies**: Upload your company's policy documents
2. **Monitor performance**: Check logs for processing times and search accuracy
3. **Adjust parameters**: Tune chunk size, overlap, and similarity threshold
4. **Add source attribution**: Show which documents were used to answer
5. **Organization filtering**: Filter documents by user's organization
6. **Add DOCX support**: Extend to support Word documents
