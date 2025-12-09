import { DashboardMetric, SupabaseConfig } from './types';

// Safely access env vars to prevent crashes if import.meta.env is undefined in some contexts
const getEnv = (key: string) => {
  try {
    return import.meta.env[key] || "";
  } catch (e) {
    return "";
  }
};

// Fallback credentials provided by user to ensure app works without Env Vars immediately
const FALLBACK_URL = "https://oeoieuxfqlsbiqfvwdjf.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lb2lldXhmcWxzYmlxZnZ3ZGpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMDgyNDAsImV4cCI6MjA4MDY4NDI0MH0.RLOroSo0Ln8I-GQEk2n_4-FPnx5bFXOSplff-Hyu6HQ";

export const SUPABASE_CONFIG: SupabaseConfig = {
  url: getEnv('VITE_SUPABASE_URL') || FALLBACK_URL,
  key: getEnv('VITE_SUPABASE_KEY') || FALLBACK_KEY
};

// Helper to generate dates relative to today
const daysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
};

export const DEMO_METRICS: DashboardMetric[] = Array.from({ length: 30 }).map((_, i) => {
  const date = daysAgo(29 - i);
  
  return {
    data_referencia: date,
    taxa_conversao_percentual: Number((Math.random() * 5 + 2).toFixed(2)), // 2.00 to 7.00
    aguardando_analise: Math.floor(Math.random() * 10) + 1, // 1 to 10
    contratos_fechados: Math.floor(Math.random() * 3), // 0 to 2
    clientes_pendentes_total: Math.floor(Math.random() * 5),
    aguardando_agendamento: Math.floor(Math.random() * 4),
    aguardando_documentacao: Math.floor(Math.random() * 6),
  };
});