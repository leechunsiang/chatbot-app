import OpenAI from 'openai';
import { supabase } from './supabase';

export interface Suggestion {
  id?: string;
  conversation_id: string;
  message_id: string;
  suggestion_text: string;
  suggestion_type: 'related_question' | 'category' | 'follow_up' | 'action_button';
  display_order: number;
  clicked_count?: number;
  metadata?: Record<string, any>;
}

export interface GeneratedSuggestions {
  relatedQuestions: string[];
  categories: string[];
  followUpTopics: string[];
  actionButtons: string[];
}

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true
});

export async function generateSmartSuggestions(
  conversationHistory: Array<{ role: string; content: string }>,
  lastAssistantMessage: string
): Promise<GeneratedSuggestions> {
  try {
    const prompt = `You are an HR assistant analyzing a conversation to generate helpful suggestions for the user.

Based on the conversation history and the assistant's last response, generate:

1. 3-4 related questions the user might want to ask next
2. 2-3 follow-up topics to explore deeper

Conversation History:
${conversationHistory.slice(-6).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Last Assistant Message:
${lastAssistantMessage}

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{
  "relatedQuestions": ["question 1", "question 2", "question 3", "question 4"],
  "followUpTopics": ["topic 1", "topic 2", "topic 3"]
}

Make the suggestions natural, relevant, and actionable. Keep them concise (under 60 characters each).`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates JSON responses for HR chatbot suggestions. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '{}';

    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(cleanedContent);

    return {
      relatedQuestions: Array.isArray(parsed.relatedQuestions) ? parsed.relatedQuestions.slice(0, 4) : [],
      categories: [],
      followUpTopics: Array.isArray(parsed.followUpTopics) ? parsed.followUpTopics.slice(0, 3) : [],
      actionButtons: [],
    };
  } catch (error) {
    console.error('Error generating smart suggestions:', error);
    return {
      relatedQuestions: [],
      categories: [],
      followUpTopics: [],
      actionButtons: [],
    };
  }
}

export async function saveSuggestionsToDatabase(
  conversationId: string,
  messageId: string,
  suggestions: GeneratedSuggestions
): Promise<void> {
  try {
    const suggestionRecords: Omit<Suggestion, 'id'>[] = [];

    suggestions.relatedQuestions.forEach((text, index) => {
      suggestionRecords.push({
        conversation_id: conversationId,
        message_id: messageId,
        suggestion_text: text,
        suggestion_type: 'related_question',
        display_order: index,
      });
    });

    suggestions.categories.forEach((text, index) => {
      suggestionRecords.push({
        conversation_id: conversationId,
        message_id: messageId,
        suggestion_text: text,
        suggestion_type: 'category',
        display_order: index,
      });
    });

    suggestions.followUpTopics.forEach((text, index) => {
      suggestionRecords.push({
        conversation_id: conversationId,
        message_id: messageId,
        suggestion_text: text,
        suggestion_type: 'follow_up',
        display_order: index,
      });
    });

    suggestions.actionButtons.forEach((text, index) => {
      suggestionRecords.push({
        conversation_id: conversationId,
        message_id: messageId,
        suggestion_text: text,
        suggestion_type: 'action_button',
        display_order: index,
      });
    });

    if (suggestionRecords.length > 0) {
      const { error } = await supabase
        .from('smart_suggestions')
        .insert(suggestionRecords);

      if (error) {
        console.error('Error saving suggestions to database:', error);
      }
    }
  } catch (error) {
    console.error('Error in saveSuggestionsToDatabase:', error);
  }
}

export async function getSuggestionsForMessage(messageId: string): Promise<Suggestion[]> {
  try {
    const { data, error } = await supabase
      .from('smart_suggestions')
      .select('*')
      .eq('message_id', messageId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getSuggestionsForMessage:', error);
    return [];
  }
}

export async function incrementSuggestionClick(suggestionId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('increment_suggestion_click', {
      suggestion_id: suggestionId
    });

    if (error) {
      console.error('Error incrementing suggestion click:', error);
    }
  } catch (error) {
    console.error('Error in incrementSuggestionClick:', error);
  }
}

export function groupSuggestionsByType(suggestions: Suggestion[]): {
  relatedQuestions: Suggestion[];
  categories: Suggestion[];
  followUpTopics: Suggestion[];
  actionButtons: Suggestion[];
} {
  return {
    relatedQuestions: suggestions.filter(s => s.suggestion_type === 'related_question'),
    categories: suggestions.filter(s => s.suggestion_type === 'category'),
    followUpTopics: suggestions.filter(s => s.suggestion_type === 'follow_up'),
    actionButtons: suggestions.filter(s => s.suggestion_type === 'action_button'),
  };
}
