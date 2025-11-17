import { useState } from 'react';
import { QuickActionButton } from './QuickActionButton';
import type { Suggestion } from '@/lib/suggestions';
import { Sparkles, Tag, TrendingUp, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuggestionsPanelProps {
  suggestions: {
    relatedQuestions: Suggestion[];
    categories: Suggestion[];
    followUpTopics: Suggestion[];
    actionButtons: Suggestion[];
  };
  onSuggestionClick: (suggestion: Suggestion) => void;
  isLoading?: boolean;
  className?: string;
}

export function SuggestionsPanel({
  suggestions,
  onSuggestionClick,
  isLoading = false,
  className,
}: SuggestionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const hasAnySuggestions =
    suggestions.relatedQuestions.length > 0 ||
    suggestions.categories.length > 0 ||
    suggestions.followUpTopics.length > 0 ||
    suggestions.actionButtons.length > 0;

  if (!hasAnySuggestions && !isLoading) {
    return null;
  }

  return (
    <div
      className={cn(
        'w-full rounded-2xl border-3 border-black dark:border-white',
        'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-slate-800 dark:to-slate-900',
        'shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]',
        'overflow-hidden transition-all duration-300',
        className
      )}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 bg-yellow-100 dark:bg-slate-700 hover:bg-yellow-200 dark:hover:bg-slate-600 transition-colors border-b-3 border-black dark:border-white"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-yellow-600 dark:text-yellow-400" strokeWidth={2.5} />
          <h3 className="text-base font-black text-black dark:text-white">
            Smart Suggestions
          </h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-black dark:text-white" strokeWidth={2.5} />
        ) : (
          <ChevronDown className="w-5 h-5 text-black dark:text-white" strokeWidth={2.5} />
        )}
      </button>

      {isExpanded && (
        <div className="p-5 space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex gap-2 items-center">
                <Sparkles className="w-5 h-5 text-yellow-600 dark:text-yellow-400 animate-pulse" />
                <span className="text-sm font-bold text-black dark:text-white">
                  Generating suggestions...
                </span>
              </div>
            </div>
          ) : (
            <>
              {suggestions.actionButtons.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-600 dark:text-orange-400" strokeWidth={2.5} />
                    <h4 className="text-sm font-black text-black dark:text-white uppercase tracking-wide">
                      Quick Actions
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.actionButtons.map((suggestion) => (
                      <QuickActionButton
                        key={suggestion.id}
                        text={suggestion.suggestion_text}
                        onClick={() => onSuggestionClick(suggestion)}
                        variant="primary"
                        icon={Zap}
                      />
                    ))}
                  </div>
                </div>
              )}

              {suggestions.relatedQuestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
                    <h4 className="text-sm font-black text-black dark:text-white uppercase tracking-wide">
                      Related Questions
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {suggestions.relatedQuestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => onSuggestionClick(suggestion)}
                        className={cn(
                          'w-full text-left px-4 py-3 rounded-xl',
                          'bg-white dark:bg-slate-800',
                          'border-2 border-black dark:border-white',
                          'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]',
                          'hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[5px_5px_0px_0px_rgba(255,255,255,1)]',
                          'hover:-translate-x-[2px] hover:-translate-y-[2px]',
                          'active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:active:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]',
                          'active:translate-x-[1px] active:translate-y-[1px]',
                          'transition-all duration-150',
                          'group'
                        )}
                      >
                        <span className="text-sm font-bold text-black dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {suggestion.suggestion_text}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {suggestions.categories.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-green-600 dark:text-green-400" strokeWidth={2.5} />
                    <h4 className="text-sm font-black text-black dark:text-white uppercase tracking-wide">
                      Categories
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.categories.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => onSuggestionClick(suggestion)}
                        className={cn(
                          'px-4 py-2 rounded-full',
                          'bg-green-500 hover:bg-green-600',
                          'text-white font-bold text-sm',
                          'border-2 border-black dark:border-white',
                          'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]',
                          'hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]',
                          'hover:-translate-x-[1px] hover:-translate-y-[1px]',
                          'active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:active:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]',
                          'active:translate-x-[1px] active:translate-y-[1px]',
                          'transition-all duration-150'
                        )}
                      >
                        {suggestion.suggestion_text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {suggestions.followUpTopics.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" strokeWidth={2.5} />
                    <h4 className="text-sm font-black text-black dark:text-white uppercase tracking-wide">
                      Follow-Up Topics
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.followUpTopics.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => onSuggestionClick(suggestion)}
                        className={cn(
                          'px-4 py-2 rounded-full',
                          'bg-purple-500 hover:bg-purple-600',
                          'text-white font-bold text-sm',
                          'border-2 border-black dark:border-white',
                          'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]',
                          'hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]',
                          'hover:-translate-x-[1px] hover:-translate-y-[1px]',
                          'active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:active:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]',
                          'active:translate-x-[1px] active:translate-y-[1px]',
                          'transition-all duration-150'
                        )}
                      >
                        {suggestion.suggestion_text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
