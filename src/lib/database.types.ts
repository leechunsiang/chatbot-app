export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      smart_suggestions: {
        Row: {
          id: string
          conversation_id: string
          message_id: string
          suggestion_text: string
          suggestion_type: 'related_question' | 'category' | 'follow_up' | 'action_button'
          display_order: number
          clicked_count: number
          metadata: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          message_id: string
          suggestion_text: string
          suggestion_type: 'related_question' | 'category' | 'follow_up' | 'action_button'
          display_order?: number
          clicked_count?: number
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          message_id?: string
          suggestion_text?: string
          suggestion_type?: 'related_question' | 'category' | 'follow_up' | 'action_button'
          display_order?: number
          clicked_count?: number
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }
      document_chunks: {
        Row: {
          id: string
          document_id: string
          content: string
          chunk_index: number
          embedding: number[] | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          content: string
          chunk_index: number
          embedding?: number[] | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          content?: string
          chunk_index?: number
          embedding?: number[] | null
          created_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      organization_users: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          role: 'employee' | 'manager' | 'hr_admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          role: 'employee' | 'manager' | 'hr_admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          role?: 'employee' | 'manager' | 'hr_admin'
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          embedding: number[] | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          embedding?: number[] | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          embedding?: number[] | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_messages: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          conversation_id: string
          content: string
          similarity: number
        }[]
      }
      increment_suggestion_click: {
        Args: {
          suggestion_id: string
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
