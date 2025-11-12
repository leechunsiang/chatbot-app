# Enable/Disable Documents for RAG Feature

This feature allows you to temporarily disable published documents from being considered in RAG (Retrieval-Augmented Generation) searches without unpublishing them.

## What's New

- **Toggle Control**: A power button icon next to each published document
- **Visual Indicators**: 
  - Green power icon = Document is enabled for RAG
  - Gray power-off icon = Document is disabled for RAG
- **Database Column**: New `is_enabled` boolean column in `policy_documents` table
- **Smart Filtering**: RAG search only considers published AND enabled documents

## Setup Instructions

### Step 1: Run the Database Migration

1. Go to your **Supabase Dashboard** → **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Copy and paste the contents of this file:
   ```
   supabase/migrations/20251112_add_document_enabled_flag.sql
   ```
4. Click **"Run"** or press `Ctrl+Enter`
5. Wait for "Success. No rows returned" message

### What the Migration Does:

1. ✅ Adds `is_enabled` column to `policy_documents` table (defaults to `true`)
2. ✅ Sets all existing documents to `enabled = true`
3. ✅ Updates `match_document_chunks()` function to filter by `is_enabled`
4. ✅ Updates Row Level Security policy to respect the enabled flag
5. ✅ Creates index for better query performance

## How to Use

### Disabling a Document

1. Go to **HR Dashboard** → **Policy Documents**
2. Find a published document you want to disable
3. Click the **green power icon** (🔋) next to the document
4. Confirm the action in the dialog
5. The icon will change to **gray power-off** (🔌) indicating it's disabled

**Result**: The document will no longer be used in chatbot responses, but remains published and visible in the document list.

### Enabling a Document

1. Find a disabled document (gray power-off icon)
2. Click the **gray power-off icon** (🔌)
3. Confirm the action in the dialog
4. The icon will change to **green power** (🔋) indicating it's enabled

**Result**: The document will now be included in RAG searches and chatbot responses.

## Use Cases

### When to Disable Documents:

- **Outdated Information**: Document contains information that's being updated
- **Testing**: Testing chatbot responses without certain documents
- **Seasonal Policies**: Temporarily disable policies that aren't currently relevant
- **Quality Control**: Document has errors but you want to keep it published for reference
- **Maintenance**: During policy review periods

### When to Keep Enabled:

- **Active Policies**: Currently relevant and accurate documents
- **Core Documentation**: Essential information that should always be available
- **Verified Content**: Documents that have been reviewed and approved

## Technical Details

### Database Schema

```sql
-- New column in policy_documents table
is_enabled BOOLEAN DEFAULT true
```

### RAG Search Logic

Documents are included in RAG searches only if:
1. `status = 'published'`
2. `is_enabled = true`
3. `processing_status = 'completed'` (for PDFs)

### API Function

```typescript
// Toggle document enabled status
await toggleDocumentEnabled(documentId, isEnabled);
```

## Troubleshooting

### Document Not Appearing in RAG

**Check:**
1. ✅ Document status is "Published"
2. ✅ Document is enabled (green power icon)
3. ✅ Processing status is "Completed" (for PDFs)
4. ✅ Document has embeddings in the database

**Fix:**
- If disabled: Click the power-off icon to enable
- If failed processing: Click the refresh icon to reprocess
- If no embeddings: Check RAG Diagnostics for more info

### Toggle Button Not Working

**Check:**
1. ✅ Migration has been run successfully
2. ✅ You have HR Admin role
3. ✅ Browser console for errors

**Fix:**
- Run the migration SQL script in Supabase SQL Editor
- Refresh the page after running migration
- Check browser console for detailed error messages

### All Documents Showing as Disabled

**Check:**
1. ✅ Migration was run completely
2. ✅ Database column default is set correctly

**Fix:**
Run this SQL to enable all documents:
```sql
UPDATE policy_documents 
SET is_enabled = true 
WHERE is_enabled IS NULL OR is_enabled = false;
```

## Benefits

1. **Non-Destructive**: Keep documents published while controlling RAG behavior
2. **Quick Toggle**: Enable/disable with a single click
3. **Visual Feedback**: Clear indicators of document status
4. **Flexible Control**: Manage which documents influence chatbot responses
5. **Maintains History**: Documents stay in the system for reference

## Migration Files

- **Primary Migration**: `supabase/migrations/20251112_add_document_enabled_flag.sql`
- **Updated Files**:
  - `src/lib/documents.ts` - Added `toggleDocumentEnabled()` function
  - `src/components/dashboard/DocumentManagement.tsx` - Added toggle UI
  - `src/lib/database.types.ts` - Added `is_enabled` field to interface

## Testing

After setup, test the feature:

1. Enable RAG Diagnostics to see document counts
2. Disable a published document
3. Run a test search (RAG Diagnostics → Test Search)
4. Verify the disabled document's chunks are not returned
5. Re-enable the document
6. Run test search again to confirm it's included

---

**Note**: This feature only affects published documents. Draft and archived documents are already excluded from RAG searches.
