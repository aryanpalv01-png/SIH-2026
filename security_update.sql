-- =============================================================================
-- VeriScan DevSecOps: Supabase Row-Level Security & Blind Indexing Migration
-- =============================================================================
-- Purpose:
-- 1. Enable strict Row-Level Security (RLS) on `documents` table to prevent cross-account data leakage.
-- 2. Establish "Blind Indexing" via `document_hash` (SHA-256 HMAC) so duplicate / forged documents
--    can be flagged across the platform without exposing plain document contents to global search.
-- =============================================================================

-- Step 1: Ensure documents table has user_id and document_hash columns
DO $$
BEGIN
    -- Add user_id column if not exists (using UUID or TEXT matching auth.uid())
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE documents ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- Add document_hash column for Blind Indexing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'document_hash'
    ) THEN
        ALTER TABLE documents ADD COLUMN document_hash TEXT UNIQUE;
    END IF;
END $$;

-- Step 2: Create fast index on document_hash for duplicate collision searches
CREATE INDEX IF NOT EXISTS idx_documents_document_hash ON documents(document_hash);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);

-- Step 3: Enable strict Row-Level Security (RLS)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop any existing permissive or conflicting policies on documents
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;

-- Step 5: Strict RLS Policies (auth.uid() enforcement)

-- SELECT: Only the owner of the document can view/retrieve their records
CREATE POLICY "Users can view own documents"
    ON documents
    FOR SELECT
    USING (
        auth.uid()::text = user_id::text
        OR auth.uid() = user_id
    );

-- INSERT: Only the authenticated user can upload/insert documents under their own user_id
CREATE POLICY "Users can insert own documents"
    ON documents
    FOR INSERT
    WITH CHECK (
        auth.uid()::text = user_id::text
        OR auth.uid() = user_id
    );

-- UPDATE: Only the document owner can update document records
CREATE POLICY "Users can update own documents"
    ON documents
    FOR UPDATE
    USING (
        auth.uid()::text = user_id::text
        OR auth.uid() = user_id
    )
    WITH CHECK (
        auth.uid()::text = user_id::text
        OR auth.uid() = user_id
    );

-- DELETE: Only the document owner can remove their documents
CREATE POLICY "Users can delete own documents"
    ON documents
    FOR DELETE
    USING (
        auth.uid()::text = user_id::text
        OR auth.uid() = user_id
    );

-- Step 6: Documentation Comment
COMMENT ON COLUMN documents.document_hash IS 'Blind index HMAC-SHA256 hash for global duplicate fraud detection without decrypting or exposing original files.';
