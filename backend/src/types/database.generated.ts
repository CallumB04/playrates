
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activity_events": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"data": NonNullable<Json>,"game_id": number | null,"id": number,"kind": string,"subject_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"data"?: NonNullable<Json>,"game_id"?: number | null,"id"?: never,"kind": string,"subject_id"?: string | null
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"data"?: NonNullable<Json>,"game_id"?: number | null,"id"?: never,"kind"?: string,"subject_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"admin_settings": {
                  Row: {
                    "key": string,"updated_at": string,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"updated_at"?: string,"value": NonNullable<Json>
                  }
                  Update: {
                    "key"?: string,"updated_at"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"announcements": {
                  Row: {
                    "body": string,"created_at": string,"email_broadcast_id": string | null,"emailed_at": string | null,"id": number,"link_path": string | null,"patch_note_message_id": number | null,"recipient_count": number,"retracted_at": string | null,"sent_by": string | null,"title": string,"tone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"email_broadcast_id"?: string | null,"emailed_at"?: string | null,"id"?: never,"link_path"?: string | null,"patch_note_message_id"?: number | null,"recipient_count"?: number,"retracted_at"?: string | null,"sent_by"?: string | null,"title": string,"tone": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"email_broadcast_id"?: string | null,"emailed_at"?: string | null,"id"?: never,"link_path"?: string | null,"patch_note_message_id"?: number | null,"recipient_count"?: number,"retracted_at"?: string | null,"sent_by"?: string | null,"title"?: string,"tone"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "announcements_patch_note_message_id_fkey"
      columns: ["patch_note_message_id"]
isOneToOne: false
      referencedRelation: "community_message_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "announcements_patch_note_message_id_fkey"
      columns: ["patch_note_message_id"]
isOneToOne: false
      referencedRelation: "community_messages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "announcements_sent_by_fkey"
      columns: ["sent_by"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "announcements_sent_by_fkey"
      columns: ["sent_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"client_errors": {
                  Row: {
                    "build": string | null,"created_at": string,"id": number,"message": string,"path": string,"stack": string | null,"user_agent": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "build"?: string | null,"created_at"?: string,"id"?: never,"message": string,"path": string,"stack"?: string | null,"user_agent"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "build"?: string | null,"created_at"?: string,"id"?: never,"message"?: string,"path"?: string,"stack"?: string | null,"user_agent"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"community_message_votes": {
                  Row: {
                    "created_at": string,"message_id": number,"reaction": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"message_id": number,"reaction"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"message_id"?: number,"reaction"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_message_votes_message_id_fkey"
      columns: ["message_id"]
isOneToOne: false
      referencedRelation: "community_message_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_message_votes_message_id_fkey"
      columns: ["message_id"]
isOneToOne: false
      referencedRelation: "community_messages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_message_votes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_message_votes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"community_messages": {
                  Row: {
                    "author_id": string | null,"body": Json | null,"created_at": string,"deleted_at": string | null,"edited_at": string | null,"id": number,"is_opening": boolean,"parent_id": number | null,"patch_note": Json | null,"plain_text": string | null,"thread_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body"?: Json | null,"created_at"?: string,"deleted_at"?: string | null,"edited_at"?: string | null,"id"?: never,"is_opening"?: boolean,"parent_id"?: number | null,"patch_note"?: Json | null,"plain_text"?: string | null,"thread_id": number
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: Json | null,"created_at"?: string,"deleted_at"?: string | null,"edited_at"?: string | null,"id"?: never,"is_opening"?: boolean,"parent_id"?: number | null,"patch_note"?: Json | null,"plain_text"?: string | null,"thread_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_messages_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_messages_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_messages_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "community_message_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_messages_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "community_messages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_messages_thread_id_fkey"
      columns: ["thread_id"]
isOneToOne: false
      referencedRelation: "community_thread_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_messages_thread_id_fkey"
      columns: ["thread_id"]
isOneToOne: false
      referencedRelation: "community_threads"
      referencedColumns: ["id"]
    }
                  ]
                },"community_threads": {
                  Row: {
                    "author_id": string | null,"created_at": string,"game_id": number | null,"id": number,"last_activity_at": string,"subject_kind": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"created_at"?: string,"game_id"?: number | null,"id"?: never,"last_activity_at"?: string,"subject_kind": string,"title": string
                  }
                  Update: {
                    "author_id"?: string | null,"created_at"?: string,"game_id"?: number | null,"id"?: never,"last_activity_at"?: string,"subject_kind"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_threads_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_threads_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_threads_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    }
                  ]
                },"content_reports": {
                  Row: {
                    "created_at": string,"details": string | null,"id": number,"reason": string,"reporter_id": string | null,"resolved_at": string | null,"resolved_by": string | null,"status": string,"target_id": string,"target_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: string | null,"id"?: never,"reason": string,"reporter_id"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"target_id": string,"target_type": string
                  }
                  Update: {
                    "created_at"?: string,"details"?: string | null,"id"?: never,"reason"?: string,"reporter_id"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"target_id"?: string,"target_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_reports_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_reports_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"email_log": {
                  Row: {
                    "id": number,"kind": string,"ref": string,"sent_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"kind": string,"ref": string,"sent_at"?: string,"user_id": string
                  }
                  Update: {
                    "id"?: never,"kind"?: string,"ref"?: string,"sent_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "email_log_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "email_log_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"email_messages": {
                  Row: {
                    "broadcast_id": string | null,"detail": string | null,"id": number,"kind": string,"resend_id": string | null,"sent_at": string,"status": string,"subject": string,"to_address": string,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "broadcast_id"?: string | null,"detail"?: string | null,"id"?: never,"kind": string,"resend_id"?: string | null,"sent_at"?: string,"status": string,"subject": string,"to_address": string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "broadcast_id"?: string | null,"detail"?: string | null,"id"?: never,"kind"?: string,"resend_id"?: string | null,"sent_at"?: string,"status"?: string,"subject"?: string,"to_address"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "email_messages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "email_messages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"email_sends": {
                  Row: {
                    "error": string | null,"id": number,"kind": string,"recipients": number,"sent_at": string,"status": string,"transactional": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "error"?: string | null,"id"?: never,"kind": string,"recipients": number,"sent_at"?: string,"status": string,"transactional"?: boolean
                  }
                  Update: {
                    "error"?: string | null,"id"?: never,"kind"?: string,"recipients"?: number,"sent_at"?: string,"status"?: string,"transactional"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"favourite_games": {
                  Row: {
                    "created_at": string,"game_id": number,"position": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"game_id": number,"position": number,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"game_id"?: number,"position"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "favourite_games_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favourite_games_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favourite_games_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"friendships": {
                  Row: {
                    "created_at": string,"requested_by": string,"status": string,"updated_at": string,"user_a_id": string,"user_b_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"requested_by": string,"status"?: string,"updated_at"?: string,"user_a_id": string,"user_b_id": string
                  }
                  Update: {
                    "created_at"?: string,"requested_by"?: string,"status"?: string,"updated_at"?: string,"user_a_id"?: string,"user_b_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "friendships_requested_by_fkey"
      columns: ["requested_by"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "friendships_requested_by_fkey"
      columns: ["requested_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "friendships_user_a_id_fkey"
      columns: ["user_a_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "friendships_user_a_id_fkey"
      columns: ["user_a_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "friendships_user_b_id_fkey"
      columns: ["user_b_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "friendships_user_b_id_fkey"
      columns: ["user_b_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"game_events": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"data": NonNullable<Json>,"game_id": number | null,"id": number,"kind": string,"source": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"data"?: NonNullable<Json>,"game_id"?: number | null,"id"?: never,"kind": string,"source"?: string | null
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"data"?: NonNullable<Json>,"game_id"?: number | null,"id"?: never,"kind"?: string,"source"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"game_genres": {
                  Row: {
                    "game_id": number,"genre_slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "game_id": number,"genre_slug": string
                  }
                  Update: {
                    "game_id"?: number,"genre_slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_genres_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_genres_genre_slug_fkey"
      columns: ["genre_slug"]
isOneToOne: false
      referencedRelation: "genres"
      referencedColumns: ["slug"]
    }
                  ]
                },"game_list_items": {
                  Row: {
                    "added_at": string,"game_id": number,"list_id": number,"position": number
                  }
                  ComputedFields: never
                  Insert: {
                    "added_at"?: string,"game_id": number,"list_id": number,"position": number
                  }
                  Update: {
                    "added_at"?: string,"game_id"?: number,"list_id"?: number,"position"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_list_items_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_list_items_list_id_fkey"
      columns: ["list_id"]
isOneToOne: false
      referencedRelation: "game_list_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_list_items_list_id_fkey"
      columns: ["list_id"]
isOneToOne: false
      referencedRelation: "game_lists"
      referencedColumns: ["id"]
    }
                  ]
                },"game_list_votes": {
                  Row: {
                    "created_at": string,"list_id": number,"reaction": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"list_id": number,"reaction"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"list_id"?: number,"reaction"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_list_votes_list_id_fkey"
      columns: ["list_id"]
isOneToOne: false
      referencedRelation: "game_list_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_list_votes_list_id_fkey"
      columns: ["list_id"]
isOneToOne: false
      referencedRelation: "game_lists"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_list_votes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_list_votes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"game_lists": {
                  Row: {
                    "colour": string | null,"cover_game_ids": (number)[] | null,"created_at": string,"description": string,"id": number,"name": string,"ranked": boolean,"updated_at": string,"user_id": string,"visibility": string
                  }
                  ComputedFields: never
                  Insert: {
                    "colour"?: string | null,"cover_game_ids"?: (number)[] | null,"created_at"?: string,"description"?: string,"id"?: never,"name": string,"ranked"?: boolean,"updated_at"?: string,"user_id": string,"visibility"?: string
                  }
                  Update: {
                    "colour"?: string | null,"cover_game_ids"?: (number)[] | null,"created_at"?: string,"description"?: string,"id"?: never,"name"?: string,"ranked"?: boolean,"updated_at"?: string,"user_id"?: string,"visibility"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_lists_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_lists_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"game_logs": {
                  Row: {
                    "achievements_completed": number | null,"achievements_total": number | null,"completion": number | null,"created_at": string,"finish_date": string | null,"game_id": number,"hours_played": number | null,"hours_to_beat": number | null,"id": number,"last_played": string | null,"platform_slug": string | null,"played_status": string | null,"rating": number | null,"start_date": string | null,"status": string,"system_slug": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "achievements_completed"?: number | null,"achievements_total"?: number | null,"completion"?: never,"created_at"?: string,"finish_date"?: string | null,"game_id": number,"hours_played"?: number | null,"hours_to_beat"?: number | null,"id"?: never,"last_played"?: never,"platform_slug"?: string | null,"played_status"?: string | null,"rating"?: number | null,"start_date"?: string | null,"status": string,"system_slug"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "achievements_completed"?: number | null,"achievements_total"?: number | null,"completion"?: never,"created_at"?: string,"finish_date"?: string | null,"game_id"?: number,"hours_played"?: number | null,"hours_to_beat"?: number | null,"id"?: never,"last_played"?: never,"platform_slug"?: string | null,"played_status"?: string | null,"rating"?: number | null,"start_date"?: string | null,"status"?: string,"system_slug"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_logs_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_logs_platform_slug_fkey"
      columns: ["platform_slug"]
isOneToOne: false
      referencedRelation: "platforms"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "game_logs_system_slug_fkey"
      columns: ["system_slug"]
isOneToOne: false
      referencedRelation: "platform_systems"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "game_logs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_logs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"game_platforms": {
                  Row: {
                    "game_id": number,"platform_slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "game_id": number,"platform_slug": string
                  }
                  Update: {
                    "game_id"?: number,"platform_slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_platforms_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_platforms_platform_slug_fkey"
      columns: ["platform_slug"]
isOneToOne: false
      referencedRelation: "platforms"
      referencedColumns: ["slug"]
    }
                  ]
                },"game_systems": {
                  Row: {
                    "game_id": number,"system_slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "game_id": number,"system_slug": string
                  }
                  Update: {
                    "game_id"?: number,"system_slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_systems_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_systems_system_slug_fkey"
      columns: ["system_slug"]
isOneToOne: false
      referencedRelation: "platform_systems"
      referencedColumns: ["slug"]
    }
                  ]
                },"games": {
                  Row: {
                    "alt_covers": NonNullable<Json>,"alt_names": (string)[],"avg_rating": number | null,"backdrops": Json | null,"banner_url": string | null,"box_art_url": string | null,"cover_url": string | null,"created_at": string,"critic_score": number | null,"description": string,"developers": (string)[],"esrb_rating": string | null,"has_sexual_content": boolean,"id": number,"igdb_id": number | null,"igdb_rating_count": number | null,"is_trending": boolean,"log_count": number,"publishers": (string)[],"rating_count": number,"release_date": string | null,"search_alt": string,"search_text": string | null,"search_title": string | null,"series_id": number | null,"series_name": string | null,"similar_igdb_ids": (number)[],"slug": string,"synced_at": string | null,"title": string,"trending_rank": number | null,"updated_at": string,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "alt_covers"?: NonNullable<Json>,"alt_names"?: (string)[],"avg_rating"?: number | null,"backdrops"?: Json | null,"banner_url"?: string | null,"box_art_url"?: string | null,"cover_url"?: string | null,"created_at"?: string,"critic_score"?: number | null,"description"?: string,"developers"?: (string)[],"esrb_rating"?: string | null,"has_sexual_content"?: boolean,"id"?: never,"igdb_id"?: number | null,"igdb_rating_count"?: number | null,"is_trending"?: boolean,"log_count"?: number,"publishers"?: (string)[],"rating_count"?: number,"release_date"?: string | null,"search_alt"?: string,"search_text"?: string | null,"search_title"?: string | null,"series_id"?: number | null,"series_name"?: string | null,"similar_igdb_ids"?: (number)[],"slug": string,"synced_at"?: string | null,"title": string,"trending_rank"?: number | null,"updated_at"?: string,"website"?: string | null
                  }
                  Update: {
                    "alt_covers"?: NonNullable<Json>,"alt_names"?: (string)[],"avg_rating"?: number | null,"backdrops"?: Json | null,"banner_url"?: string | null,"box_art_url"?: string | null,"cover_url"?: string | null,"created_at"?: string,"critic_score"?: number | null,"description"?: string,"developers"?: (string)[],"esrb_rating"?: string | null,"has_sexual_content"?: boolean,"id"?: never,"igdb_id"?: number | null,"igdb_rating_count"?: number | null,"is_trending"?: boolean,"log_count"?: number,"publishers"?: (string)[],"rating_count"?: number,"release_date"?: string | null,"search_alt"?: string,"search_text"?: string | null,"search_title"?: string | null,"series_id"?: number | null,"series_name"?: string | null,"similar_igdb_ids"?: (number)[],"slug"?: string,"synced_at"?: string | null,"title"?: string,"trending_rank"?: number | null,"updated_at"?: string,"website"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"gaming_25_loves": {
                  Row: {
                    "created_at": string,"owner_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"owner_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"owner_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gaming_25_loves_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "gaming_25_cards"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "gaming_25_loves_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "gaming_25s"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "gaming_25_loves_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gaming_25_loves_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"gaming_25_picks": {
                  Row: {
                    "category": string,"game_id": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"game_id": number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "category"?: string,"game_id"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gaming_25_picks_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gaming_25_picks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "gaming_25_cards"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "gaming_25_picks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "gaming_25s"
      referencedColumns: ["user_id"]
    }
                  ]
                },"gaming_25s": {
                  Row: {
                    "created_at": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gaming_25s_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gaming_25s_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"genres": {
                  Row: {
                    "name": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "name": string,"slug": string
                  }
                  Update: {
                    "name"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"igdb_usage_days": {
                  Row: {
                    "day": string,"failures": number,"last_error": string | null,"last_failure_at": string | null,"last_request_at": string | null,"requests": number
                  }
                  ComputedFields: never
                  Insert: {
                    "day": string,"failures"?: number,"last_error"?: string | null,"last_failure_at"?: string | null,"last_request_at"?: string | null,"requests"?: number
                  }
                  Update: {
                    "day"?: string,"failures"?: number,"last_error"?: string | null,"last_failure_at"?: string | null,"last_request_at"?: string | null,"requests"?: number
                  }
                  Relationships: [
                    
                  ]
                },"notifications": {
                  Row: {
                    "actor_id": string | null,"archived_at": string | null,"created_at": string,"data": NonNullable<Json>,"dedupe_key": string | null,"id": number,"kind": string,"read_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"archived_at"?: string | null,"created_at"?: string,"data"?: NonNullable<Json>,"dedupe_key"?: string | null,"id"?: never,"kind": string,"read_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "actor_id"?: string | null,"archived_at"?: string | null,"created_at"?: string,"data"?: NonNullable<Json>,"dedupe_key"?: string | null,"id"?: never,"kind"?: string,"read_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"platform_systems": {
                  Row: {
                    "display_name": string,"platform_slug": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "display_name": string,"platform_slug": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "display_name"?: string,"platform_slug"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "platform_systems_platform_slug_fkey"
      columns: ["platform_slug"]
isOneToOne: false
      referencedRelation: "platforms"
      referencedColumns: ["slug"]
    }
                  ]
                },"platforms": {
                  Row: {
                    "display_name": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "display_name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "display_name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "about_visibility": NonNullable<Json>,"accent": string,"adult_confirmed_at": string | null,"avatar_url": string | null,"background_game_id": number | null,"background_position": number | null,"background_url": string | null,"bio": string,"birth_date": string | null,"card_theme": string | null,"created_at": string,"discord": string | null,"effects": (string)[],"email_prefs": NonNullable<Json>,"first_name": string | null,"frame": string | null,"hide_from_search": boolean,"hide_online": boolean,"id": string,"is_admin": boolean,"last_seen_at": string,"location": string | null,"name_colour": string | null,"name_font": string | null,"notifications_seen_at": string | null,"onboarded_at": string | null,"pinned_lists": (number)[],"pinned_reviews": (number)[],"profile_visibility": string,"pronouns": string | null,"referred_by": string | null,"revealed_at": string | null,"section_order": (string)[],"show_sexual_content": boolean,"showcase_badges": (string)[],"showcase_layout": string,"steam": string | null,"timezone": string,"tokens": number,"updated_at": string,"username": string,"username_chosen_at": string | null,"website": string | null,"xp": number,"xp_seen_event_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "about_visibility"?: NonNullable<Json>,"accent"?: string,"adult_confirmed_at"?: string | null,"avatar_url"?: string | null,"background_game_id"?: number | null,"background_position"?: number | null,"background_url"?: string | null,"bio"?: string,"birth_date"?: string | null,"card_theme"?: string | null,"created_at"?: string,"discord"?: string | null,"effects"?: (string)[],"email_prefs"?: NonNullable<Json>,"first_name"?: string | null,"frame"?: string | null,"hide_from_search"?: boolean,"hide_online"?: boolean,"id": string,"is_admin"?: boolean,"last_seen_at"?: string,"location"?: string | null,"name_colour"?: string | null,"name_font"?: string | null,"notifications_seen_at"?: string | null,"onboarded_at"?: string | null,"pinned_lists"?: (number)[],"pinned_reviews"?: (number)[],"profile_visibility"?: string,"pronouns"?: string | null,"referred_by"?: string | null,"revealed_at"?: string | null,"section_order"?: (string)[],"show_sexual_content"?: boolean,"showcase_badges"?: (string)[],"showcase_layout"?: string,"steam"?: string | null,"timezone"?: string,"tokens"?: number,"updated_at"?: string,"username": string,"username_chosen_at"?: string | null,"website"?: string | null,"xp"?: number,"xp_seen_event_id"?: number
                  }
                  Update: {
                    "about_visibility"?: NonNullable<Json>,"accent"?: string,"adult_confirmed_at"?: string | null,"avatar_url"?: string | null,"background_game_id"?: number | null,"background_position"?: number | null,"background_url"?: string | null,"bio"?: string,"birth_date"?: string | null,"card_theme"?: string | null,"created_at"?: string,"discord"?: string | null,"effects"?: (string)[],"email_prefs"?: NonNullable<Json>,"first_name"?: string | null,"frame"?: string | null,"hide_from_search"?: boolean,"hide_online"?: boolean,"id"?: string,"is_admin"?: boolean,"last_seen_at"?: string,"location"?: string | null,"name_colour"?: string | null,"name_font"?: string | null,"notifications_seen_at"?: string | null,"onboarded_at"?: string | null,"pinned_lists"?: (number)[],"pinned_reviews"?: (number)[],"profile_visibility"?: string,"pronouns"?: string | null,"referred_by"?: string | null,"revealed_at"?: string | null,"section_order"?: (string)[],"show_sexual_content"?: boolean,"showcase_badges"?: (string)[],"showcase_layout"?: string,"steam"?: string | null,"timezone"?: string,"tokens"?: number,"updated_at"?: string,"username"?: string,"username_chosen_at"?: string | null,"website"?: string | null,"xp"?: number,"xp_seen_event_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_background_game_id_fkey"
      columns: ["background_game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_referred_by_fkey"
      columns: ["referred_by"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_referred_by_fkey"
      columns: ["referred_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"id": number,"p256dh": string,"user_agent": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"id"?: never,"p256dh": string,"user_agent"?: string | null,"user_id": string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"id"?: never,"p256dh"?: string,"user_agent"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "push_subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"review_votes": {
                  Row: {
                    "created_at": string,"reaction": string,"review_id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"reaction"?: string,"review_id": number,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"reaction"?: string,"review_id"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "review_votes_review_id_fkey"
      columns: ["review_id"]
isOneToOne: false
      referencedRelation: "review_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "review_votes_review_id_fkey"
      columns: ["review_id"]
isOneToOne: false
      referencedRelation: "reviews"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "review_votes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "review_votes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "body": string,"contains_spoilers": boolean,"created_at": string,"game_id": number,"id": number,"is_public": boolean,"log_id": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"contains_spoilers"?: boolean,"created_at"?: string,"game_id": number,"id"?: never,"is_public"?: boolean,"log_id": number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "body"?: string,"contains_spoilers"?: boolean,"created_at"?: string,"game_id"?: number,"id"?: never,"is_public"?: boolean,"log_id"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_log_fk"
      columns: ["log_id","user_id","game_id"]
isOneToOne: false
      referencedRelation: "friend_activity"
      referencedColumns: ["log_id","user_id","game_id"]
    },{
      foreignKeyName: "reviews_log_fk"
      columns: ["log_id","user_id","game_id"]
isOneToOne: false
      referencedRelation: "game_logs"
      referencedColumns: ["id","user_id","game_id"]
    },{
      foreignKeyName: "reviews_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"server_errors": {
                  Row: {
                    "code": string,"created_at": string,"id": number,"message": string,"method": string,"path": string,"request_id": string | null,"stack": string | null,"status": number,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"id"?: never,"message": string,"method": string,"path": string,"request_id"?: string | null,"stack"?: string | null,"status": number,"user_id"?: string | null
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"id"?: never,"message"?: string,"method"?: string,"path"?: string,"request_id"?: string | null,"stack"?: string | null,"status"?: number,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"shop_items": {
                  Row: {
                    "active": boolean,"item": string,"kind": string,"max_owned": number,"price": number,"price_step": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"item": string,"kind": string,"max_owned"?: number,"price": number,"price_step"?: number
                  }
                  Update: {
                    "active"?: boolean,"item"?: string,"kind"?: string,"max_owned"?: number,"price"?: number,"price_step"?: number
                  }
                  Relationships: [
                    
                  ]
                },"streak_shields_used": {
                  Row: {
                    "user_id": string,"week": string
                  }
                  ComputedFields: never
                  Insert: {
                    "user_id": string,"week": string
                  }
                  Update: {
                    "user_id"?: string,"week"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "streak_shields_used_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "streak_shields_used_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"task_swaps": {
                  Row: {
                    "period": string,"quest": string,"slot": number,"swapped_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "period": string,"quest": string,"slot": number,"swapped_at"?: string,"user_id": string
                  }
                  Update: {
                    "period"?: string,"quest"?: string,"slot"?: number,"swapped_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_swaps_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_swaps_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"token_events": {
                  Row: {
                    "amount": number,"created_at": string,"id": number,"key": string,"source": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"id"?: never,"key": string,"source": string,"user_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"id"?: never,"key"?: string,"source"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "token_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "token_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_active_days": {
                  Row: {
                    "day": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "day": string,"user_id": string
                  }
                  Update: {
                    "day"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_active_days_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_active_days_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_backgrounds": {
                  Row: {
                    "acquired_at": string,"game_id": number,"price": number,"url": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "acquired_at"?: string,"game_id": number,"price"?: number,"url": string,"user_id": string
                  }
                  Update: {
                    "acquired_at"?: string,"game_id"?: number,"price"?: number,"url"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_backgrounds_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_backgrounds_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_backgrounds_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_badges": {
                  Row: {
                    "badge": string,"metal": number,"seen_at": string | null,"unlocked_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "badge": string,"metal": number,"seen_at"?: string | null,"unlocked_at"?: string,"user_id": string
                  }
                  Update: {
                    "badge"?: string,"metal"?: number,"seen_at"?: string | null,"unlocked_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_badges_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_badges_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_items": {
                  Row: {
                    "acquired_at": string,"item": string,"quantity": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "acquired_at"?: string,"item": string,"quantity"?: number,"user_id": string
                  }
                  Update: {
                    "acquired_at"?: string,"item"?: string,"quantity"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_items_item_fkey"
      columns: ["item"]
isOneToOne: false
      referencedRelation: "shop_items"
      referencedColumns: ["item"]
    },{
      foreignKeyName: "user_items_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_items_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"wishlist_ranks": {
                  Row: {
                    "created_at": string,"game_id": number,"position": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"game_id": number,"position": number,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"game_id"?: number,"position"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wishlist_ranks_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wishlist_ranks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wishlist_ranks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"xp_events": {
                  Row: {
                    "created_at": string,"data": NonNullable<Json>,"id": number,"key": string,"source": string,"user_id": string,"xp": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"data"?: NonNullable<Json>,"id"?: never,"key": string,"source": string,"user_id": string,"xp": number
                  }
                  Update: {
                    "created_at"?: string,"data"?: NonNullable<Json>,"id"?: never,"key"?: string,"source"?: string,"user_id"?: string,"xp"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "xp_events_source_fkey"
      columns: ["source"]
isOneToOne: false
      referencedRelation: "xp_rules"
      referencedColumns: ["source"]
    },{
      foreignKeyName: "xp_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "xp_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"xp_rules": {
                  Row: {
                    "active": boolean,"daily_cap": number | null,"source": string,"xp": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"daily_cap"?: number | null,"source": string,"xp": number
                  }
                  Update: {
                    "active"?: boolean,"daily_cap"?: number | null,"source"?: string,"xp"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "admin_activity_feed": {
                  Row: {
                    "actor_accent": string | null,"actor_avatar_url": string | null,"actor_id": string | null,"actor_username": string | null,"created_at": string,"data": NonNullable<Json>,"game_cover_url": string | null,"game_id": number | null,"game_title": string | null,"id": number,"kind": string,"message_excerpt": string | null,"subject_id": string | null,"subject_username": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"admin_game_feed": {
                  Row: {
                    "actor_id": string | null,"actor_username": string | null,"created_at": string,"data": NonNullable<Json>,"game_cover_url": string | null,"game_id": number | null,"game_igdb_id": number | null,"game_is_trending": boolean | null,"game_slug": string | null,"game_title": string | null,"id": number,"kind": string,"source": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"admin_user_directory": {
                  Row: {
                    "accent": string,"active_day_count": number | null,"avatar_url": string | null,"created_at": string,"friend_count": number | null,"id": string,"is_admin": boolean,"last_seen_at": string,"log_count": number | null,"message_count": number | null,"onboarded_at": string | null,"review_count": number | null,"username": string
                  }
                  ComputedFields: never
                  Insert: {
                           "accent"?: string | null,"active_day_count"?: never,"avatar_url"?: string | null,"created_at"?: string | null,"friend_count"?: never,"id"?: string | null,"is_admin"?: boolean | null,"last_seen_at"?: string | null,"log_count"?: never,"message_count"?: never,"onboarded_at"?: string | null,"review_count"?: never,"username"?: string | null
                         }
                        Update: {
                           "accent"?: string | null,"active_day_count"?: never,"avatar_url"?: string | null,"created_at"?: string | null,"friend_count"?: never,"id"?: string | null,"is_admin"?: boolean | null,"last_seen_at"?: string | null,"log_count"?: never,"message_count"?: never,"onboarded_at"?: string | null,"review_count"?: never,"username"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"announcement_cards": {
                  Row: {
                    "body": string,"created_at": string,"email_broadcast_id": string | null,"emailed_at": string | null,"id": number,"link_path": string | null,"patch_note_message_id": number | null,"read_count": number | null,"recipient_count": number,"retracted_at": string | null,"sent_by": string | null,"title": string,"tone": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "announcements_patch_note_message_id_fkey"
      columns: ["patch_note_message_id"]
isOneToOne: false
      referencedRelation: "community_message_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "announcements_patch_note_message_id_fkey"
      columns: ["patch_note_message_id"]
isOneToOne: false
      referencedRelation: "community_messages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "announcements_sent_by_fkey"
      columns: ["sent_by"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "announcements_sent_by_fkey"
      columns: ["sent_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"community_message_cards": {
                  Row: {
                    "author_accent": string | null,"author_avatar_url": string | null,"author_first_name": string | null,"author_id": string | null,"author_username": string | null,"body": Json | null,"created_at": string,"deleted_at": string | null,"edited_at": string | null,"id": number,"is_opening": boolean,"parent_id": number | null,"patch_note": Json | null,"thread_id": number,"vote_count": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "community_messages_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_messages_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_messages_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "community_message_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_messages_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "community_messages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_messages_thread_id_fkey"
      columns: ["thread_id"]
isOneToOne: false
      referencedRelation: "community_thread_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_messages_thread_id_fkey"
      columns: ["thread_id"]
isOneToOne: false
      referencedRelation: "community_threads"
      referencedColumns: ["id"]
    }
                  ]
                },"community_thread_cards": {
                  Row: {
                    "author_accent": string | null,"author_avatar_url": string | null,"author_first_name": string | null,"author_id": string | null,"author_username": string | null,"contributor_count": number | null,"contributors": Json | null,"created_at": string,"game_cover_url": string | null,"game_has_sexual_content": boolean | null,"game_id": number | null,"game_slug": string | null,"game_title": string | null,"id": number,"last_activity_at": string,"message_count": number | null,"recent_message_count": number | null,"subject_kind": string,"title": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "community_threads_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_threads_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_threads_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    }
                  ]
                },"friend_activity": {
                  Row: {
                    "actor_accent": string,"actor_avatar_url": string | null,"actor_last_seen_at": string,"actor_username": string,"game_cover_url": string | null,"game_has_sexual_content": boolean,"game_id": number,"game_title": string,"hours_played": number | null,"log_id": number,"played_status": string | null,"rating": number | null,"status": string,"system_slug": string | null,"updated_at": string,"user_id": string,"viewer_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "game_logs_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_logs_system_slug_fkey"
      columns: ["system_slug"]
isOneToOne: false
      referencedRelation: "platform_systems"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "game_logs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_logs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"friend_edges": {
                  Row: {
                    "created_at": string | null,"friend_id": string | null,"requested_by": string | null,"status": string | null,"updated_at": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"game_list_cards": {
                  Row: {
                    "colour": string | null,"cover_game_ids": (number)[] | null,"created_at": string,"description": string,"first_game_ids": (number)[] | null,"game_count": number | null,"id": number,"name": string,"owner_accent": string,"owner_avatar_url": string | null,"owner_username": string,"owner_visibility": string,"ranked": boolean,"updated_at": string,"user_id": string,"visibility": string,"vote_count": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "game_lists_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_lists_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"game_log_rollups": {
                  Row: {
                    "completion": number | null,"ending_rank": number | null,"first_added_at": string | null,"game_avg_rating": number | null,"game_critic_score": number | null,"game_id": number,"game_release_date": string | null,"game_title": string,"hours_played": number | null,"hours_to_beat": number | null,"last_played": string | null,"latest_log_id": number | null,"log_count": number | null,"played_endings": (string)[] | null,"rating": number | null,"statuses": (string)[] | null,"updated_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "game_logs_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_logs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_logs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"gaming_25_cards": {
                  Row: {
                    "centre_game_id": number | null,"created_at": string,"love_count": number | null,"owner_accent": string,"owner_avatar_url": string | null,"owner_username": string,"owner_visibility": string,"pick_count": number | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "gaming_25s_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gaming_25s_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"member_ratings": {
                  Row: {
                    "game_id": number,"rating": number | null,"user_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "game_logs_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_logs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_logs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"review_cards": {
                  Row: {
                    "author_accent": string | null,"author_avatar_url": string | null,"author_first_name": string | null,"author_last_seen_at": string | null,"author_profile_visibility": string | null,"author_username": string | null,"body": string,"contains_spoilers": boolean,"created_at": string,"game_cover_url": string | null,"game_has_sexual_content": boolean,"game_id": number,"game_slug": string,"game_title": string,"hours_played": number | null,"id": number,"is_public": boolean,"log_id": number,"platform_slug": string | null,"played_status": string | null,"rating": number | null,"status": string | null,"system_slug": string | null,"updated_at": string,"user_id": string,"vote_count": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "game_logs_platform_slug_fkey"
      columns: ["platform_slug"]
isOneToOne: false
      referencedRelation: "platforms"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "game_logs_system_slug_fkey"
      columns: ["system_slug"]
isOneToOne: false
      referencedRelation: "platform_systems"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "reviews_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_log_fk"
      columns: ["log_id","user_id","game_id"]
isOneToOne: false
      referencedRelation: "friend_activity"
      referencedColumns: ["log_id","user_id","game_id"]
    },{
      foreignKeyName: "reviews_log_fk"
      columns: ["log_id","user_id","game_id"]
isOneToOne: false
      referencedRelation: "game_logs"
      referencedColumns: ["id","user_id","game_id"]
    },{
      foreignKeyName: "reviews_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "admin_user_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "admin_activity_counts":
{ Args: { "p_game": number,"p_since": string,"p_user": string }; Returns: {
              "events": number,"kind": string
            }[]
                           },
"admin_cohorts":
{ Args: { "p_weeks"?: number }; Returns: {
              "back_month": number,"back_week": number,"logged_three": number,"month_due": number,"onboarded": number,"referred": number,"referred_back_week": number,"referred_going": number,"referred_onboarded": number,"referred_week_due": number,"signed_up": number,"week": string,"week_due": number
            }[]
                           },
"admin_metric_detail":
{ Args: { "p_from": string,"p_metric": string,"p_to": string }; Returns: Json
                           },
"admin_progress":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_return_curve":
{ Args: { "p_days": number,"p_from": string,"p_to": string }; Returns: {
              "back": number,"day": number,"due": number,"invited_back": number,"invited_due": number
            }[]
                           },
"admin_series":
{ Args: { "p_bucket": string,"p_from": string,"p_to": string }; Returns: {
              "active": number,"active_week": number,"bucket": string,"logs": number,"messages": number,"reviews": number,"signups": number,"threads": number
            }[]
                           },
"admin_staying":
{ Args: { "p_from": string,"p_to": string }; Returns: {
              "back_month": number,"back_week": number,"invited": number,"invited_back_week": number,"invited_week_due": number,"joined": number,"logged_three": number,"month_due": number,"onboarded": number,"week_due": number
            }[]
                           },
"admin_totals":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"award_tokens":
{ Args: { "p_amount": number,"p_key": string,"p_source": string,"p_user": string }; Returns: undefined
                           },
"award_xp":
{ Args: { "p_at"?: string,"p_data"?: Json,"p_key": string,"p_source": string,"p_user": string,"p_xp"?: number }; Returns: undefined
                           },
"badge_holders":
{ Args: Record<PropertyKey, never>; Returns: {
              "badge": string,"holders": number,"metal": number
            }[]
                           },
"broadcast_announcement":
{ Args: { "p_id": number }; Returns: number
                           },
"bump_community_thread_activity":
{ Args: { "p_data": Json,"p_dedupe_key": string,"p_user_id": string }; Returns: undefined
                           },
"bump_igdb_usage":
{ Args: { "p_error": string,"p_failed": boolean }; Returns: undefined
                           },
"buy_background":
{ Args: { "p_game": number,"p_url": string,"p_user": string }; Returns: Json
                           },
"buy_item":
{ Args: { "p_item": string,"p_user": string }; Returns: Json
                           },
"catalogue_storage":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"community_latest_replies":
{ Args: { "p_limit": number,"p_show_sexual": boolean }; Returns: {
              "author_accent": string,"author_avatar_url": string,"author_first_name": string,"author_id": string,"author_username": string,"body": Json,"created_at": string,"id": number,"thread_id": number,"thread_title": string
            }[]
                           },
"community_thread_activity":
{ Args: { "p_thread_id": number }; Returns: {
              "day": string,"message_count": number
            }[]
                           },
"community_thread_search":
{ Args: { "p_query": string }; Returns: number[]
                           },
"community_trending_games":
{ Args: { "p_limit": number,"p_show_sexual": boolean }; Returns: {
              "cover_url": string,"game_id": number,"recent_message_count": number,"title": string
            }[]
                           },
"create_community_thread":
{ Args: { "p_author_id": string,"p_body": Json,"p_game_id": number,"p_subject_kind": string,"p_title": string }; Returns: number
                           },
"email_send_totals":
{ Args: { "p_since": string }; Returns: {
              "day": string,"kind": string,"recipients": number,"sends": number,"status": string,"transactional": boolean
            }[]
                           },
"erase_account_traces":
{ Args: { "p_id": string }; Returns: undefined
                           },
"game_fans":
{ Args: { "p_game": number,"p_limit"?: number }; Returns: {
              "accent": string,"avatar_url": string,"bio": string,"id": string,"last_seen_at": string,"rating": number,"username": string
            }[]
                           },
"game_playrates_stats":
{ Args: { "p_game_id": number }; Returns: {
              "achievement_tracked_count": number,"avg_completion": number,"avg_hours_played": number,"avg_hours_to_beat": number
            }[]
                           },
"game_rating_summary":
{ Args: { "p_game_id": number }; Returns: {
              "average": number,"buckets": (number)[],"total": number
            }[]
                           },
"game_status_counts":
{ Args: { "p_game_id": number }; Returns: {
              "backlog": number,"finished": number,"mastered": number,"played": number,"playing": number,"retired": number,"shelved": number,"total": number,"wishlist": number
            }[]
                           },
"gift_item":
{ Args: { "p_giver": string,"p_item": string,"p_recipient": string }; Returns: Json
                           },
"grant_background_credit":
{ Args: { "p_user": string }; Returns: boolean
                           },
"log_rank":
{ Args: { "p_played_status": string,"p_status": string }; Returns: number
                           },
"member_emails":
{ Args: { "p_ids": (string)[] }; Returns: {
              "email": string,"email_prefs": Json,"id": string,"username": string
            }[]
                           },
"member_id_by_email":
{ Args: { "p_email": string }; Returns: string
                           },
"nudge_candidates":
{ Args: { "p_now"?: string,"p_since": string }; Returns: {
              "month_counts": Json,"month_habits": Json,"shields": (string)[],"spare": number,"swaps": Json,"timezone": string,"user_id": string,"week_counts": Json,"week_habits": Json,"weeks": (string)[]
            }[]
                           },
"player_metrics":
{ Args: { "p_user": string }; Returns: Json
                           },
"player_weeks":
{ Args: { "p_user": string }; Returns: {
              "week": string
            }[]
                           },
"profile_exists":
{ Args: { "p_id": string }; Returns: boolean
                           },
"prune_old_rows":
{ Args: { "p_batch"?: number }; Returns: Json
                           },
"purge_orphan_game_events":
{ Args: { "p_limit": number }; Returns: number
                           },
"purge_unlinked_games":
{ Args: { "p_limit": number }; Returns: number
                           },
"raise_notifications_once":
{ Args: { "p_rows": Json }; Returns: number
                           },
"raise_notifications_once_new":
{ Args: { "p_rows": Json }; Returns: {
              "dedupe_key": string,"kind": string,"user_id": string
            }[]
                           },
"raise_upvote_milestone":
{ Args: { "p_data": Json,"p_dedupe_key": string,"p_kind": string,"p_milestone": number,"p_user_id": string }; Returns: undefined
                           },
"random_profile_accent":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"record_email_event":
{ Args: { "p_broadcast_id": string,"p_detail": string,"p_resend_id": string,"p_status": string,"p_to": string }; Returns: number
                           },
"revoke_xp":
{ Args: { "p_key": string,"p_user": string }; Returns: undefined
                           },
"revoke_xp_key":
{ Args: { "p_key": string }; Returns: undefined
                           },
"rich_text_plain":
{ Args: { "p_node": Json }; Returns: string
                           },
"search_games":
{ Args: { "p_include_sexual": boolean,"p_limit": number,"p_query": string }; Returns: {
              "id": number,"tier": number
            }[]
                           },
"search_key":
{ Args: { "p_text": string }; Returns: string
                           },
"search_words":
{ Args: { "p_text": string }; Returns: (string)[]
                           },
"set_favourite_games":
{ Args: { "p_game_ids": (number)[],"p_user_id": string }; Returns: undefined
                           },
"set_game_alt_names":
{ Args: { "p_rows": Json }; Returns: number
                           },
"set_game_banners":
{ Args: { "p_rows": Json }; Returns: number
                           },
"set_game_list_items":
{ Args: { "p_game_ids": (number)[],"p_list_id": number }; Returns: undefined
                           },
"set_game_series":
{ Args: { "p_rows": Json }; Returns: number
                           },
"set_gaming_25_pick":
{ Args: { "p_category": string,"p_game_id": number,"p_user_id": string }; Returns: undefined
                           },
"set_trending":
{ Args: { "p_ids": (number)[] }; Returns: undefined
                           },
"set_wishlist_order":
{ Args: { "p_game_ids": (number)[],"p_user_id": string }; Returns: undefined
                           },
"sitemap_games":
{ Args: { "p_limit": number,"p_offset": number }; Returns: Json
                           },
"take_email_slots":
{ Args: { "p_cap": number,"p_count": number,"p_kind": string,"p_transactional": boolean }; Returns: {
              "granted": number,"id": number
            }[]
                           },
"taste_matches":
{ Args: { "p_limit"?: number,"p_user": string }; Returns: {
              "accent": string,"agreement": number,"avatar_url": string,"bio": string,"id": string,"last_seen_at": string,"shared": number,"username": string
            }[]
                           },
"touch_last_seen":
{ Args: { "p_user_id": string }; Returns: undefined
                           },
"use_item":
{ Args: { "p_item": string,"p_user": string }; Returns: number
                           },
"user_log_stats":
{ Args: { "p_user_id": string,"p_year"?: number }; Returns: {
              "average_rating": number,"backlog": number,"game_count": number,"hours_played": number,"log_count": number,"played": number,"playing": number,"rated_games": number,"wishlist": number
            }[]
                           },
"weekly_digest":
{ Args: { "p_from": string,"p_since": string,"p_to": string }; Returns: {
              "friends": Json,"logged": number,"releases": Json,"user_id": string
            }[]
                           },
"wishlist_releases_on":
{ Args: { "p_day": string }; Returns: {
              "cover_url": string,"game_id": number,"slug": string,"title": string,"user_id": string
            }[]
                           },
"xp_since":
{ Args: { "p_since": string,"p_users": (string)[] }; Returns: {
              "user_id": string,"xp": number
            }[]
                           },
"xp_sync_game":
{ Args: { "p_game": number,"p_user": string }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
