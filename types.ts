import React from 'react';

export interface DashboardMetric {
  data: string; // Coluna de data no lead
  telefone: string | number; 
  contratos_fechados: number;
  n3_reuniao_feita: number;
  
  // Pós-Venda
  clientes_pendentes_total: number;
  onboard_realizado: number;
  aguardando_agendamento: number;
  aguardando_documentacao: number;
  documentacao_completa: number;
  
  // Jurídico
  producao_de_inicial: number;
  revisao_de_inicial: number;
  processos_protocolados: number;
  taxa_aproveitamento: number;

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
}

export interface Investment {
  id: string | number;
  data_inicio: string; 
  data_fim: string;   
  valor: number;
  plataforma: string;
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

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: FinancialSettings;
  investments: Investment[];
  onSaveSettings: (settings: FinancialSettings) => Promise<void>;
  onRefreshData: () => void;
  config: SupabaseConfig; // Adicionado para garantir que o modal use as mesmas chaves do App
}