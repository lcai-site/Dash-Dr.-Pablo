import { SupabaseConfig, DashboardMetric, DateRange, FinancialSettings, Investment } from '../types';

const TABLES = {
  PRIMARY: 'dashboard_diario',
  SECONDARY: 'leads',
  INVESTMENTS: 'investimentos',
  SETTINGS: 'financial_settings'
};

const parseFlexibleDate = (dateStr: any, fallbackDateStr?: any): Date => {
  // Tenta parsear a data principal
  const tryParse = (val: any): Date | null => {
      if (!val) return null;
      try {
        const clean = String(val).split('_')[0].split('T')[0].split(' ')[0].trim();
        // Formato DD/MM/YYYY
        if (clean.includes('/')) {
          const [d, m, y] = clean.split('/');
          return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
        }
        // Formato YYYY-MM-DD ou DD-MM-YYYY
        if (clean.includes('-')) {
          const [y, m, d] = clean.split('-');
          if (y.length === 4) {
            return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
          } else {
            return new Date(Number(d), Number(m) - 1, Number(y), 12, 0, 0);
          }
        }
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      } catch (e) {
        return null;
      }
  };

  const primary = tryParse(dateStr);
  if (primary) return primary;

  const secondary = tryParse(fallbackDateStr);
  if (secondary) return secondary;

  // Se tudo falhar, retorna data de HOJE para não perder o dado no dashboard
  // Isso é crucial para dados inseridos manualmente sem data definida
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return today;
};

const normalizeLeadValue = (val: any): number => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === 'number') return val;
  const str = String(val).toLowerCase().trim();
  
  // Lista expandida para capturar status descritivos além de booleanos simples
  const positiveValues = [
      'sim', 's', 'x', 'v', 'verdadeiro', 'true', 'assinado', 'fechado', 'ok', 'concluido', 'yes', '1',
      'pendente', 'em andamento', 'fila', 'aguardando', 'analise', 'acordo', 'negociacao', 'finalizado', 'resolvido', 'protocolado', 'realizado'
  ];
  
  if (positiveValues.includes(str)) return 1;
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

// Limpa a URL base removendo caminhos como /rest/v1/leads
const getBaseUrl = (configUrl: string) => {
    return configUrl.replace(/\/rest\/v1\/.*$/, "").replace(/\/$/, "");
};

const makeRequest = async (config: SupabaseConfig, table: string) => {
    const baseUrl = getBaseUrl(config.url);
    // Alterado para order=data.desc para pegar os dados mais recentes primeiro
    // Adicionado limit=3000 para garantir maior cobertura de histórico
    const endpoint = `${baseUrl}/rest/v1/${table}?select=*&order=data.desc&limit=3000`;
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': config.key,
        'Authorization': `Bearer ${config.key}`,
        'Content-Type': 'application/json'
      }
    });
    return response;
};

export const fetchDashboardMetrics = async (
  config: SupabaseConfig, 
  range: DateRange
): Promise<DashboardMetric[]> => {
  try {
    // Tenta primeiro a tabela dashboard_diario
    let response = await makeRequest(config, TABLES.PRIMARY);
    
    // Se a tabela primária não existir (404 ou erro de schema cache)
    if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        if (response.status === 404 || (errJson.message && errJson.message.includes('cache'))) {
            console.warn(`Tabela '${TABLES.PRIMARY}' não encontrada. Tentando fallback para '${TABLES.SECONDARY}'...`);
            response = await makeRequest(config, TABLES.SECONDARY);
        }
    }

    if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.message || `Erro ${response.status}: Não foi possível acessar as tabelas de dados.`);
    }

    const data: any[] = await response.json();
    return data.map(record => {
        const formatted: any = {};
        Object.keys(record).forEach(key => {
            const rawVal = record[key];
            if (['data', 'id', 'telefone', 'nome', 'email', 'origem', 'status', 'created_at'].includes(key)) {
                formatted[key] = rawVal;
            } else {
                formatted[key] = normalizeLeadValue(rawVal);
            }
        });
        // Passa created_at como fallback caso 'data' seja nulo
        formatted._parsedDate = parseFlexibleDate(record.data, record.created_at);
        return formatted as DashboardMetric;
    });

  } catch (error: any) {
    throw error;
  }
};

