import { SupabaseConfig, DashboardMetric, DateRange, FinancialSettings, Investment } from '../types';

const TABLES = {
  METRICS: 'leads',
  INVESTMENTS: 'investimentos',
  SETTINGS: 'financial_settings'
};

// Função para converter qualquer formato de data do CSV (BR, ISO, _00:00:00) em um objeto Date válido para comparação
const parseFlexibleDate = (dateStr: any): Date | null => {
  if (!dateStr) return null;
  try {
    const clean = String(dateStr).split('_')[0].split('T')[0].split(' ')[0].trim();
    
    // Caso DD/MM/YYYY
    if (clean.includes('/')) {
      const [d, m, y] = clean.split('/');
      return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
    }
    
    // Caso YYYY-MM-DD
    if (clean.includes('-')) {
      const [y, m, d] = clean.split('-');
      // Verifica se o primeiro é ano ou dia
      if (y.length === 4) {
        return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
      } else {
        return new Date(Number(d), Number(m) - 1, Number(y), 12, 0, 0);
      }
    }
    return new Date(dateStr);
  } catch (e) {
    return null;
  }
};

const handleSupabaseError = async (response: Response, context: string) => {
  if (!response.ok) {
    let errorDetail = "";
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.message || errorJson.hint || errorJson.details || response.statusText;
    } catch (e) {
      errorDetail = response.statusText || "Erro de rede ou CORS";
    }
    throw new Error(`${context}: ${errorDetail}`);
  }
};

const normalizeLeadValue = (val: any): number => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === 'number') return val > 0 ? 1 : 0;
  
  const str = String(val).toLowerCase().trim();
  const positiveValues = ['sim', 's', 'x', 'v', 'verdadeiro', 'true', 'assinado', 'fechado', 'ok', 'concluido', 'yes', '1'];
  
  if (positiveValues.includes(str)) return 1;
  const parsed = parseFloat(str);
  if (!isNaN(parsed) && parsed > 0) return 1;
  return 0;
};

export const fetchDashboardMetrics = async (
  config: SupabaseConfig, 
  range: DateRange
): Promise<DashboardMetric[]> => {
  const baseUrl = config.url.replace(/\/$/, "");
  
  // No fetch inicial, pegamos um range maior para garantir que o parse manual local funcione
  const endpoint = `${baseUrl}/rest/v1/${TABLES.METRICS}?select=*&order=data.asc`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': config.key,
        'Authorization': `Bearer ${config.key}`,
        'Content-Type': 'application/json'
      }
    });

    await handleSupabaseError(response, `Erro ao buscar dados na tabela '${TABLES.METRICS}'`);

    const data: any[] = await response.json();

    return data.map(record => {
        const formatted: any = {};
        Object.keys(record).forEach(key => {
            const rawVal = record[key];
            if (['data', 'id', 'telefone', 'nome', 'email', 'origem', 'status'].includes(key)) {
                formatted[key] = rawVal;
            } else {
                formatted[key] = normalizeLeadValue(rawVal);
            }
        });
        // Adicionamos um campo de data normalizada para facilitar a vida do componente
        formatted._parsedDate = parseFlexibleDate(record.data);
        return formatted as DashboardMetric;
    });

  } catch (error: any) {
    console.error("Supabase Fetch Error:", error);
    throw error;
  }
};

export const fetchFinancialSettings = async (config: SupabaseConfig): Promise<FinancialSettings> => {
  const baseUrl = config.url.replace(/\/$/, "");
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
    const baseUrl = config.url.replace(/\/$/, "");
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
    await handleSupabaseError(response, "Erro ao salvar ticket");
};

export const fetchInvestments = async (config: SupabaseConfig): Promise<Investment[]> => {
  const baseUrl = config.url.replace(/\/$/, "");
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
  const baseUrl = config.url.replace(/\/$/, "");
  const endpoint = `${baseUrl}/rest/v1/${TABLES.INVESTMENTS}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'apikey': config.key, 'Authorization': `Bearer ${config.key}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(investment)
  });
  await handleSupabaseError(response, "Erro ao salvar investimento");
};

export const updateInvestment = async (config: SupabaseConfig, id: string | number, investment: Omit<Investment, 'id'>): Promise<void> => {
  const baseUrl = config.url.replace(/\/$/, "");
  const endpoint = `${baseUrl}/rest/v1/${TABLES.INVESTMENTS}?id=eq.${id}`;
  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: { 'apikey': config.key, 'Authorization': `Bearer ${config.key}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(investment)
  });
  await handleSupabaseError(response, "Erro ao atualizar investimento");
};

export const deleteInvestment = async (config: SupabaseConfig, id: string | number): Promise<void> => {
  const baseUrl = config.url.replace(/\/$/, "");
  const endpoint = `${baseUrl}/rest/v1/${TABLES.INVESTMENTS}?id=eq.${id}`;
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: { 'apikey': config.key, 'Authorization': `Bearer ${config.key}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }
  });
  await handleSupabaseError(response, "Falha na exclusão");
};