import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Boxes } from '@/components/ui/background-boxes';
import { Send, Bot, User, AlertCircle, Plus, MessageSquare, Menu, X, Trash2, Volume2, VolumeX, Pause, Play, Settings } from 'lucide-react';
import OpenAI from 'openai';
import { createConversation, createMessage, getUserConversations, getConversationMessages, deleteConversation, updateConversationTitle, generateConversationTitle } from '@/lib/database';
import { searchDocumentChunks, buildContextFromChunks } from '@/lib/rag';
import { generateSmartSuggestions, saveSuggestionsToDatabase, incrementSuggestionClick, type Suggestion } from '@/lib/suggestions';
import { SuggestionsPanel } from './SuggestionsPanel';
import type { Database } from '@/lib/database.types';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  suggestions?: {
    relatedQuestions: Suggestion[];
    categories: Suggestion[];
    followUpTopics: Suggestion[];
    actionButtons: Suggestion[];
  };
}

type Conversation = Database['public']['Tables']['conversations']['Row'];

interface SimplifiedChatProps {
  initialUserId?: string | null;
  isAuthenticated?: boolean;
}

export function SimplifiedChat({ initialUserId, isAuthenticated = false }: SimplifiedChatProps = {}) {
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
  const [hasOrganization, setHasOrganization] = useState<boolean>(false);
  const [isCheckingOrganization, setIsCheckingOrganization] = useState(true);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [showSpeechSettings, setShowSpeechSettings] = useState(false);
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const speech = useSpeechSynthesis();

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
    
    // Check if user has an organization
    checkUserOrganization(initialUserId);
  }, [initialUserId]);

  const checkUserOrganization = async (userId: string) => {
    setIsCheckingOrganization(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error checking organization:', error);
        setHasOrganization(false);
      } else {
        setHasOrganization(!!data?.organization_id);
        console.log('User organization status:', !!data?.organization_id);
      }
    } catch (err) {
      console.error('Error checking organization:', err);
      setHasOrganization(false);
    } finally {
      setIsCheckingOrganization(false);
    }
  };

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
      const message = await createMessage({
        conversation_id: convId,
        role,
        content
      });
      console.log('✅ Message saved successfully');
      return message;
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
      let relevantChunks = [];
      try {
        relevantChunks = await searchDocumentChunks(userMessageContent, 0.3, 10);
        if (relevantChunks.length > 0) {
          context = buildContextFromChunks(relevantChunks);
          console.log(`✅ Using ${relevantChunks.length} policy document chunks to answer question`);
        } else {
          console.warn('⚠️ No policy documents found for this query');
        }
      } catch (ragError) {
        console.error('⚠️ Error searching documents:', ragError);
      }

      // If no relevant documents found, provide a standard response
      if (!context || relevantChunks.length === 0) {
        const noDocumentResponse = "I couldn't find information about this in our policy documents. Please contact your HR department for assistance with this question.";
        const assistantMessage: Message = {
          role: 'assistant',
          content: noDocumentResponse
        };
        setMessages(prev => {
          const newMessages = [...prev, assistantMessage];
          setTypingMessageIndex(newMessages.length - 1);
          return newMessages;
        });
        await saveMessage('assistant', noDocumentResponse, convId);
        return;
      }

      // Build messages with system prompt - Conversational HR assistant mode
      const systemPrompt = `You are a friendly and helpful HR assistant named Benny. You help employees understand company policies in a conversational, human way.

IMPORTANT GUIDELINES:
- Use information from the policy documents below to answer questions
- Respond like a real HR person would - warm, conversational, and helpful
- DO NOT quote policy documents directly or use formal policy language
- Instead, explain policies in simple, everyday language as if talking to a colleague
- Use natural phrases like "So basically...", "Here's the deal...", "From what I understand..."
- If you don't have the information, say something like "I don't have that specific info in our policies right now. I'd recommend reaching out to the HR team directly - they'll be able to help you out!"
- Be empathetic and understanding - employees come to you with real concerns
- Keep responses concise but complete - aim for 2-4 sentences unless more detail is needed
- Never make up information - only use what's in the policy documents

=== COMPANY POLICY INFORMATION ===

${context}

=== END OF POLICY INFORMATION ===

Remember: Be helpful and human, not robotic. Explain policies like you're helping a coworker, not reading from a manual.`;

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
        temperature: 0.3,
        max_tokens: 1000,
      });

      const assistantContent = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent
      };

      setMessages(prev => {
        const newMessages = [...prev, assistantMessage];
        setTypingMessageIndex(newMessages.length - 1);
        return newMessages;
      });
      const savedMessage = await saveMessage('assistant', assistantContent, convId);

      if (savedMessage && savedMessage.id) {
        setIsGeneratingSuggestions(true);
        try {
          const conversationHistory = [...messages, { role: 'user', content: userMessageContent }].map(m => ({
            role: m.role,
            content: m.content
          }));

          const suggestions = await generateSmartSuggestions(conversationHistory, assistantContent);
          await saveSuggestionsToDatabase(convId, savedMessage.id, suggestions);

          const groupedSuggestions = {
            relatedQuestions: suggestions.relatedQuestions.map((text, index) => ({
              suggestion_text: text,
              suggestion_type: 'related_question' as const,
              display_order: index,
              conversation_id: convId,
              message_id: savedMessage.id,
            })),
            categories: [],
            followUpTopics: suggestions.followUpTopics.map((text, index) => ({
              suggestion_text: text,
              suggestion_type: 'follow_up' as const,
              display_order: index,
              conversation_id: convId,
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

  const handleSpeakMessage = (messageContent: string, messageIndex: number) => {
    if (speakingMessageIndex === messageIndex && speech.isSpeaking) {
      if (speech.isPaused) {
        speech.resume();
      } else {
        speech.pause();
      }
    } else {
      setSpeakingMessageIndex(messageIndex);
      speech.speak(messageContent);
    }
  };

  const handleStopSpeech = () => {
    speech.stop();
    setSpeakingMessageIndex(null);
  };

  useEffect(() => {
    if (!speech.isSpeaking && speakingMessageIndex !== null) {
      setSpeakingMessageIndex(null);
    }
  }, [speech.isSpeaking]);

  return (
    <div className="relative flex h-full w-full overflow-hidden rounded-3xl bg-slate-50 dark:bg-slate-900">
      {/* Background Boxes - Behind Everything */}
      <div className="absolute inset-0 overflow-hidden z-0 opacity-30">
        <Boxes />
      </div>

      {/* Organization Required Overlay */}
      {!isCheckingOrganization && !hasOrganization && isAuthenticated && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border-4 border-black dark:border-white rounded-2xl p-8 max-w-md mx-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-yellow-400 border-3 border-black rounded-full flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <AlertCircle className="w-8 h-8 text-black" strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-black text-black dark:text-white mb-2">
                Organization Required
              </h3>
              <p className="text-base font-bold text-black/70 dark:text-white/70 mb-4">
                You need to be part of an organization to use the chatbot.
              </p>
              <p className="text-sm font-semibold text-black/60 dark:text-white/60">
                Please contact your administrator to be added to an organization.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
  } fixed inset-y-0 left-0 z-50 w-64 bg-slate-100 dark:bg-slate-800 border-r border-border/40 transition-transform duration-300 ease-in-out md:relative md:translate-x-0`}
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
          {/* Mobile Menu Button and Speech Controls */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <Button
              onClick={() => setIsSidebarOpen(true)}
              variant="outline"
              size="icon"
              className="md:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Global Speech Controls */}
            {speech.isSupported && (
              <div className="flex items-center gap-2 ml-auto">
                {speech.isSpeaking && (
                  <Button
                    onClick={handleStopSpeech}
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9"
                    title="Stop speaking"
                  >
                    <VolumeX className="w-5 h-5" />
                  </Button>
                )}

                <DropdownMenu open={showSpeechSettings} onOpenChange={setShowSpeechSettings}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9"
                      title="Speech settings"
                    >
                      <Settings className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuLabel>Speech Settings</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <div className="p-3 space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Voice</label>
                        <Select
                          value={speech.settings.voiceURI}
                          onValueChange={(value) => speech.updateSettings({ voiceURI: value })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a voice" />
                          </SelectTrigger>
                          <SelectContent>
                            {speech.voices.map((voice) => (
                              <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                                {voice.name} ({voice.lang})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium flex justify-between">
                          <span>Speed</span>
                          <span className="text-muted-foreground">{speech.settings.rate.toFixed(1)}x</span>
                        </label>
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={speech.settings.rate}
                          onChange={(e) => speech.updateSettings({ rate: parseFloat(e.target.value) })}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium flex justify-between">
                          <span>Pitch</span>
                          <span className="text-muted-foreground">{speech.settings.pitch.toFixed(1)}</span>
                        </label>
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={speech.settings.pitch}
                          onChange={(e) => speech.updateSettings({ pitch: parseFloat(e.target.value) })}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium flex justify-between">
                          <span>Volume</span>
                          <span className="text-muted-foreground">{Math.round(speech.settings.volume * 100)}%</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={speech.settings.volume}
                          onChange={(e) => speech.updateSettings({ volume: parseFloat(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
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
          <div className="flex-1 min-h-0 rounded-2xl overflow-hidden mb-6 flex-shrink z-20 bg-transparent">
            <ScrollArea className="h-full bg-transparent">
              <div className="p-6 sm:p-8 space-y-6 min-h-full">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground py-20">
                    <Bot className="w-16 h-16 sm:w-20 sm:h-20 mb-6 opacity-50" />
                    {!isAuthenticated ? (
                      <>
                        <p className="text-lg sm:text-xl text-center px-4 font-medium">
                          Log in to get started
                        </p>
                        <p className="text-sm sm:text-base text-center px-4 mt-2 opacity-60">
                          Please sign in to start chatting with the AI assistant
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg sm:text-xl text-center px-4 font-medium">
                          Beep boop! Benny's online and ready to chat
                        </p>
                        <p className="text-sm sm:text-base text-center px-4 mt-2 opacity-60">
                          Type a message below to begin
                        </p>
                      </>
                    )}
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
                          <div className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-blue-600 flex items-center justify-center shadow-md">
                            <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          </div>
                        )}
                        <div className="flex flex-col gap-2 max-w-[85%] sm:max-w-[75%]">
                          <div
                            className={`rounded-2xl px-5 py-3.5 sm:px-6 sm:py-4 border-2 transition-transform duration-200 ${
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

                          {message.role === 'assistant' && speech.isSupported && (
                            <div className="flex gap-1 ml-2">
                              <Button
                                onClick={() => handleSpeakMessage(message.content, index)}
                                size="sm"
                                variant="ghost"
                                className={cn(
                                  "h-7 px-2 text-xs gap-1.5",
                                  speakingMessageIndex === index && speech.isSpeaking && "text-blue-600 dark:text-blue-400"
                                )}
                                title={
                                  speakingMessageIndex === index && speech.isSpeaking
                                    ? speech.isPaused
                                      ? "Resume"
                                      : "Pause"
                                    : "Speak"
                                }
                              >
                                {speakingMessageIndex === index && speech.isSpeaking ? (
                                  speech.isPaused ? (
                                    <>
                                      <Play className="w-3 h-3" />
                                      <span>Resume</span>
                                    </>
                                  ) : (
                                    <>
                                      <Pause className="w-3 h-3" />
                                      <span>Pause</span>
                                    </>
                                  )
                                ) : (
                                  <>
                                    <Volume2 className="w-3 h-3" />
                                    <span>Speak</span>
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                        {message.role === 'user' && (
                          <div className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-purple-600 flex items-center justify-center shadow-md">
                            <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
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
                disabled={isLoading || (!userId) || !hasOrganization}
                className="flex-1 text-base h-10 sm:h-12 px-3 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim() || !userId || !hasOrganization}
                size="icon"
                variant="ghost"
                className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 hover:bg-transparent text-blue-600 hover:text-purple-600 transition-colors"
                title={!userId ? 'Waiting for user session' : !hasOrganization ? 'Organization required' : !input.trim() ? 'Enter a message' : 'Send message'}
              >
                <Send className="w-5 h-5 sm:w-6 sm:h-6" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

