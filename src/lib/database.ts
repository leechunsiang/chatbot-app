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
  console.log('📝 Creating conversation...', { userId, title });

  // Get current auth session to verify authentication
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('❌ Session error:', sessionError);
    throw new Error('Authentication session error. Please log in again.');
  }

  if (!session) {
    console.error('❌ No active session');
    throw new Error('No active session. Please log in.');
  }

  console.log('✅ Active session confirmed for user:', session.user.id);

  if (session.user.id !== userId) {
    console.error('❌ Session user ID mismatch:', { sessionId: session.user.id, requestedId: userId });
    throw new Error('User ID mismatch. Please refresh the page.');
  }

  // Verify the user exists in the public.users table
  console.log('🔍 Verifying user record in database...');
  const { data: userExists, error: userCheckError } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('id', userId)
    .maybeSingle();

  if (userCheckError) {
    console.error('❌ Error checking user existence:', {
      error: userCheckError,
      message: userCheckError.message,
      details: userCheckError.details,
      hint: userCheckError.hint,
      code: userCheckError.code
    });
    throw new Error(`Failed to verify user: ${userCheckError.message}`);
  }

  if (!userExists) {
    console.error('❌ User does not exist in public.users table:', userId);
    console.log('🔄 Attempting to create user record...');

    // Try to create the user record
    try {
      await ensureUserExists(userId, session.user.email || '');
      console.log('✅ User record created, retrying user check...');

      // Verify the user was created
      const { data: newUserCheck } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!newUserCheck) {
        throw new Error('User record creation failed silently');
      }

      console.log('✅ User record verified after creation');
    } catch (createError) {
      console.error('❌ Failed to create user record:', createError);
      throw new Error('Could not create user record. Please try logging out and back in.');
    }
  } else {
    console.log('✅ User exists in database:', userExists);
  }

  // Now create the conversation
  console.log('📝 Inserting conversation record...');
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, title })
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating conversation:', {
      error,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      userId,
      title
    });

    // Provide more helpful error messages
    if (error.code === '23503') {
      throw new Error('User record issue (foreign key constraint). Please log out and back in.');
    }

    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  console.log('✅ Conversation created successfully:', data);
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
  console.log('🔍 Checking if user exists...', { userId, email });

  try {
    // First check if user exists
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', userId)
      .maybeSingle();

    if (selectError) {
      console.error('❌ Error checking user existence:', {
        error: selectError,
        message: selectError.message,
        code: selectError.code,
        details: selectError.details
      });
      throw selectError;
    }

    if (!existingUser) {
      console.log('📝 User not found, creating user record...', { userId, email });

      const { data: insertedUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: email,
          role: 'employee'
        })
        .select()
        .maybeSingle();

      if (insertError) {
        // Check if error is due to duplicate key (user was created by trigger or another process)
        if (insertError.code === '23505') {
          console.log('⚠️ User record already exists (created by another process), continuing...');
          return;
        }

        console.error('❌ Error creating user record:', {
          error: insertError,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        });
        throw insertError;
      }

      console.log('✅ User record created successfully:', insertedUser);

      // Wait a moment for the database to fully commit the transaction
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify the user was actually created
      const { data: verifyUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!verifyUser) {
        console.error('❌ User creation verification failed');
        throw new Error('User record was not found after creation');
      }

      console.log('✅ User creation verified');
    } else {
      console.log('✅ User already exists in database:', existingUser);
    }
  } catch (err) {
    console.error('❌ Error ensuring user exists:', err);
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
