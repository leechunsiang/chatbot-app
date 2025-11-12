import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, AlertCircle } from 'lucide-react';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';
import { createConversation, createMessage } from '@/lib/database';
import { searchDocumentChunks, buildContextFromChunks } from '@/lib/rag';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
}

export function SimplifiedChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
    dangerouslyAllowBrowser: true
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initChat = async () => {
      try {
        console.log('🔵 SimplifiedChat: Initializing chat...');

        // Set a maximum timeout to guarantee initialization completes
        timeoutId = setTimeout(() => {
          if (mounted && isInitializing) {
            console.warn('⚠️ SimplifiedChat: Initialization timeout - enabling guest mode');
            setUserId('guest');
            setConversationId('guest-conversation');
            setIsInitializing(false);
          }
        }, 8000);

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError) {
          console.error('❌ SimplifiedChat: Session error:', sessionError);
          clearTimeout(timeoutId);
          setError('Failed to get session');
          setUserId('guest');
          setConversationId('guest-conversation');
          setIsInitializing(false);
          return;
        }

        if (session?.user) {
          console.log('✅ SimplifiedChat: User found:', session.user.id);
          setUserId(session.user.id);

          // Create a new conversation
          try {
            console.log('🔵 SimplifiedChat: Creating conversation...');
            const newConversation = await createConversation(session.user.id, 'New Chat');
            console.log('✅ SimplifiedChat: Conversation created:', newConversation.id);
            if (mounted) {
              clearTimeout(timeoutId);
              setConversationId(newConversation.id);
              setIsInitializing(false);
            }
          } catch (convErr) {
            console.error('❌ SimplifiedChat: Error creating conversation:', convErr);
            if (mounted) {
              clearTimeout(timeoutId);
              setUserId('guest');
              setConversationId('guest-conversation');
              setIsInitializing(false);
            }
          }
        } else {
          console.log('⚠️ SimplifiedChat: No session found, enabling guest mode');
          clearTimeout(timeoutId);
          setUserId('guest');
          setConversationId('guest-conversation');
          setIsInitializing(false);
        }
      } catch (err) {
        console.error('❌ SimplifiedChat: Error initializing chat:', err);
        if (mounted) {
          clearTimeout(timeoutId);
          setUserId('guest');
          setConversationId('guest-conversation');
          setIsInitializing(false);
        }
      }
    };

    initChat();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 SimplifiedChat: Auth state changed:', event, !!session);

        // Only handle SIGNED_OUT event - don't re-initialize on SIGNED_IN
        // The initial load handles the signed-in state
        if (event === 'SIGNED_OUT' && mounted) {
          console.log('👋 SimplifiedChat: User signed out, switching to guest mode');
          setUserId('guest');
          setConversationId('guest-conversation');
          setMessages([]);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    // Skip saving for guest mode
    if (!conversationId || conversationId === 'guest-conversation') {
      console.log('⚠️ Guest mode: Not saving message to database');
      return;
    }

    try {
      await createMessage({
        conversation_id: conversationId,
        role,
        content
      });
    } catch (err) {
      console.error('Error saving message:', err);
      // Don't throw - just log the error and continue
      console.warn('⚠️ Failed to save message, continuing anyway');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading || !userId || !conversationId) {
      return;
    }

    const userMessageContent = input;
    const userMessage: Message = { role: 'user', content: userMessageContent };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      await saveMessage('user', userMessageContent);

      // Search for relevant document chunks
      let context = '';
      try {
        const relevantChunks = await searchDocumentChunks(userMessageContent, 0.5, 5);
        if (relevantChunks.length > 0) {
          context = buildContextFromChunks(relevantChunks);
        }
      } catch (ragError) {
        console.error('⚠️ Error searching documents:', ragError);
      }

      // Build messages with system prompt
      const systemPrompt = context
        ? `You are a helpful HR assistant that answers questions about company policies and benefits.
           
Base your answers on these policy documents:

${context}`
        : `You are a helpful HR assistant that answers questions about company policies and benefits. Be professional, clear, and helpful.`;

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
      await saveMessage('assistant', assistantContent);
    } catch (error) {
      console.error('Error in sendMessage:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, there was an error processing your request.'
      };
      setMessages(prev => [...prev, errorMessage]);
      setError('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-900 dark:via-blue-950/30 dark:to-purple-950/30">
      <div className="flex flex-col h-full max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 overflow-hidden">
        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-destructive font-semibold">Error</p>
              <p className="text-sm text-destructive/80">{error}</p>
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
        <div className="flex items-center justify-center mb-6 sm:mb-6 flex-shrink-0">
          <Bot className="w-8 h-8 sm:w-10 sm:h-10 mr-3 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            HR Assistant
          </h1>
        </div>

        {/* Messages Area */}
        <div className="flex-1 min-h-0 border border-border/50 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden shadow-lg mb-6 flex-shrink">
          <ScrollArea className="h-full">
            <div className="p-6 sm:p-8 space-y-6 min-h-full">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground py-20">
                  <Bot className="w-16 h-16 sm:w-20 sm:h-20 mb-6 opacity-50" />
                  <p className="text-lg sm:text-xl text-center px-4 font-medium">
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
                      <div className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-blue-600 flex items-center justify-center shadow-md">
                        <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-5 py-3.5 sm:px-6 sm:py-4 max-w-[85%] sm:max-w-[75%] shadow-sm ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-800 text-foreground border border-border/50'
                      }`}
                    >
                      <p className="text-[15px] sm:text-base whitespace-pre-wrap break-words leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-purple-600 flex items-center justify-center shadow-md">
                        <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                    )}
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex gap-4 sm:gap-5 justify-start">
                  <div className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-blue-600 flex items-center justify-center shadow-md">
                    <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="rounded-2xl px-5 py-3.5 sm:px-6 sm:py-4 bg-white dark:bg-slate-800 border border-border/50 shadow-sm">
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
        <form onSubmit={sendMessage} className="flex-shrink-0">
          <div className="flex gap-3 sm:gap-4">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isInitializing
                  ? "Initializing..."
                  : !userId || userId === 'guest'
                  ? "Type your message... (Guest mode - not saved)"
                  : !conversationId || conversationId === 'guest-conversation'
                  ? "Type your message... (Guest mode - not saved)"
                  : "Type your message..."
              }
              disabled={isLoading || isInitializing}
              className="flex-1 text-base h-12 sm:h-14 px-5 rounded-xl border-border/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm focus:bg-white dark:focus:bg-slate-900 transition-colors"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim() || isInitializing}
              size="icon"
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl shadow-md hover:shadow-lg transition-shadow bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Send className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-4 text-center text-xs sm:text-sm text-muted-foreground flex-shrink-0">
          Powered by GPT-4.1-nano via GitHub Models
        </div>
      </div>
    </div>
  );
}
