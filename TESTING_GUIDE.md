# Testing Guide: Document Upload & RAG System

## 🧪 Test Scenarios

### Test 1: Upload PDF Document ✅

**Steps:**
1. Go to Dashboard
2. Click "📄 Upload Document"
3. Select a PDF file (e.g., "Employee_Handbook.pdf")
4. Fill in:
   - Title: "Employee Handbook 2024"
   - Description: "Complete guide for all employees"
   - Category: "HR Policies"
   - Status: "Published"
5. Click "Upload Document"

**Expected Result:**
- Progress bar shows upload progress
- Success toast appears
- Modal closes
- Activity feed shows "Document uploaded"

---

### Test 2: Upload Word Document (.docx) ✅

**Steps:**
1. Click "📄 Upload Document"
2. Select a DOCX file (e.g., "Benefits_Guide.docx")
3. Fill in details and set status to "Published"
4. Upload

**Expected Result:**
- Upload succeeds
- Document appears in library
- Processing status: "processing" → "completed"
- Text extracted successfully

---

### Test 3: Upload TXT Document ✅

**Steps:**
1. Click "📄 Upload Document"
2. Select a TXT file (e.g., "FAQ.txt")
3. Fill in details and set status to "Published"
4. Upload

**Expected Result:**
- Upload succeeds
- Processing completes quickly (TXT is simplest)
- Status changes to "completed"

---

### Test 4: File Validation ✅

**Test 4a: Invalid File Type**
1. Try to upload a .jpg image file
2. **Expected**: Error message "Invalid file type. Please upload PDF, Word (DOC/DOCX), or TXT files only."

**Test 4b: File Too Large**
1. Try to upload a file > 10MB
2. **Expected**: Error message "File size exceeds 10MB limit."

---

### Test 5: View Documents Library ✅

**Steps:**
1. Click "📚 View Documents"
2. Browse uploaded documents

**Expected Result:**
- All documents displayed in list
- Each shows: icon, title, description, size, category, date
- Status badges visible (published/draft)
- Processing status visible (completed/processing/failed)

---

### Test 6: Search Documents ✅

**Steps:**
1. Open Documents Library
2. Type in search box (e.g., "handbook")

**Expected Result:**
- List filters to show only matching documents
- Searches title, description, and category
- Updates in real-time as you type

---

### Test 7: Filter by Status ✅

**Steps:**
1. Open Documents Library
2. Click "Published" filter button

**Expected Result:**
- Only published documents shown
- Button highlighted with cyan background
- Other status buttons remain gray

---

### Test 8: Download Document ✅

**Steps:**
1. Open Documents Library
2. Click "📥 Download" on any document

**Expected Result:**
- Document opens in new browser tab
- File downloads or displays (depending on browser settings)

---

### Test 9: Delete Document ✅

**Steps:**
1. Open Documents Library
2. Click "🗑️ Delete" on a document
3. Confirm deletion in modal

**Expected Result:**
- Confirmation modal appears
- After confirming, document removed from list
- File deleted from storage
- Database record removed

---

### Test 10: RAG - Ask Question About Uploaded Document ✅

**Prerequisites:**
- Have a document uploaded with status "Published"
- Processing status is "completed"
- Document contains specific information (e.g., "15 vacation days")

**Steps:**
1. Go to chatbot interface
2. Ask a specific question about the document
   - Example: "How many vacation days do employees get?"

**Expected Result:**
- Chatbot responds with information from your document
- Answer is accurate and relevant
- Response includes context from the document

---

### Test 11: Draft Document Not Used by RAG ✅

**Steps:**
1. Upload a document with status "Draft"
2. Ask chatbot about content in that document

**Expected Result:**
- Chatbot doesn't have access to draft document
- Only published documents are used
- May respond "I don't have that information" or similar

---

### Test 12: Reprocess Failed Document ✅

**Simulate Failure:**
1. Upload a corrupted/empty PDF (if possible)
2. Processing fails, status shows "failed"

**Steps:**
1. Open Documents Library
2. Find document with "failed" status
3. Click "🔄 Retry" button

**Expected Result:**
- Processing status changes to "processing"
- System attempts to reprocess document
- Either succeeds or fails again with error message

---

### Test 13: Multiple File Types in Same Query ✅

**Steps:**
1. Upload PDF about "Vacation Policy"
2. Upload DOCX about "Sick Leave"
3. Upload TXT about "Remote Work"
4. Wait for all to process
5. Ask: "What are the time-off policies?"

**Expected Result:**
- Chatbot searches across all document types
- Finds relevant chunks from multiple documents
- Provides comprehensive answer combining information

---

### Test 14: Empty State ✅

**Steps:**
1. Delete all documents (or use fresh database)
2. Open Documents Library

**Expected Result:**
- Shows empty state with message "No documents found"
- Shows "Upload Your First Document" button
- Clicking button opens upload modal

---

### Test 15: Comic Styling Consistency ✅

