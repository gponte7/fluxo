export type TxType = 'entrada' | 'saida'
export interface Category { id: string; user_id: string; name: string; type: TxType; color: string; created_at: string }
export interface Tx {
  id: string; user_id: string; type: TxType; amount: number; category_id: string
  description: string | null; note: string | null; date: string; external_id: string | null; source: string; created_at: string; updated_at: string
}
