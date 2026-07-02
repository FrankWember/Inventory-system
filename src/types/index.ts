// BarTrack TypeScript Types

export type Category = 'Bière' | 'Soda' | 'Jus' | 'Eau' | 'Vin' | 'Autre'
export type ExpenseCategory = 'Approvisionnement' | 'Salaires' | 'Loyer' | 'Électricité/Eau' | 'Réparations' | 'Transport' | 'Autre'

export interface Drink {
  id: string
  user_id: string
  name: string
  category: Category
  price: number  // Selling price per unit (FCFA)
  cost: number  // Cost per unit (FCFA) - calculated from cassier_cost / cassier_quantity
  stock: number
  min_stock: number
  rack_size: number  // Number of units per rack (default 12 for beers) - DEPRECATED, use cassier_quantity
  cassier_quantity?: number  // Number of units in a cassier (replaces rack_size)
  cassier_cost?: number  // Total cost of one cassier (FCFA)
  supplier: string
  notes: string
  active: boolean
  created_at: string
}

export interface SessionLine {
  id: string
  user_id: string
  session_id: string
  drink_id: string
  drink_name: string
  opening_stock: number
  purchased: number
  sold: number
  closing_stock: number
  revenue: number
  cost: number
}

export interface Session {
  id: string
  user_id: string
  date: string
  label: string
  total_purchase: number
  total_revenue: number
  total_cost: number
  total_profit: number
  closed: boolean
  created_at: string
  session_lines?: SessionLine[]
}

export interface Expense {
  id: string
  user_id: string
  date: string
  description: string
  category: ExpenseCategory
  amount: number
  created_at: string
}

export interface Settings {
  id: string
  user_id: string
  bar_name: string
  currency: string
}

// Supabase Database Types
export interface Database {
  public: {
    Tables: {
      drinks: {
        Row: Drink
        Insert: Omit<Drink, 'id' | 'created_at'>
        Update: Partial<Omit<Drink, 'id' | 'created_at'>>
      }
      sessions: {
        Row: Session
        Insert: Omit<Session, 'id' | 'created_at'>
        Update: Partial<Omit<Session, 'id' | 'created_at'>>
      }
      session_lines: {
        Row: SessionLine
        Insert: Omit<SessionLine, 'id'>
        Update: Partial<Omit<SessionLine, 'id'>>
      }
      expenses: {
        Row: Expense
        Insert: Omit<Expense, 'id' | 'created_at'>
        Update: Partial<Omit<Expense, 'id' | 'created_at'>>
      }
      settings: {
        Row: Settings
        Insert: Omit<Settings, 'id'>
        Update: Partial<Omit<Settings, 'id'>>
      }
    }
  }
}
