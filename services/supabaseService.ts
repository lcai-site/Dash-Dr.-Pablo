import { SupabaseConfig, DashboardMetric, DateRange, FinancialSettings, Investment } from '../types';

const TABLES = {
  METRICS: 'dashboard_diario',
  METRICS_FALLBACK: 'leads',
  INVESTMENTS: 'investimentos',
  SETTINGS: 'financial_settings'
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
    if (errorDetail.includes("Could not find the table") || response.status === 404) {
       throw new Error(`TABLE_NOT_FOUND|${context}`);
    }
    throw new Error(`${context}: ${errorDetail}`);
  }
};

export const fetchDashboardMetrics = async (
  config: SupabaseConfig, 
  range: DateRange,
  useFallback: boolean = false
): Promise<DashboardMetric[]> => {
  const baseUrl = config.url.replace(/\/$/, "");
  const startDate = range.start.toISOString().split('T')[0];
  const endDate = range.end.toISOString().split('T')[0];
  
  const tableName = useFallback ? TABLES.METRICS_FALLBACK : TABLES.METRICS;
  const endpoint = `${baseUrl}/rest/v1/${tableName}?select=*&data=gte.${startDate}&data=lte.${endDate}&order=data.asc`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': config.key,
        'Authorization': `Bearer ${config.key}`,
        'Content-Type': 'application/json'
      }
    });

    try {
      await handleSupabaseError(response, `Erro na tabela '${tableName}'`);
    } catch (err: any) {
      if (err.message.startsWith('TABLE_NOT_FOUND') && !useFallback) {
        return fetchDashboardMetrics(config, range, true);
      }
      throw err;
    }

    const data: any[] = await response.json();

    return data.map(record => {
        const formatted: any = {};
        Object.keys(record).forEach(key => {
            const rawVal = record[key];
            if (key === 'data' || key === 'id' || key === 'telefone') {
                formatted[key] = rawVal;
            } else {
                if (typeof rawVal === 'string') {
                    const normalized = rawVal.toLowerCase().trim();
                    if (normalized === 'sim' || normalized === 's' || normalized === 'x') {
                        formatted[key] = 1;
                    } else {
                        const parsed = parseFloat(rawVal);
                        formatted[key] = isNaN(parsed) ? 0 : parsed;
                    }
                } else if (typeof rawVal === 'number') {
                    formatted[key] = rawVal;
                } else {
                    formatted[key] = 0;
                }
            }
        });
        return formatted as DashboardMetric;
    });

  } catch (error: any) {
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
        if (data && data.length > 0) {
            return { id: data[0].id, average_ticket: Number(data[0].average_ticket) || 0 };
        }
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
        headers: {
            'apikey': config.key,
            'Authorization': `Bearer ${config.key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
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
      id: item.id,
      data_inicio: item.data_inicio,
      data_fim: item.data_fim,
      valor: Number(item.valor) || 0,
      plataforma: item.plataforma || 'N/A'
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
    headers: {
      'apikey': config.key,
      'Authorization': `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(investment)
  });
  await handleSupabaseError(response, "Erro ao salvar investimento");
};

export const updateInvestment = async (config: SupabaseConfig, id: string | number, investment: Omit<Investment, 'id'>): Promise<void> => {
  const baseUrl = config.url.replace(/\/$/, "");
  const endpoint = `${baseUrl}/rest/v1/${TABLES.INVESTMENTS}?id=eq.${id}`;
  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: {
      'apikey': config.key,
      'Authorization': `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(investment)
  });
  await handleSupabaseError(response, "Erro ao atualizar investimento");
};

export const deleteInvestment = async (config: SupabaseConfig, id: string | number): Promise<void> => {
  const baseUrl = config.url.replace(/\/$/, "");
  const endpoint = `${baseUrl}/rest/v1/${TABLES.INVESTMENTS}?id=eq.${id}`;
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: {
      'apikey': config.key,
      'Authorization': `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  });
  await handleSupabaseError(response, "Falha na exclusão");
  const data = await response.json();
  if (Array.isArray(data) && data.length === 0) {
    throw new Error(`BLOQUEIO: Registro não removido. Verifique RLS Policy de DELETE.`);
  }
};