**Visual Check:**
- Upload modal has bold black borders ✅
- Buttons have shadow effects ✅
- Hover animations work (translate + shadow increase) ✅
- Colors match dashboard (cyan, pink, green, yellow) ✅
- Fonts are bold/black weight ✅
- Emoji icons present ✅

---

## 🎯 RAG Quality Tests

### Test A: Exact Match Query

**Upload:** Document containing "Employees receive 15 vacation days per year"
**Query:** "How many vacation days do I get?"
**Expected:** Response mentions "15 days" or "15 vacation days"

---

### Test B: Semantic Match Query

**Upload:** Document about "health insurance benefits"
**Query:** "What medical coverage do we have?"
**Expected:** Response about health insurance (semantic understanding)

---

### Test C: Multi-Document Query

**Upload:** 
- Doc 1: Vacation policy
- Doc 2: Sick leave policy
- Doc 3: Personal days policy

**Query:** "What types of time off are available?"
**Expected:** Response combines information from all three documents

---

### Test D: No Match Query

**Upload:** Only HR policies
**Query:** "What's the weather forecast?"
**Expected:** Chatbot says it doesn't have that information or stays focused on HR topics

---

## 📊 Performance Tests

### Test P1: Upload Speed
- Small file (100KB): Should complete in < 5 seconds
- Medium file (1MB): Should complete in < 15 seconds
- Large file (10MB): Should complete in < 60 seconds

### Test P2: Processing Speed
- TXT file: < 10 seconds
- DOCX file: < 30 seconds
- PDF file: < 60 seconds (depends on pages)

### Test P3: Search Speed
- Document library search: Instant filtering
- RAG search query: < 3 seconds response time

---

## 🐛 Edge Cases

### Edge Case 1: Special Characters in Filename
**Test:** Upload file named "Policy & Benefits (2024).pdf"
**Expected:** Upload succeeds, special characters handled

### Edge Case 2: Very Long Title
**Test:** Enter 200+ character title
**Expected:** Title accepted and displayed properly

### Edge Case 3: No Description or Category
**Test:** Upload with only title filled
**Expected:** Upload succeeds, optional fields remain null

### Edge Case 4: Upload Same File Twice
**Test:** Upload same file twice
**Expected:** Both uploads succeed with unique file paths

### Edge Case 5: Network Interruption
**Test:** Start upload, disconnect internet
**Expected:** Error message shown, can retry

---

## ✅ Checklist for Complete Testing

### Upload Functionality:
- [ ] PDF upload works
- [ ] DOCX upload works
- [ ] DOC upload works
- [ ] TXT upload works
- [ ] Invalid file type rejected
- [ ] Oversized file rejected
- [ ] Drag & drop works
- [ ] Browse file selection works
- [ ] Progress bar shows
- [ ] Success message appears

### Document Library:
- [ ] Documents list displays
- [ ] Search works
- [ ] Status filters work
- [ ] Download works
- [ ] Delete works (with confirmation)
- [ ] Retry works for failed documents
- [ ] Empty state shows when no documents
- [ ] Status badges display correctly

### RAG Functionality:
- [ ] Published documents processed
- [ ] Draft documents not processed
- [ ] Chatbot finds relevant information
- [ ] Multi-document queries work
- [ ] Semantic search works (not just keyword)
- [ ] Processing status tracked correctly
- [ ] Failed processing can be retried

### UI/UX:
- [ ] Comic styling consistent
- [ ] Buttons have hover effects
- [ ] Modals open/close correctly
- [ ] Forms validate properly
- [ ] Error messages clear
- [ ] Success feedback provided
- [ ] Loading states show
- [ ] Responsive on different screen sizes

### Integration:
- [ ] Activity log shows uploads
- [ ] Toast notifications work
- [ ] State management correct
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Navigation works smoothly

---

## 🎓 Test Data Suggestions

Create test documents with known content:

### Sample 1: Vacation Policy (PDF)
```
Vacation Policy
Employees receive 15 vacation days per year.
Vacation must be requested 2 weeks in advance.
Unused vacation days roll over up to 5 days.
```

### Sample 2: Benefits Guide (DOCX)
```
Benefits Guide 2024
Health Insurance: PPO and HMO plans available
Dental Coverage: 100% preventive care
Vision: Annual eye exam covered
401k: 5% company match
```

### Sample 3: FAQ (TXT)
```
Q: What are the office hours?
A: 9 AM to 5 PM, Monday to Friday

Q: Is remote work allowed?
A: Yes, 2 days per week after 90 days

Q: How do I submit expenses?
A: Use the expense portal within 30 days
```

---

## 📝 Testing Notes Template

Use this template when testing:

```
Test Date: _____________
Tester: _____________

Test Case: _____________
Steps Taken:
1. 
2.
3.

Expected Result:


Actual Result:


Status: [ ] Pass  [ ] Fail

Issues Found:


Screenshots: (if applicable)
```

---

## 🚀 Ready to Test!

Work through each test scenario systematically. Document any issues found. Most importantly, have fun with the comic-styled interface! 🎨

**Pro Tip:** Test with real documents you'll use in production to ensure the RAG system works with your actual content.
