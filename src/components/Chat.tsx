import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, AlertCircle, MessageSquarePlus, MessageSquare, LogOut, Trash2, LayoutDashboard } from 'lucide-react';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';
import { createConversation, createMessage, getConversationMessages, generateConversationTitle, getUserConversations, deleteConversation } from '@/lib/database';
import { Sidebar, SidebarBody } from '@/components/ui/sidebar';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
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
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [open, setOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        setIsInitializing(true);

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(`Authentication error: ${sessionError.message}`);
        }

        if (!session?.user) {
          throw new Error('No authenticated user found');
        }

        console.log('✅ Chat session loaded for user:', session.user.id);
        setUserId(session.user.id);

        // Try to ensure user exists, but don't fail if table doesn't exist
        try {
          await ensureUserExists(session.user.id, session.user.email || '');
          console.log('✅ User exists in database');
        } catch (userErr) {
          console.warn('⚠️ Could not ensure user exists (table may not exist):', userErr);
          // Continue anyway - user can still chat
        }

        // Try to load conversations, but don't fail if table doesn't exist
        try {
          await loadConversations(session.user.id);

          const { data: conversations, error: conversationError } = await supabase
            .from('conversations')
            .select('*')
            .eq('user_id', session.user.id)
            .order('updated_at', { ascending: false })
            .limit(1);

          if (conversationError) {
            console.warn('⚠️ Could not load conversations:', conversationError.message);
          } else if (conversations && conversations.length > 0) {
            setConversationId(conversations[0].id);
            await loadMessages(conversations[0].id);
            console.log('✅ Loaded existing conversation');
          } else {
            const newConversation = await createConversation(session.user.id, 'New Chat');
            setConversationId(newConversation.id);
            await loadConversations(session.user.id);
            console.log('✅ Created new conversation');
          }
        } catch (convErr) {
          console.warn('⚠️ Could not initialize conversations (table may not exist):', convErr);
          // Set error but allow chat to load anyway
          setError('Database not fully configured. Some features may be limited. Run migrations from SUPABASE_SETUP.md');
        }
      } catch (err) {
        console.error('❌ Chat initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize chat');
      } finally {
        console.log('✅ Chat initialization complete');
        setIsInitializing(false);
      }
    };

    // Add safety timeout
    const timeout = setTimeout(() => {
      console.warn('⚠️ Chat initialization timeout - forcing chat to load');
      setIsInitializing(false);
      setError('Chat initialization took too long. Some features may not work correctly.');
    }, 5000);

    initializeChat().finally(() => {
      clearTimeout(timeout);
    });
  }, []);

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
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

      return message.id;
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

    if (!input.trim() || isLoading || !conversationId || !userId) return;

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

      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-nano',
        messages: [...messages, userMessage].map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: 0.7,
        max_tokens: 1000,
      });

      const assistantContent = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent
      };

      setMessages(prev => [...prev, assistantMessage]);

      await saveMessage('assistant', assistantContent);
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

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Initializing chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[hsl(var(--background))]">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-6 bg-[hsl(var(--sidebar-bg))]">
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Logo/Title */}
            <div className="flex items-center gap-3 mb-6 pt-2">
              <Bot className="w-7 h-7 text-primary flex-shrink-0" />
              <motion.span
                animate={{
                  display: open ? "inline-block" : "none",
                  opacity: open ? 1 : 0,
                }}
                className="text-xl font-semibold tracking-tight whitespace-nowrap"
              >
                ChatGPT Clone
              </motion.span>
            </div>

            {/* New Chat Button */}
            <Button
              onClick={handleNewChat}
              className="w-full mb-6 justify-start gap-3 h-11 font-medium hover:bg-accent/80"
              variant="default"
            >
              <MessageSquarePlus className="w-5 h-5 flex-shrink-0" />
              <motion.span
                animate={{
                  display: open ? "inline-block" : "none",
                  opacity: open ? 1 : 0,
                }}
                className="whitespace-nowrap"
              >
                New Chat
              </motion.span>
            </Button>

            {/* Conversations List */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <motion.div
                animate={{
                  display: open ? "block" : "none",
                  opacity: open ? 1 : 0,
                }}
                className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Recent Conversations
              </motion.div>
              <ScrollArea className="flex-1">
                <div className="space-y-1 pr-2">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => handleSelectConversation(conversation.id)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 group",
                        conversationId === conversation.id 
                          ? "bg-accent/80 shadow-sm" 
                          : "hover:bg-accent/40"
                      )}
                    >
                      <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-70" />
                      <motion.div
                        animate={{
                          display: open ? "flex" : "none",
                          opacity: open ? 1 : 0,
                        }}
                        className="flex-1 min-w-0 flex items-center justify-between gap-2"
                      >
                        <span className="text-sm font-medium truncate leading-relaxed">
                          {conversation.title}
                        </span>
                        <button
                          onClick={(e) => handleDeleteConversation(conversation.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity flex-shrink-0 p-1 hover:bg-destructive/10 rounded"
                          title="Delete conversation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Dashboard Button (only for HR admins) */}
          {onNavigateToDashboard && (
            <Button
              onClick={onNavigateToDashboard}
              className="w-full justify-start gap-3 h-11 font-medium mb-2"
              variant="outline"
            >
              <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
              <motion.span
                animate={{
                  display: open ? "inline-block" : "none",
                  opacity: open ? 1 : 0,
                }}
                className="whitespace-nowrap"
              >
                HR Dashboard
              </motion.span>
            </Button>
          )}

          {/* Sign Out Button */}
          <Button
            onClick={handleSignOut}
            className="w-full justify-start gap-3 h-11 font-medium"
            variant="outline"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <motion.span
              animate={{
                display: open ? "inline-block" : "none",
                opacity: open ? 1 : 0,
              }}
              className="whitespace-nowrap"
            >
              Sign Out
            </motion.span>
          </Button>
        </SidebarBody>
      </Sidebar>

      {/* Main Chat Area */}
      <div className="flex flex-col h-screen flex-1 overflow-hidden bg-[hsl(var(--chat-bg))]">
        <div className="flex flex-col h-full max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3 backdrop-blur-sm">
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
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">ChatGPT Clone</h1>
          </div>

          {/* Messages Area */}
          <div className="flex-1 border border-border/50 rounded-2xl bg-card/30 backdrop-blur-sm overflow-hidden shadow-lg">
            <ScrollArea className="h-full" ref={scrollAreaRef}>
              <div className="p-6 sm:p-8 space-y-6">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20 sm:py-32">
                    <Bot className="w-16 h-16 sm:w-20 sm:h-20 mb-6 opacity-50" />
                    <p className="text-lg sm:text-xl text-center px-4 font-medium leading-relaxed">
                      Start a conversation with GPT-4.1-nano
                    </p>
                    <p className="text-sm sm:text-base text-center px-4 mt-2 opacity-60">
                      Type a message below to begin
                    </p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
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
                        className={`rounded-2xl px-5 py-3.5 sm:px-6 sm:py-4 max-w-[85%] sm:max-w-[75%] shadow-sm ${
                          message.role === 'user'
                            ? 'bg-[hsl(var(--message-user))] text-white'
                            : 'bg-[hsl(var(--message-assistant))] text-foreground'
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
                  ))
                )}
                {isLoading && (
                  <div className="flex gap-4 sm:gap-5 justify-start">
                    <div className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary/90 flex items-center justify-center shadow-md">
                      <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
                    </div>
                    <div className="rounded-2xl px-5 py-3.5 sm:px-6 sm:py-4 bg-[hsl(var(--message-assistant))] shadow-sm">
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
            <div className="flex gap-3 sm:gap-4">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 text-base h-12 sm:h-14 px-5 rounded-xl border-border/50 bg-card/50 backdrop-blur-sm focus:bg-card transition-colors"
              />
              <Button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                size="icon"
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl shadow-md hover:shadow-lg transition-shadow"
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
