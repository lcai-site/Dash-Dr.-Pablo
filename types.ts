import React from 'react';

export interface DashboardMetric {
  data: string; // Coluna de data no lead
  telefone: string | number; 
  contratos_fechados: number;
  
  // Comercial
  aguardando_analise: number;
  followups_realizados: number;
  
  // Fluxo N (Etapas Numeradas)
  n1_onboard_pendente: number;
  n2_aguardando_agendamento: number;
  n3_reuniao_marcada: number;
  n3_reuniao_feita: number;
  n4_aguardando_documentacao: number;
  n5_organizando_dcs: number;
  n5_contrato_assinado: number;
  
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
  processos_arquivados: number;
  
  // Suporte (placeholders - adicionar ao Supabase)
  suporte_aguardando_atendimento?: number;
  suporte_atendimentos_finalizados?: number;
  
  // Financeiro (placeholders - adicionar ao Supabase)
  financeiro_aguardando_atendimento?: number;
  financeiro_contato_inicial_pendente?: number;

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