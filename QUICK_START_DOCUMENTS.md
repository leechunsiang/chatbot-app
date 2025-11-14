# Quick Start Guide: Document Upload & RAG Features

## 🚀 Getting Started

### Access the Application
Your application is now running at: **http://localhost:5174/**

---

## 📤 Uploading Documents

### Step-by-Step:

1. **Login to Dashboard**
   - Navigate to the dashboard
   - Ensure you're logged in as HR Admin or Manager

2. **Click "Upload Document"**
   - Find the "📄 Upload Document" button in the Quick Actions panel
   - The upload modal will open

3. **Select Your File**
   - **Option A**: Drag and drop file into the upload area
   - **Option B**: Click "Browse Files" to select from your computer
   - **Supported formats**: PDF (.pdf), Word (.doc, .docx), Text (.txt)
   - **Max size**: 10MB

4. **Fill in Details**
   - **Title** (required): Enter a descriptive title
   - **Description** (optional): Brief summary of the document
   - **Category** (optional): Choose from dropdown (HR Policies, Benefits, etc.)
   - **Status**: 
     - Choose **"Published"** to make it available to the AI chatbot immediately
     - Choose **"Draft"** if not ready yet

5. **Upload**
   - Click "📤 Upload Document" button
   - Watch the progress bar
   - Success message will appear when complete

---

## 📚 Viewing Documents

### Access Document Library:

1. Click "📚 View Documents" in Quick Actions
2. Browse all uploaded documents
3. Use the search bar to find specific documents
4. Filter by status: All, Published, Draft, or Archived

### Document Actions:

- **📥 Download**: Opens document in new tab
- **🔄 Retry**: Reprocess failed documents
- **🗑️ Delete**: Remove document (with confirmation)

---

## 🤖 Using RAG in Chatbot

### How It Works:

1. **Documents are Processed Automatically**
   - When you upload a document with status "Published"
   - Text is extracted from the document
   - AI creates embeddings for semantic search
   - Document chunks are stored in the database

2. **Ask Questions in Chatbot**
   - Go to the chatbot interface
   - Ask any question about your organization's policies
   - Examples:
     - "What is our vacation policy?"
     - "How many sick days do I get?"
     - "What are the health insurance benefits?"
     - "How do I submit an expense report?"

3. **AI Finds Relevant Information**
   - Chatbot searches through all published documents
   - Finds relevant sections based on your question
   - Provides answers with context from your documents

---

## 📊 Processing Status

### Status Indicators:

| Status | Meaning | Action Needed |
|--------|---------|---------------|
| 🟡 **Pending** | Uploaded but not processed | None - will process automatically |
| 🔵 **Processing** | Currently extracting text | None - wait for completion |
| 🟢 **Completed** | Ready for AI chatbot | None - document is live! |
| 🔴 **Failed** | Processing error occurred | Click "Retry" button |

### Tips:
- Only **Published** documents are processed for RAG
- **Draft** documents are stored but not used by the chatbot
- Processing time depends on document size (usually < 1 minute)

---

## 🎯 Best Practices

### For Best Results:

1. **Use Clear Titles**
   - Make titles descriptive and searchable
   - Example: "2024 Employee Handbook" instead of "Handbook"

2. **Add Descriptions**
   - Brief summaries help with searching
   - Mention key topics covered

3. **Choose Appropriate Categories**
   - Helps organize and filter documents
   - Makes searching easier

4. **Publish When Ready**
   - Set to "Published" only when document is final
   - Draft documents won't be used by AI chatbot

5. **Keep Documents Updated**
   - Delete outdated versions
   - Upload new versions as needed

---

## 🎨 UI Features (Comic Style)

The interface features a fun, comic book-inspired design:
- **Bold black borders** on all elements
- **Vibrant colors** (cyan, pink, green, yellow)
- **Drop shadows** for depth
- **Hover animations** for interactivity
- **Emoji icons** for visual appeal

---

## 🔍 Testing Your Documents

### Verify RAG is Working:

1. **Upload a test document** with status "Published"
2. **Wait for processing** (check status in Document Library)
3. **Open the chatbot**
4. **Ask a specific question** about content in your document
5. **Verify the AI response** includes information from your document

### Example Test:
- Upload: "Company Holiday Schedule 2024.pdf"
- Wait for: Status = "Completed"
- Ask: "When are the company holidays in 2024?"
- Expect: AI lists holidays from your document

---

## ❗ Troubleshooting

### Document Upload Failed
- **Check file size**: Must be under 10MB
- **Check file type**: Only PDF, Word, TXT supported
- **Check connection**: Ensure internet connection is stable

### Processing Failed
- **Click "Retry"** in document library
- **Check file content**: Ensure document contains readable text
- **Check logs**: Look at browser console for error details

### Chatbot Not Using Documents
- **Verify status**: Document must be "Published"
- **Check processing**: Status should be "Completed"
- **Test query**: Ask specific questions about document content

### Document Not Found
- **Check filters**: Make sure status filter includes your document
- **Try search**: Use search bar to find specific documents
- **Refresh page**: Sometimes a refresh helps

---

## 📱 Quick Access

| Feature | Location | Button |
|---------|----------|--------|
| Upload | Dashboard → Quick Actions | 📄 Upload Document |
| View All | Dashboard → Quick Actions | 📚 View Documents |
| Chatbot | Main navigation | 💬 Chat Icon |

---

## 🎓 Tips for Employees

When using the chatbot:
- **Be specific** in your questions
- **Use natural language** (ask like you'd ask a person)
- **Try different phrasings** if you don't get the answer you need
- **Provide context** when asking complex questions

Example good questions:
- ✅ "What's the process for requesting time off?"
- ✅ "How do I enroll in health insurance?"
- ✅ "What are the work-from-home guidelines?"

Example less optimal questions:
- ❌ "Policy" (too vague)
- ❌ "Help" (too general)
- ❌ "What?" (no context)

---

## 🎉 You're All Set!

Your document upload and RAG system is now fully operational. Start uploading your HR documents and let the AI chatbot help your employees find information quickly and easily!

**Need help?** Check the main implementation document: `DOCUMENT_UPLOAD_RAG_IMPLEMENTATION.md`
