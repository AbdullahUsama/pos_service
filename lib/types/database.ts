export interface Database {
  public: {
    Tables: {
      items: {
        Row: {
          id: string;
          name: string;
          price: number;
          quantity?: number;
          created_at?: string;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          quantity?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price?: number;
          quantity?: number;
          created_at?: string;
        };
      };
      sales: {
        Row: {
          id: string;
          cashier_id: string;
          created_at: string;
          total_amount: number;
          payment_method: 'Cash' | 'Transfer';
          cart_details: CartItem[];
        };
        Insert: {
          id?: string;
          cashier_id: string;
          created_at?: string;
          total_amount: number;
          payment_method: 'Cash' | 'Transfer';
          cart_details: CartItem[];
        };
        Update: {
          id?: string;
          cashier_id?: string;
          created_at?: string;
          total_amount?: number;
          payment_method?: 'Cash' | 'Transfer';
          cart_details?: CartItem[];
        };
      };
      profiles: {
        Row: {
          id: string;
          role: 'admin' | 'cashier';
          username?: string;
          created_at?: string;
        };
        Insert: {
          id: string;
          role?: 'admin' | 'cashier';
          username?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: 'admin' | 'cashier';
          username?: string;
          created_at?: string;
        };
      };
      notes: {
        Row: {
          id: string;
          cashier_id: string;
          title: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cashier_id: string;
          title: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cashier_id?: string;
          title?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Item {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  created_at?: string;
}

export interface Sale {
  id: string;
  cashier_id: string;
  created_at: string;
  total_amount: number;
  payment_method: 'Cash' | 'Transfer';
  cart_details: CartItem[];
  cashier_email?: string; // Optional field for admin views
}

export interface Profile {
  id: string;
  role: 'admin' | 'cashier';
  username?: string;
  created_at?: string;
}

export interface Note {
  id: string;
  cashier_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  cashier_email?: string; // Optional field for admin views
}

export type UserRole = 'admin' | 'cashier';