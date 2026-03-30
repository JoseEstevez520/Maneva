// Este fichero es GENERADO automáticamente por Supabase CLI.
// NUNCA editar a mano. Ejecutar este comando para regenerarlo:
//   npx supabase gen types typescript --project-id TU_PROJECT_ID > src/types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// TODO: Reemplazar este placeholder con los tipos reales generados por Supabase CLI
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'client' | 'owner' | 'stylist'
          full_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          role?: 'client' | 'owner' | 'stylist'
          full_name?: string | null
          avatar_url?: string | null
        }
        Update: {
          role?: 'client' | 'owner' | 'stylist'
          full_name?: string | null
          avatar_url?: string | null
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
