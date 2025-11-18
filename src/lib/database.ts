import { supabase } from './supabase.ts';
import type { Database } from './database.types.ts';
import { logActivity } from './activities';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type MessageInsert = Database['public']['Tables']['messages']['Insert'];

// ==================== CONVERSATION OPERATIONS ====================

/**
 * Get all conversations for the current user, optionally filtered by organization
 */
export async function getUserConversations(userId: string, organizationId?: string | null) {
  let query = supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });

  if (error) throw error;
  return data as Conversation[];
}

/**
 * Create a new conversation with organization context
 */
export async function createConversation(userId: string, title: string = 'New Chat', organizationId?: string | null) {
  console.log('📝 Creating conversation...', { userId, title, organizationId });

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
    .select('id, email')
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

  // Validate organization if provided
  if (organizationId) {
    console.log('🔍 Validating user organization membership...');
    const { data: orgMembership, error: orgError } = await supabase
      .from('organization_users')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (orgError) {
      console.error('❌ Error checking organization membership:', orgError);
      throw new Error(`Failed to verify organization membership: ${orgError.message}`);
    }

    if (!orgMembership) {
      console.error('❌ User does not belong to organization:', organizationId);
      throw new Error('You do not have access to this organization. Please contact your administrator.');
    }

    console.log('✅ User organization membership verified');
  }

  // Now create the conversation
  console.log('📝 Inserting conversation record...');
  const conversationData: any = { user_id: userId, title };

  if (organizationId) {
    conversationData.organization_id = organizationId;
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert(conversationData)
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

  // Log activity if conversation has organization
  if (organizationId) {
    try {
      await logActivity(
        organizationId,
        userId,
        'conversation_started',
        'New conversation started',
        {}
      );
    } catch (activityError) {
      console.error('Error logging activity:', activityError);
      // Don't fail the conversation creation if activity logging fails
    }
  }

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
 * Uses upsert to create or return existing user (fallback if trigger didn't fire)
 */
export async function ensureUserExists(userId: string, email: string) {
  console.log('🔍 Ensuring user exists...', { userId, email });

  try {
    // Use upsert (insert with on_conflict do nothing) for atomic operation
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: email
      }, {
        onConflict: 'id',
        ignoreDuplicates: true
      })
      .select('id, email')
      .maybeSingle();

    if (error) {
      console.error('❌ Error upserting user:', {
        error,
        message: error.message,
        code: error.code,
        details: error.details
      });

      // If it's a unique constraint violation, the user exists - that's fine
      if (error.code === '23505') {
        console.log('⚠️ User already exists (concurrent creation), fetching user...');

        // Fetch the existing user
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('id, email')
          .eq('id', userId)
          .maybeSingle();

        if (fetchError) throw fetchError;
        console.log('✅ User fetched:', existingUser);
        return;
      }

      throw error;
    }

    console.log('✅ User ensured:', data || 'already existed');
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

// ==================== ORGANIZATION OPERATIONS ====================

/**
 * Search organizations by name with partial matching
 */
export async function searchOrganizations(searchQuery: string, limit: number = 10) {
  if (!searchQuery || searchQuery.trim().length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('organizations')
    .select('id, name')
    .ilike('name', `%${searchQuery.trim()}%`)
    .limit(limit);

  if (error) {
    console.error('Error searching organizations:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get organization by ID
 */
export async function getOrganizationById(organizationId: string) {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', organizationId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching organization:', error);
    throw error;
  }

  return data;
}

/**
 * Get user's primary (first) organization
 */
export async function getUserPrimaryOrganization(userId: string) {
  const { data, error } = await supabase
    .from('organization_users')
    .select('organization_id, organizations(id, name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user primary organization:', error);
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.organization_id,
    name: (data.organizations as any)?.name || 'Unknown Organization'
  };
}

/**
 * Get all organizations for a user
 */
export async function getUserOrganizations(userId: string) {
  const { data, error } = await supabase
    .from('organization_users')
    .select('organization_id, role, organizations(id, name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching user organizations:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map(membership => ({
    id: membership.organization_id,
    name: (membership.organizations as any)?.name || 'Unknown Organization',
    role: membership.role
  }));
}

/**
 * Create a new organization
 */
export async function createOrganization(name: string) {
  const { data, error } = await supabase
    .from('organizations')
    .insert({ name: name.trim() })
    .select('id, name')
    .single();

  if (error) {
    console.error('Error creating organization:', error);
    throw error;
  }

  return data;
}

/**
 * Add user to organization with specified role
 */
export async function addUserToOrganization(
  userId: string,
  organizationId: string,
  role: 'employee' | 'manager' | 'hr_admin' = 'employee'
) {
  const { data, error } = await supabase
    .from('organization_users')
    .insert({
      user_id: userId,
      organization_id: organizationId,
      role: role
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding user to organization:', error);
    throw error;
  }

  return data;
}
