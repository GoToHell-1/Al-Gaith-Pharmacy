import React from 'react';

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  expiry: string;
  notes: string;
  image: string | null;
}

export type InventoryData = Record<string, Omit<InventoryItem, 'id'>>;

export const EMPLOYEES = ['ايهاب', 'بسام', 'ضحى', 'حوراء', 'سارة', 'معاذ', 'محمود', 'نزار'];

export interface StatProps {
  label: string;
  value: number;
  isWarning?: boolean;
  icon?: React.ReactNode;
}