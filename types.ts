import React from 'react';

// Represents a row in the 'dashboard_diario' view
export interface DashboardMetric {
  data_referencia: string;
  taxa_conversao_percentual: number;
  aguardando_analise: number;
  contratos_fechados: number;
  clientes_pendentes_total: number;
  aguardando_agendamento: number;
  aguardando_documentacao: number;
  
  // New columns for precise calculation
  total_leads_dia?: number;
  total_contratos_dia?: number;

  // Flexible to allow other number columns if the view expands
  [key: string]: string | number | undefined;
}

export interface SupabaseConfig {
  url: string;
  key: string;
}

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export interface FinancialSettings {
  id?: number;
  average_ticket: number;
  // Legacy or unused fields can be ignored, focusing on ticket
}

export interface Investment {
  id: number;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  amount: number;
}

export interface KPICardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  colorClass: string;
}