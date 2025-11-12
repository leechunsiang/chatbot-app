import { supabase } from './supabase.ts';
import type { Database } from './database.types.ts';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type MessageInsert = Database['public']['Tables']['messages']['Insert'];

// ==================== CONVERSATION OPERATIONS ====================

/**
 * Get all conversations for the current user
 */
export async function getUserConversations(userId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as Conversation[];
}

/**
 * Create a new conversation
 */
export async function createConversation(userId: string, title: string = 'New Chat') {
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, title })
    .select()
    .single();

  if (error) throw error;
  return data as Conversation;
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(conversationId: string, title: string) {
  const { data, error } = await supabase
    .from('conversations')
    .update({ title })
    .eq('id', conversationId)
    .select()
    .single();

  if (error) throw error;
  return data as Conversation;
}

/**
 * Delete a conversation (cascades to messages)
 */
export async function deleteConversation(conversationId: string) {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId);

  if (error) throw error;
}

// ==================== MESSAGE OPERATIONS ====================

/**
 * Get all messages for a conversation
 */
export async function getConversationMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as Message[];
}

/**
 * Create a new message
 */
export async function createMessage(message: MessageInsert) {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single();

  if (error) throw error;
  return data as Message;
}

/**
 * Update message embedding
 */
export async function updateMessageEmbedding(messageId: string, embedding: number[]) {
  const { data, error } = await supabase
    .from('messages')
    .update({ embedding })
    .eq('id', messageId)
    .select()
    .single();

  if (error) throw error;
  return data as Message;
}

/**
 * Search messages by vector similarity
 */
export async function searchSimilarMessages(
  embedding: number[],
  threshold: number = 0.7,
  limit: number = 10
) {
  const { data, error } = await supabase
    .rpc('match_messages', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: limit
    });

  if (error) throw error;
  return data;
}

// ==================== USER OPERATIONS ====================

/**
 * Ensure user record exists in public.users table
 * Creates one if it doesn't exist (fallback if trigger didn't fire)
 */
export async function ensureUserExists(userId: string, email: string) {
  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingUser) {
      console.log('Creating user record for:', userId);
      const { error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: email,
          role: 'employee'
        });

      if (error) {
        console.error('Error creating user record:', error);
        throw error;
      }
      console.log('User record created successfully');
    }
  } catch (err) {
    console.error('Error ensuring user exists:', err);
    throw err;
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: { full_name?: string; avatar_url?: string }
) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==================== STORAGE OPERATIONS ====================

/**
 * Upload avatar image
 */
export async function uploadAvatar(userId: string, file: File) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/avatar.${fileExt}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, { upsert: true });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  return publicUrl;
}

/**
 * Upload file attachment
 */
export async function uploadAttachment(userId: string, file: File) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('attachments')
    .upload(fileName, file);

  if (error) throw error;

  return data.path;
}

/**
 * Get attachment URL (signed URL for private access)
 */
export async function getAttachmentUrl(path: string, expiresIn: number = 3600) {
  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

/**
 * Delete attachment
 */
export async function deleteAttachment(path: string) {
  const { error } = await supabase.storage
    .from('attachments')
    .remove([path]);

  if (error) throw error;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Generate a conversation title from the first user message
 */
export function generateConversationTitle(firstMessage: string): string {
  const maxLength = 50;
  const cleaned = firstMessage.trim().replace(/\s+/g, ' ');
  
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  
  return cleaned.substring(0, maxLength - 3) + '...';
}

/**
 * Format message for display
 */
export function formatMessage(message: Message) {
  return {
    id: message.id,
    role: message.role as 'user' | 'assistant' | 'system',
    content: message.content,
    createdAt: new Date(message.created_at)
  };
}
