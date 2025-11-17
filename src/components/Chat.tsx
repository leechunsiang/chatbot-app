import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, AlertCircle, MessageSquarePlus, MessageSquare, LogOut, Trash2, LayoutDashboard, MoreVertical, Edit2 } from 'lucide-react';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';
import { createConversation, createMessage, getConversationMessages, generateConversationTitle, getUserConversations, deleteConversation } from '@/lib/database';
import { searchDocumentChunks, buildContextFromChunks } from '@/lib/rag';
import { generateSmartSuggestions, saveSuggestionsToDatabase, incrementSuggestionClick, type Suggestion } from '@/lib/suggestions';
import { SuggestionsPanel } from './SuggestionsPanel';
import { Sidebar, SidebarBody } from '@/components/ui/sidebar';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  suggestions?: {
    relatedQuestions: Suggestion[];
    categories: Suggestion[];
    followUpTopics: Suggestion[];
    actionButtons: Suggestion[];
  };
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface ChatProps {
  onNavigateToDashboard?: () => void;
}

export function Chat({ onNavigateToDashboard }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Initialize OpenAI client with direct API key
  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
    dangerouslyAllowBrowser: true // Only for demo purposes
  });

  // Check authentication and load conversation
  useEffect(() => {
    const initializeChat = async () => {
      try {
        console.log('💬 Initializing chat...');
        setError(null);

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          setError('Authentication error. Please try refreshing the page.');
          return;
        }

        if (!session?.user) {
          console.warn('⚠️ No authenticated user found');
          setError('Not authenticated. Please sign in.');
          return;
        }

        console.log('✅ Chat session loaded for user:', session.user.id);
        setUserId(session.user.id);

        // Get user's current organization
        try {
          const { data: orgData } = await supabase
            .from('organization_users')
            .select('organization_id')
            .eq('user_id', session.user.id)
            .single();
          
          if (orgData?.organization_id) {
            setOrganizationId(orgData.organization_id);
            console.log('✅ User organization:', orgData.organization_id);
          }
        } catch (orgErr) {
          console.warn('⚠️ Could not load user organization:', orgErr);
        }

        // Try to ensure user exists, but don't fail if table doesn't exist
        try {
          await ensureUserExists(session.user.id, session.user.email || '');
          console.log('✅ User exists in database');
        } catch (userErr) {
          console.warn('⚠️ Could not ensure user exists:', userErr);
          // Continue anyway - user can still chat
        }

        // Try to load conversations
        try {
          await loadConversations(session.user.id);

          const { data: conversations, error: conversationError } = await supabase
            .from('conversations')
            .select('*')
            .eq('user_id', session.user.id)
            .order('updated_at', { ascending: false })
            .limit(1);

          if (conversationError) {
            console.error('❌ Could not load conversations:', conversationError);
            // Create a new conversation instead
            const newConversation = await createConversation(session.user.id, 'New Chat');
            setConversationId(newConversation.id);
            await loadConversations(session.user.id);
            console.log('✅ Created new conversation:', newConversation.id);
          } else if (conversations && conversations.length > 0) {
            setConversationId(conversations[0].id);
            await loadMessages(conversations[0].id);
            console.log('✅ Loaded existing conversation:', conversations[0].id);
          } else {
            const newConversation = await createConversation(session.user.id, 'New Chat');
            setConversationId(newConversation.id);
            await loadConversations(session.user.id);
            console.log('✅ Created new conversation:', newConversation.id);
          }
        } catch (convErr) {
          console.error('❌ Could not initialize conversations:', convErr);
          const errorMessage = convErr instanceof Error ? convErr.message : 'Unknown error';
          setError(`Database error: ${errorMessage}. Please check console for details.`);
        }
      } catch (err) {
        console.error('❌ Chat initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize chat');
      }
    };

    initializeChat();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    if (!openMenuId) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isMenuButton = target.closest('[data-menu-button]');
      const isMenuContent = target.closest('[data-menu-content]');
      
      if (!isMenuButton && !isMenuContent) {
        setOpenMenuId(null);
      }
    };

    // Add listener after a delay
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuId]);

  const toggleMenu = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpenMenuId(prev => prev === conversationId ? null : conversationId);
  };

  const loadConversations = async (uid: string) => {
    try {
      const convos = await getUserConversations(uid);
      setConversations(convos);
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  };

  const handleNewChat = async () => {
    if (!userId) return;
    
    try {
      const newConversation = await createConversation(userId, 'New Chat');
      setConversationId(newConversation.id);
      setMessages([]);
      await loadConversations(userId);
    } catch (err) {
      console.error('Error creating new chat:', err);
      setError('Failed to create new chat');
    }
  };

  const handleSelectConversation = async (convId: string) => {
    setConversationId(convId);
    await loadMessages(convId);
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!userId) return;
    
    try {
      await deleteConversation(convId);
      await loadConversations(userId);
      
      if (convId === conversationId) {
        const remaining = conversations.filter(c => c.id !== convId);
        if (remaining.length > 0) {
          await handleSelectConversation(remaining[0].id);
        } else {
          await handleNewChat();
        }
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
      setError('Failed to delete conversation');
    }
  };

  const handleRenameConversation = async (convId: string, newTitle: string) => {
    if (!userId || !newTitle.trim()) return;
    
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ title: newTitle.trim() })
        .eq('id', convId);
      
      if (error) throw error;
      
      await loadConversations(userId);
      setEditingId(null);
      setEditingTitle('');
    } catch (err) {
      console.error('Error renaming conversation:', err);
      setError('Failed to rename conversation');
    }
  };

  const startRename = (convId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(convId);
    setEditingTitle(currentTitle);
    setOpenMenuId(null);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.reload();
    } catch (error) {
      console.error('Error signing out:', error);
      // Force reload anyway to clear state
      window.location.reload();
    }
  };

  const ensureUserExists = async (uid: string, email: string) => {
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
  };

  const loadMessages = async (convId: string) => {
    try {
      const messages = await getConversationMessages(convId);
      setMessages(messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        id: msg.id
      })));
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    }
  };

  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!conversationId) {
      throw new Error('No active conversation');
    }

    try {
      const message = await createMessage({
        conversation_id: conversationId,
        role,
        content
      });

      await updateConversationTimestamp();

      return message;
    } catch (err) {
      console.error('Error saving message:', err);
      throw new Error('Failed to save message to database');
    }
  };

  const updateConversationTimestamp = async () => {
    if (!conversationId) return;

    try {
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
      
      if (userId) {
        await loadConversations(userId);
      }
    } catch (err) {
      console.error('Error updating conversation timestamp:', err);
    }
  };

  const updateConversationTitleFromFirstMessage = async (firstMessage: string) => {
    if (!conversationId) return;

    try {
      const title = generateConversationTitle(firstMessage);
      await supabase
        .from('conversations')
        .update({ title })
        .eq('id', conversationId);
      
      if (userId) {
        await loadConversations(userId);
      }
    } catch (err) {
      console.error('Error updating conversation title:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
          const newMessage = payload.new as any;
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (exists) return prev;
            return [...prev, {
              role: newMessage.role as 'user' | 'assistant',
              content: newMessage.content,
              id: newMessage.id
            }];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) {
      return;
    }

    if (isLoading) {
      return;
    }

    if (!userId) {
      setError('Please wait for authentication to complete.');
      return;
    }

    if (!conversationId) {
      setError('Please wait for conversation to load, or try refreshing the page.');
      return;
    }

    console.log('📤 Sending message...', { conversationId, userId, messageLength: input.length });

    const userMessageContent = input;
    const userMessage: Message = { role: 'user', content: userMessageContent };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const isFirstMessage = messages.length === 0;

      await saveMessage('user', userMessageContent);

      if (isFirstMessage) {
        await updateConversationTitleFromFirstMessage(userMessageContent);
      }

      // Search for relevant document chunks from user's organization
      let context = '';
      try {
        console.log('🔍 Searching for relevant policy documents...');
        const relevantChunks = await searchDocumentChunks(
          userMessageContent, 
          0.5, 
          5,
          organizationId || undefined
        );

        if (relevantChunks.length > 0) {
          context = buildContextFromChunks(relevantChunks);
          console.log(`✅ Found ${relevantChunks.length} relevant document chunks`);
          console.log('📚 Document chunks will be used to answer the question');
        } else {
          console.log('ℹ️ No relevant documents found');
          console.log('💡 Tip: Make sure documents are uploaded, published, and processed successfully');
        }
      } catch (ragError) {
        console.error('⚠️ Error searching documents:', ragError);
        // Continue without context if RAG fails
      }

      // Build messages array with system prompt and context
      const systemPrompt = context
        ? `You are a helpful HR assistant that answers questions about company policies and benefits. 
           
You should:
- Focus on HR-related topics like policies, benefits, leave, compensation, etc.
- Use the provided policy documents to answer questions accurately
- If a question is outside the scope of HR/policies/benefits, politely redirect the conversation
- Be professional, clear, and helpful

Here are the relevant policy documents for context:

${context}

Base your answers on these documents when relevant.`
        : `You are a helpful HR assistant that answers questions about company policies and benefits.

You should:
- Focus on HR-related topics like policies, benefits, leave, compensation, etc.
- Let users know when you don't have specific policy information available
- If a question is outside the scope of HR/policies/benefits, politely redirect the conversation
- Be professional, clear, and helpful

Note: Currently, no policy documents are available. Encourage users to check with their HR department for specific policy information.`;

      const messagesForAPI = [
        { role: 'system' as const, content: systemPrompt },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user' as const, content: userMessageContent }
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messagesForAPI,
        temperature: 0.7,
        max_tokens: 1000,
      });

      const assistantContent = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent
      };

      setMessages(prev => [...prev, assistantMessage]);

      const savedMessage = await saveMessage('assistant', assistantContent);

      if (savedMessage && savedMessage.id && conversationId) {
        setIsGeneratingSuggestions(true);
        try {
          const conversationHistory = [...messages, { role: 'user', content: userMessageContent }].map(m => ({
            role: m.role,
            content: m.content
          }));

          const suggestions = await generateSmartSuggestions(conversationHistory, assistantContent);
          await saveSuggestionsToDatabase(conversationId, savedMessage.id, suggestions);

          const groupedSuggestions = {
            relatedQuestions: suggestions.relatedQuestions.map((text, index) => ({
              suggestion_text: text,
              suggestion_type: 'related_question' as const,
              display_order: index,
              conversation_id: conversationId,
              message_id: savedMessage.id,
            })),
            categories: [],
            followUpTopics: suggestions.followUpTopics.map((text, index) => ({
              suggestion_text: text,
              suggestion_type: 'follow_up' as const,
              display_order: index,
              conversation_id: conversationId,
              message_id: savedMessage.id,
            })),
            actionButtons: [],
          };

          setMessages(prev => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
              updated[lastIndex] = {
                ...updated[lastIndex],
                suggestions: groupedSuggestions
              };
            }
            return updated;
          });
        } catch (suggestionError) {
          console.error('Error generating suggestions:', suggestionError);
        } finally {
          setIsGeneratingSuggestions(false);
        }
      }
    } catch (error) {
      console.error('Error in sendMessage:', error);

      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';

      let errorContent = 'Sorry, there was an error processing your request.';
      if (errorMsg.includes('OpenAI') || errorMsg.includes('API key')) {
        errorContent = 'OpenAI API error. Please check your API key in the .env file.';
      } else if (errorMsg.includes('database') || errorMsg.includes('save')) {
        errorContent = 'Database error. Your message may not have been saved.';
      }

      const errorMessage: Message = {
        role: 'assistant',
        content: errorContent
      };
      setMessages(prev => [...prev, errorMessage]);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = async (suggestion: Suggestion) => {
    if (suggestion.id) {
      await incrementSuggestionClick(suggestion.id);
    }

    setInput(suggestion.suggestion_text);

    setTimeout(() => {
      const form = document.querySelector('form') as HTMLFormElement;
      if (form) {
        form.requestSubmit();
      }
    }, 100);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[hsl(var(--background))] rounded-3xl">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-6 bg-[hsl(var(--sidebar-bg))]">
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Logo/Title */}
            <div className="flex items-center gap-3 mb-6 pt-4">
              <motion.div
                initial={false}
                animate={{
                  opacity: open ? 1 : 0,
                  scale: open ? 1 : 0,
                }}
                transition={{
                  duration: 0.2,
                  ease: "easeInOut",
                }}
              >
                <Bot className="w-7 h-7 text-primary flex-shrink-0" />
              </motion.div>
              <motion.span
                initial={false}
                animate={{
                  opacity: open ? 1 : 0,
                  width: open ? "auto" : 0,
                }}
                transition={{
                  duration: 0.2,
                  ease: "easeInOut",
                }}
                className="text-xl font-semibold tracking-tight whitespace-nowrap overflow-hidden"
              >
                Policy & Benefits Chatbot
              </motion.span>
            </div>

            {/* New Chat Button */}
            <Button
              onClick={handleNewChat}
              className="w-full mb-6 justify-center gap-3 h-11 font-medium !rounded-xl !border-[3px] !border-black dark:!border-white !shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:!shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:!shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:hover:!shadow-[5px_5px_0px_0px_rgba(255,255,255,1)] hover:!-translate-x-[2px] hover:!-translate-y-[2px] active:!shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:active:!shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:!translate-x-[1px] active:!translate-y-[1px] !transition-all !duration-150 bg-primary text-primary-foreground"
              variant="outline"
              style={{ justifyContent: open ? 'flex-start' : 'center' }}
            >
              <MessageSquarePlus className="w-5 h-5 flex-shrink-0" />
              <motion.span
                initial={false}
                animate={{
                  opacity: open ? 1 : 0,
                  width: open ? "auto" : 0,
                }}
                transition={{
                  duration: 0.2,
                  ease: "easeInOut",
                }}
                className="whitespace-nowrap overflow-hidden"
              >
                New Chat
              </motion.span>
            </Button>

            {/* Conversations List */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <motion.div
                initial={false}
                animate={{
                  opacity: open ? 1 : 0,
                  height: open ? "auto" : 0,
                }}
                transition={{
                  duration: 0.2,
                  ease: "easeInOut",
                }}
                className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider overflow-hidden"
              >
                Recent Conversations
              </motion.div>
              <ScrollArea className="flex-1">
                <div className="space-y-1 pr-2">
                  {conversations.map((conversation) => {
                    const isOpen = openMenuId === conversation.id;
                    
                    return (
                      <div
                        key={conversation.id}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                          conversationId === conversation.id 
                            ? "bg-accent/80 border-[3px] border-black dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]" 
                            : "hover:bg-accent/40"
                        )}
                        style={{ justifyContent: open ? 'flex-start' : 'center' }}
                      >
                        <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-70" />
                        
                        {editingId === conversation.id && open ? (
                          <motion.div
                            initial={false}
                            animate={{ opacity: 1, width: "auto" }}
                            className="flex-1 min-w-0 flex items-center gap-2"
                          >
                            <Input
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleRenameConversation(conversation.id, editingTitle);
                                } else if (e.key === 'Escape') {
                                  setEditingId(null);
                                  setEditingTitle('');
                                }
                              }}
                              onBlur={() => {
                                if (editingTitle.trim()) {
                                  handleRenameConversation(conversation.id, editingTitle);
                                } else {
                                  setEditingId(null);
                                  setEditingTitle('');
                                }
                              }}
                              autoFocus
                              className="h-7 text-sm"
                            />
                          </motion.div>
                        ) : (
                          <>
                            <motion.div
                              initial={false}
                              animate={{
                                opacity: open ? 1 : 0,
                                width: open ? "auto" : 0,
                              }}
                              transition={{
                                duration: 0.2,
                                ease: "easeInOut",
                              }}
                              className="flex-1 min-w-0 overflow-hidden cursor-pointer flex items-center justify-between gap-2"
                              onClick={() => handleSelectConversation(conversation.id)}
                            >
                              <span className="text-sm font-medium truncate leading-relaxed">
                                {conversation.title}
                              </span>
                              
                              {open && (
                                <div className="relative flex-shrink-0">
                                  <button
                                    data-menu-button
                                    onClick={(e) => toggleMenu(conversation.id, e)}
                                    className="opacity-60 hover:opacity-100 hover:bg-accent/60 transition-all p-1.5 rounded flex items-center justify-center"
                                    title="More options"
                                    type="button"
                                  >
                                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                  </button>
                                
                                  {isOpen && (
                                    <div 
                                      data-menu-content
                                      ref={(el) => { menuRefs.current[conversation.id] = el; }}
                                      className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 z-[100] min-w-[150px]"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        onClick={(e) => startRename(conversation.id, conversation.title, e)}
                                        className="w-full px-3 py-2 text-sm text-left hover:bg-accent flex items-center gap-2"
                                        type="button"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                        Rename
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          setOpenMenuId(null);
                                          handleDeleteConversation(conversation.id, e);
                                        }}
                                        className="w-full px-3 py-2 text-sm text-left hover:bg-accent flex items-center gap-2 text-destructive"
                                        type="button"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Dashboard Button (only for HR admins) */}
          {onNavigateToDashboard && (
            <Button
              onClick={onNavigateToDashboard}
              className="w-full justify-center gap-3 h-11 font-medium mb-2"
              variant="outline"
              style={{ justifyContent: open ? 'flex-start' : 'center' }}
            >
              <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
              <motion.span
                initial={false}
                animate={{
                  opacity: open ? 1 : 0,
                  width: open ? "auto" : 0,
                }}
                transition={{
                  duration: 0.2,
                  ease: "easeInOut",
                }}
                className="whitespace-nowrap overflow-hidden"
              >
                HR Dashboard
              </motion.span>
            </Button>
          )}

          {/* Sign Out Button */}
          <Button
            onClick={handleSignOut}
            className="w-full justify-center gap-3 h-11 font-medium"
            variant="outline"
            style={{ justifyContent: open ? 'flex-start' : 'center' }}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <motion.span
              initial={false}
              animate={{
                opacity: open ? 1 : 0,
                width: open ? "auto" : 0,
              }}
              transition={{
                duration: 0.2,
                ease: "easeInOut",
              }}
              className="whitespace-nowrap overflow-hidden"
            >
              Sign Out
            </motion.span>
          </Button>
        </SidebarBody>
      </Sidebar>

  {/* Main Chat Area */}
  <div className="flex flex-col h-full flex-1 overflow-hidden bg-[hsl(var(--chat-bg))] rounded-2xl">
        <div className="flex flex-col h-full max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-destructive font-semibold">Error</p>
                <p className="text-sm text-destructive/80 leading-relaxed">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-destructive hover:text-destructive/80 text-xl leading-none"
              >
                ×
              </button>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-center mb-6 sm:mb-8">
            <Bot className="w-8 h-8 sm:w-10 sm:h-10 mr-3 text-primary" />
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">Policy & Benefits Chatbot</h1>
          </div>

          {/* Messages Area */}
          <div className="flex-1 rounded-2xl overflow-hidden bg-transparent">
            <ScrollArea className="h-full rounded-2xl bg-transparent" ref={scrollAreaRef}>
              <div className="p-6 sm:p-8 space-y-6">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20 sm:py-32">
                    <Bot className="w-16 h-16 sm:w-20 sm:h-20 mb-6 opacity-50" />
                    <p className="text-lg sm:text-xl text-center px-4 font-medium leading-relaxed">
                      Beep boop! Benny's online and ready to chat
                    </p>
                    <p className="text-sm sm:text-base text-center px-4 mt-2 opacity-60">
                      Type a message below to begin
                    </p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div key={index} className="space-y-4">
                      <div
                        className={`flex gap-4 sm:gap-5 ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <div className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary/90 flex items-center justify-center shadow-md">
                            <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
                          </div>
                        )}
                        <div
                          className={`rounded-2xl px-5 py-3.5 sm:px-6 sm:py-4 max-w-[85%] sm:max-w-[75%] border-2 transition-transform duration-200 ${
                            message.role === 'user'
                              ? 'bg-[hsl(var(--message-user))] text-white border-blue-900/40 shadow-[6px_6px_0_rgba(15,23,42,0.9)]'
                              : 'bg-[hsl(var(--message-assistant))] text-foreground border-slate-900/10 dark:border-slate-700/50 shadow-[6px_6px_0_rgba(15,23,42,0.8)] dark:shadow-[6px_6px_0_rgba(15,23,42,0.8)]'
                          }`}
                        >
                          <p className="text-[15px] sm:text-base whitespace-pre-wrap break-words leading-relaxed">
                            {message.content}
                          </p>
                        </div>
                        {message.role === 'user' && (
                          <div className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-secondary/90 flex items-center justify-center shadow-md">
                            <User className="w-5 h-5 sm:w-6 sm:h-6 text-secondary-foreground" />
                          </div>
                        )}
                      </div>

                      {message.role === 'assistant' && message.suggestions && (
                        <div className="ml-14 sm:ml-16">
                          <SuggestionsPanel
                            suggestions={message.suggestions}
                            onSuggestionClick={handleSuggestionClick}
                            isLoading={false}
                          />
                        </div>
                      )}

                      {message.role === 'assistant' && index === messages.length - 1 && isGeneratingSuggestions && (
                        <div className="ml-14 sm:ml-16">
                          <SuggestionsPanel
                            suggestions={{
                              relatedQuestions: [],
                              categories: [],
                              followUpTopics: [],
                              actionButtons: [],
                            }}
                            onSuggestionClick={handleSuggestionClick}
                            isLoading={true}
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex gap-4 sm:gap-5 justify-start">
                    <div className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary/90 flex items-center justify-center shadow-md">
                      <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
                    </div>
                    <div className="rounded-2xl px-5 py-3.5 sm:px-6 sm:py-4 bg-[hsl(var(--message-assistant))] border-2 border-slate-900/10 dark:border-slate-700/50 shadow-[6px_6px_0_rgba(15,23,42,0.8)] dark:shadow-[6px_6px_0_rgba(15,23,42,0.8)]">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>

          {/* Input Area */}
          <form onSubmit={sendMessage} className="mt-6 sm:mt-8">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-border/40 bg-slate-100 dark:bg-slate-900 shadow-md hover:shadow-lg transition-all focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:border-primary/50">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!isLoading && input.trim() && userId && conversationId) {
                      const form = (e.currentTarget as HTMLInputElement).form;
                      if (form) {
                        form.requestSubmit();
                      }
                    }
                  }
                }}
                placeholder={
                  !userId
                    ? "Signing in..."
                    : !conversationId
                    ? "Loading conversation..."
                    : "Type your message..."
                }
                disabled={isLoading || !userId}
                className="flex-1 text-base h-10 sm:h-12 px-3 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim() || !conversationId || !userId}
                size="icon"
                variant="ghost"
                className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 hover:bg-transparent text-primary hover:text-primary/80 transition-colors"
                title={
                  !userId
                    ? 'Waiting for authentication'
                    : !conversationId
                    ? 'Preparing conversation...'
                    : !input.trim()
                    ? 'Enter a message first'
                    : 'Send message'
                }
              >
                <Send className="w-5 h-5 sm:w-6 sm:h-6" />
              </Button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-muted-foreground font-medium">
            Powered by GPT-4.1-nano via GitHub Models
          </div>
        </div>
      </div>
    </div>
  );
}
