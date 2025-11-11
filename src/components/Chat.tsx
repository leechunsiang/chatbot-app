import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, AlertCircle } from 'lucide-react';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';
import { createConversation, createMessage, getConversationMessages, generateConversationTitle } from '@/lib/database';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
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
        setError(null);
        setIsInitializing(true);

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(`Authentication error: ${sessionError.message}`);
        }

        if (!session?.user) {
          throw new Error('No authenticated user found');
        }

        setUserId(session.user.id);

        await ensureUserExists(session.user.id, session.user.email || '');

        const { data: conversations, error: conversationError } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', session.user.id)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (conversationError) {
          throw new Error(`Failed to load conversations: ${conversationError.message}`);
        }

        if (conversations && conversations.length > 0) {
          setConversationId(conversations[0].id);
          await loadMessages(conversations[0].id);
        } else {
          const newConversation = await createConversation(session.user.id, 'New Chat');
          setConversationId(newConversation.id);
        }
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize chat');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeChat();
  }, []);

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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Initializing chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-destructive font-medium">Error</p>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-destructive hover:text-destructive/80"
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-center mb-4 sm:mb-6">
        <Bot className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-primary" />
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">ChatGPT Clone</h1>
      </div>

      {/* Messages Area */}
      <div className="flex-1 border rounded-lg bg-card overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4 sm:p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12 sm:py-20">
                <Bot className="w-12 h-12 sm:w-16 sm:h-16 mb-4" />
                <p className="text-base sm:text-lg text-center px-4">
                  Start a conversation with GPT-4.1-nano
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 sm:gap-4 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary flex items-center justify-center">
                      <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className={`rounded-lg px-4 py-2 sm:px-6 sm:py-3 max-w-[85%] sm:max-w-[80%] ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm sm:text-base whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-secondary flex items-center justify-center">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex gap-3 sm:gap-4 justify-start">
                <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary flex items-center justify-center">
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                </div>
                <div className="rounded-lg px-4 py-2 sm:px-6 sm:py-3 bg-muted">
                  <div className="flex gap-1">
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
      <form onSubmit={sendMessage} className="mt-4 sm:mt-6">
        <div className="flex gap-2 sm:gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 text-sm sm:text-base"
          />
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            size="icon"
            className="h-10 w-10 sm:h-11 sm:w-11"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>
      </form>

      {/* Footer */}
      <div className="mt-4 text-center text-xs sm:text-sm text-muted-foreground">
        Powered by GPT-4.1-nano via GitHub Models
      </div>
    </div>
  );
}
