import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  createConversation,
  getConversationMessages,
  createMessage,
  generateConversationTitle
} from '@/lib/database';
import type { Database } from '@/lib/database.types';

type Message = Database['public']['Tables']['messages']['Row'];

export function useConversation(userId: string | null, organizationId?: string | null) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureUserExists = useCallback(async (uid: string, email: string) => {
    try {
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', uid)
        .maybeSingle();

      if (checkError) {
        throw new Error(`Failed to check user: ${checkError.message}`);
      }

      if (!existingUser) {
        const { error: insertError } = await supabase
          .from('users')
          .insert({ id: uid, email });

        if (insertError) {
          throw new Error(`Failed to create user profile: ${insertError.message}`);
        }
      }
    } catch (err) {
      console.error('Error ensuring user exists:', err);
      throw err;
    }
  }, []);

  const loadConversation = useCallback(async (uid: string, orgId?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        await ensureUserExists(uid, session.session.user.email || '');
      }

      let conversationQuery = supabase
        .from('conversations')
        .select('*')
        .eq('user_id', uid);

      if (orgId) {
        conversationQuery = conversationQuery.eq('organization_id', orgId);
      }

      const { data: conversations, error: conversationError } = await conversationQuery
        .order('updated_at', { ascending: false })
        .limit(1);

      if (conversationError) {
        throw new Error(`Failed to load conversations: ${conversationError.message}`);
      }

      let convId: string;

      if (conversations && conversations.length > 0) {
        convId = conversations[0].id;
      } else {
        const newConversation = await createConversation(uid, 'New Chat', orgId || undefined);
        convId = newConversation.id;
      }

      setConversationId(convId);

      const msgs = await getConversationMessages(convId);
      setMessages(msgs);
    } catch (err) {
      console.error('Error loading conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  }, [ensureUserExists]);

  const addMessage = useCallback(async (role: 'user' | 'assistant', content: string) => {
    if (!conversationId) {
      throw new Error('No active conversation');
    }

    try {
      const message = await createMessage({
        conversation_id: conversationId,
        role,
        content
      });

      setMessages(prev => [...prev, message]);

      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      return message;
    } catch (err) {
      console.error('Error adding message:', err);
      throw new Error('Failed to save message');
    }
  }, [conversationId]);

  const updateTitle = useCallback(async (firstMessage: string) => {
    if (!conversationId) return;

    try {
      const title = generateConversationTitle(firstMessage);
      await supabase
        .from('conversations')
        .update({ title })
        .eq('id', conversationId);
    } catch (err) {
      console.error('Error updating conversation title:', err);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    if (userId) {
      loadConversation(userId, organizationId || undefined);
    }
  }, [userId, organizationId, loadConversation]);

  return {
    conversationId,
    messages,
    isLoading,
    error,
    addMessage,
    updateTitle,
    setError
  };
}
