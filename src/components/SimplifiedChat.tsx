import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Boxes } from '@/components/ui/background-boxes';
import { Send, Bot, User, AlertCircle, Plus, MessageSquare, Menu, X, Trash2 } from 'lucide-react';
import OpenAI from 'openai';
import { createConversation, createMessage, getUserConversations, getConversationMessages, deleteConversation, updateConversationTitle, generateConversationTitle } from '@/lib/database';
import { searchDocumentChunks, buildContextFromChunks } from '@/lib/rag';
import type { Database } from '@/lib/database.types';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

function TypewriterText({ text, speed = 20, onComplete }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else if (currentIndex === text.length && onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  return (
    <span className="whitespace-pre-wrap break-words leading-relaxed">
      {displayedText}
      {currentIndex < text.length && (
        <span className="inline-block w-1 h-4 bg-current ml-0.5 animate-pulse" />
      )}
    </span>
  );
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
}

type Conversation = Database['public']['Tables']['conversations']['Row'];

interface SimplifiedChatProps {
  initialUserId?: string | null;
}

export function SimplifiedChat({ initialUserId }: SimplifiedChatProps = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [typingMessageIndex, setTypingMessageIndex] = useState<number | null>(null);
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
    if (!initialUserId) {
      console.log('🔵 SimplifiedChat: Waiting for parent to provide userId...');
      return;
    }

    console.log('✅ SimplifiedChat: Using provided userId:', initialUserId);
    setUserId(initialUserId);
    setIsInitializing(false);
  }, [initialUserId]);

  const ensureConversation = async (): Promise<string> => {
    if (conversationId) {
      return conversationId;
    }

    if (!userId) {
      throw new Error('User ID not available');
    }

    console.log('🔵 Creating conversation on-demand...');
    try {
      const newConversation = await createConversation(userId, 'New Chat');
      console.log('✅ Conversation created:', newConversation.id);
      setConversationId(newConversation.id);
      await loadConversations(); // Refresh the conversation list
      return newConversation.id;
    } catch (err: any) {
      console.error('❌ Error creating conversation:', err);
      const errorMessage = err.message || 'Failed to create conversation';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const saveMessage = async (role: 'user' | 'assistant', content: string, convId: string) => {
    try {
      console.log('💾 Saving message to database...', { role, convId });
      await createMessage({
        conversation_id: convId,
        role,
        content
      });
      console.log('✅ Message saved successfully');
    } catch (err: any) {
      console.error('❌ Error saving message:', err);
      throw err;
    }
  };

  const loadConversations = async () => {
    if (!userId) return;
    
    try {
      const convs = await getUserConversations(userId);
      setConversations(convs);
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  };

  const loadConversationMessages = async (convId: string) => {
    try {
      const msgs = await getConversationMessages(convId);
      const formattedMessages: Message[] = msgs.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        id: msg.id
      }));
      setMessages(formattedMessages);
      setTypingMessageIndex(null); // No typing animation for loaded messages
    } catch (err) {
      console.error('Error loading messages:', err);
      setMessages([]);
    }
  };

  const handleNewChat = async () => {
    if (!userId) return;
    
    try {
      const newConv = await createConversation(userId, 'New Chat');
      setConversationId(newConv.id);
      setMessages([]);
      setTypingMessageIndex(null);
      await loadConversations();
      setIsSidebarOpen(false);
    } catch (err) {
      console.error('Error creating new chat:', err);
      setError('Failed to create new chat');
    }
  };

  const handleSwitchConversation = async (convId: string) => {
    setConversationId(convId);
    await loadConversationMessages(convId);
    setIsSidebarOpen(false);
  };

  const handleDeleteConversation = async (convId: string) => {
    if (!userId) return;
    
    try {
      await deleteConversation(convId);
      await loadConversations();
      
      // If we deleted the current conversation, create a new one
      if (convId === conversationId) {
        const newConv = await createConversation(userId, 'New Chat');
        setConversationId(newConv.id);
        setMessages([]);
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
      setError('Failed to delete conversation');
    }
  };

  // Load conversations when userId changes
  useEffect(() => {
    if (userId) {
      loadConversations();
    }
  }, [userId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading || !userId) {
      return;
    }

    const userMessageContent = input;
    const userMessage: Message = { role: 'user', content: userMessageContent };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const convId = await ensureConversation();
      await saveMessage('user', userMessageContent, convId);

      // Update conversation title with first message
      if (messages.length === 0) {
        try {
          const newTitle = generateConversationTitle(userMessageContent);
          await updateConversationTitle(convId, newTitle);
          await loadConversations(); // Refresh conversation list to show new title
        } catch (titleError) {
          console.error('⚠️ Error updating conversation title:', titleError);
          // Don't fail the message send if title update fails
        }
      }

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

      setMessages(prev => {
        const newMessages = [...prev, assistantMessage];
        setTypingMessageIndex(newMessages.length - 1); // Set the new message for typing animation
        return newMessages;
      });
      await saveMessage('assistant', assistantContent, convId);
    } catch (error) {
      console.error('Error in sendMessage:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, there was an error processing your request.'
      };
      setMessages(prev => {
        const newMessages = [...prev, errorMessage];
        setTypingMessageIndex(newMessages.length - 1);
        return newMessages;
      });
      setError('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex h-full w-full overflow-hidden rounded-3xl bg-slate-50 dark:bg-slate-900">
      {/* Background Boxes - Behind Everything */}
      <div className="absolute inset-0 overflow-hidden z-0 opacity-30">
        <Boxes />
      </div>

      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
  } fixed inset-y-0 left-0 z-50 w-64 bg-slate-100/80 dark:bg-slate-800/90 backdrop-blur-sm border-r border-border/40 transition-transform duration-300 ease-in-out md:relative md:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h2 className="text-lg font-semibold">Chats</h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-4">
            <Button
              onClick={handleNewChat}
              disabled={!userId}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </Button>
          </div>

          {/* Conversations List */}
          <ScrollArea className="flex-1 px-2">
            <div className="space-y-1 pb-4">
              {conversations.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No conversations yet
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      conv.id === conversationId
                        ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 flex-shrink-0" />
                    <div
                      onClick={() => handleSwitchConversation(conv.id)}
                      className="flex-1 min-w-0"
                    >
                      <p className="text-sm font-medium truncate">
                        {conv.title || 'New Chat'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(conv.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conv.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-opacity"
                    >
                      <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
        />
      )}

      {/* Main Content */}
      <div className="relative flex flex-col h-full flex-1 overflow-hidden z-20">
        <div className="flex flex-col h-full max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 overflow-hidden">
          {/* Mobile Menu Button */}
          <div className="flex items-center gap-4 mb-4 md:hidden">
            <Button
              onClick={() => setIsSidebarOpen(true)}
              variant="outline"
              size="icon"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>

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

          {/* Messages Area */}
          <div className="flex-1 min-h-0 border border-border/40 rounded-2xl bg-slate-100/80 dark:bg-slate-800/70 backdrop-blur-sm overflow-hidden shadow-lg mb-6 flex-shrink z-20">
            <ScrollArea className="h-full bg-slate-50/70 dark:bg-slate-900/40">
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
                        className={`rounded-2xl px-5 py-3.5 sm:px-6 sm:py-4 max-w-[85%] sm:max-w-[75%] border-2 transition-transform duration-200 ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white border-blue-900/40 shadow-[6px_6px_0_rgba(15,23,42,0.9)]'
                            : 'bg-white dark:bg-slate-800 text-foreground border-slate-900/10 dark:border-slate-700/50 shadow-[6px_6px_0_rgba(15,23,42,0.8)] dark:shadow-[6px_6px_0_rgba(15,23,42,0.8)]'
                        }`}
                      >
                        {message.role === 'assistant' && typingMessageIndex === index ? (
                          <p className="text-[15px] sm:text-base">
                            <TypewriterText 
                              text={message.content} 
                              speed={20}
                              onComplete={() => setTypingMessageIndex(null)}
                            />
                          </p>
                        ) : (
                          <p className="text-[15px] sm:text-base whitespace-pre-wrap break-words leading-relaxed">
                            {message.content}
                          </p>
                        )}
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
                    <div className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-blue-600 flex items-center justify-center shadow-md animate-pulse">
                      <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="rounded-2xl px-5 py-3.5 sm:px-6 sm:py-4 border-2 border-slate-900/10 dark:border-slate-700/50 bg-white dark:bg-slate-800 shadow-[6px_6px_0_rgba(15,23,42,0.8)] dark:shadow-[6px_6px_0_rgba(15,23,42,0.8)]">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground font-medium">Thinking</span>
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
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
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-border/40 bg-slate-100/80 dark:bg-slate-800/90 backdrop-blur-sm shadow-md hover:shadow-lg transition-all focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:border-blue-500/50">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!isLoading && input.trim() && userId) {
                      const form = (e.currentTarget as HTMLInputElement).form;
                      form?.requestSubmit();
                    }
                  }
                }}
                placeholder={isInitializing ? "Initializing..." : "Type your message..."}
                // Enable typing as soon as we have a userId even if conversation still creating
                disabled={isLoading || (!userId)}
                className="flex-1 text-base h-10 sm:h-12 px-3 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim() || !userId}
                size="icon"
                variant="ghost"
                className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 hover:bg-transparent text-blue-600 hover:text-purple-600 transition-colors"
                title={!userId ? 'Waiting for user session' : !input.trim() ? 'Enter a message' : 'Send message'}
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
    </div>
  );
}

