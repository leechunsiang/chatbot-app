/*
  # Add Smart Suggestions System

  1. New Tables
    - `smart_suggestions`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, foreign key to conversations)
      - `message_id` (uuid, foreign key to messages)
      - `suggestion_text` (text) - The actual suggestion content
      - `suggestion_type` (text) - Type: related_question, category, follow_up, action_button
      - `display_order` (integer) - Order in which to display suggestions
      - `clicked_count` (integer) - Track how many times this suggestion was clicked
      - `metadata` (jsonb) - Additional metadata for analytics
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Indexes
    - Index on conversation_id for fast lookups
    - Index on message_id for fast lookups
    - Index on suggestion_type for filtering
    - Index on clicked_count for analytics

  3. Security
    - Enable RLS on `smart_suggestions` table
    - Add policies for authenticated users to read their own suggestions
    - Add policies for authenticated users to create suggestions in their conversations
    - Add policies for authenticated users to update click counts
*/

-- Create smart_suggestions table
CREATE TABLE IF NOT EXISTS smart_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  suggestion_text TEXT NOT NULL,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('related_question', 'category', 'follow_up', 'action_button')),
  display_order INTEGER NOT NULL DEFAULT 0,
  clicked_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_smart_suggestions_conversation_id ON smart_suggestions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_smart_suggestions_message_id ON smart_suggestions(message_id);
CREATE INDEX IF NOT EXISTS idx_smart_suggestions_type ON smart_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_smart_suggestions_clicked ON smart_suggestions(clicked_count DESC);
CREATE INDEX IF NOT EXISTS idx_smart_suggestions_created_at ON smart_suggestions(created_at DESC);

-- Enable RLS
ALTER TABLE smart_suggestions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view suggestions from their own conversations
CREATE POLICY "Users can view their own conversation suggestions"
  ON smart_suggestions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = smart_suggestions.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Policy: Users can create suggestions in their own conversations
CREATE POLICY "Users can create suggestions in their conversations"
  ON smart_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = smart_suggestions.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Policy: Users can update suggestions in their own conversations (for click tracking)
CREATE POLICY "Users can update their own conversation suggestions"
  ON smart_suggestions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = smart_suggestions.conversation_id
      AND conversations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = smart_suggestions.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Policy: Users can delete suggestions in their own conversations
CREATE POLICY "Users can delete their own conversation suggestions"
  ON smart_suggestions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = smart_suggestions.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Add trigger for updated_at timestamp
CREATE TRIGGER set_smart_suggestions_updated_at
  BEFORE UPDATE ON smart_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create function to increment click count
CREATE OR REPLACE FUNCTION increment_suggestion_click(suggestion_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE smart_suggestions
  SET
    clicked_count = clicked_count + 1,
    updated_at = now()
  WHERE id = suggestion_id;
END;
$$;
