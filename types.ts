import React from 'react';

export interface DashboardMetric {
  data: string;
  id: string | number;
  
  // Comercial
  aguardando_analise: number;
  followups_realizados: number;
  contratos_fechados: number;
  n5_contrato_assinado: number;

  // Pós-Venda
  clientes_pendentes_total: number;
  onboard_realizado: number;
  n1_onboard_pendente: number;
  n2_aguardando_agendamento: number;
  n3_reuniao_marcada: number;
  n3_reuniao_feita: number;
  n4_aguardando_documentacao: number;
  n5_organizando_dcs: number;
  documentacao_completa: number;

  // Jurídico
  producao_de_inicial: number;
  revisao_de_inicial: number;
  processos_protocolados: number;
  arquivados: number;

  // Suporte
  suporte_aguardando_atendimento: number;
  suporte_atendimentos_finalizados: number;

  // Financeiro
  financeiro_aguardando_atendimento: number;
  contato_inicial_acordo_pendente: number;

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
  config: SupabaseConfig;
}