export const fetchFinancialSettings = async (config: SupabaseConfig): Promise<FinancialSettings> => {
  const baseUrl = getBaseUrl(config.url);
  const endpoint = `${baseUrl}/rest/v1/${TABLES.SETTINGS}?select=*&limit=1&order=id.desc`;
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'apikey': config.key, 'Authorization': `Bearer ${config.key}` }
    });
    if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) return { id: data[0].id, average_ticket: Number(data[0].average_ticket) || 0 };
    }
    return { average_ticket: 0 };
  } catch (error) {
    return { average_ticket: 0 };
  }
};

export const saveFinancialSettings = async (config: SupabaseConfig, settings: FinancialSettings): Promise<void> => {
    const baseUrl = getBaseUrl(config.url);
    const endpoint = `${baseUrl}/rest/v1/${TABLES.SETTINGS}`;
    let targetId = settings.id;
    if (!targetId) {
      try {
        const checkResponse = await fetch(`${endpoint}?select=id&limit=1&order=id.desc`, {
          method: 'GET',
          headers: { 'apikey': config.key, 'Authorization': `Bearer ${config.key}` }
        });
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (checkData.length > 0) targetId = checkData[0].id;
        }
      } catch (e) {}
    }
    const method = targetId ? 'PATCH' : 'POST';
    const url = targetId ? `${endpoint}?id=eq.${targetId}` : endpoint;
    const response = await fetch(url, {
        method: method,
        headers: { 'apikey': config.key, 'Authorization': `Bearer ${config.key}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ average_ticket: settings.average_ticket })
    });
};

export const fetchInvestments = async (config: SupabaseConfig): Promise<Investment[]> => {
  const baseUrl = getBaseUrl(config.url);
  const endpoint = `${baseUrl}/rest/v1/${TABLES.INVESTMENTS}?select=*&order=data_inicio.desc`;
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'apikey': config.key, 'Authorization': `Bearer ${config.key}` }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.map((item: any) => ({
      id: item.id, data_inicio: item.data_inicio, data_fim: item.data_fim,
      valor: Number(item.valor) || 0, plataforma: item.plataforma || 'N/A'
    }));
  } catch (error) {
    return [];
  }
};

export const addInvestment = async (config: SupabaseConfig, investment: Omit<Investment, 'id'>): Promise<void> => {
  const baseUrl = getBaseUrl(config.url);
  const endpoint = `${baseUrl}/rest/v1/${TABLES.INVESTMENTS}`;
  await fetch(endpoint, {
    method: 'POST',
    headers: { 'apikey': config.key, 'Authorization': `Bearer ${config.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(investment)
  });
};

export const updateInvestment = async (config: SupabaseConfig, id: string | number, investment: Omit<Investment, 'id'>): Promise<void> => {
  const baseUrl = getBaseUrl(config.url);
  const endpoint = `${baseUrl}/rest/v1/${TABLES.INVESTMENTS}?id=eq.${id}`;
  await fetch(endpoint, {
    method: 'PATCH',
    headers: { 'apikey': config.key, 'Authorization': `Bearer ${config.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(investment)
  });
};

export const deleteInvestment = async (config: SupabaseConfig, id: string | number): Promise<void> => {
  const baseUrl = getBaseUrl(config.url);
  const endpoint = `${baseUrl}/rest/v1/${TABLES.INVESTMENTS}?id=eq.${id}`;
  await fetch(endpoint, {
    method: 'DELETE',
    headers: { 'apikey': config.key, 'Authorization': `Bearer ${config.key}` }
  });
};