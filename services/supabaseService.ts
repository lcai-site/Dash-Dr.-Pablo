import { SupabaseConfig, DashboardMetric, DateRange, FinancialSettings, Investment } from '../types';

const handleSupabaseError = async (response: Response, context: string) => {
  if (!response.ok) {
    let errorDetail = "";
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.message || errorJson.hint || errorJson.details || response.statusText;
      // Se for erro de RLS, o Supabase costuma enviar mensagens específicas no 'details' ou 'message'
    } catch (e) {
      errorDetail = response.statusText || "Erro de rede ou CORS";
    }
    throw new Error(`${context}: ${errorDetail}`);
  }
};

export const fetchDashboardMetrics = async (
  config: SupabaseConfig, 
  range: DateRange
): Promise<DashboardMetric[]> => {
  const baseUrl = config.url.replace(/\/$/, "");
  const startDate = range.start.toISOString().split('T')[0];
  const endDate = range.end.toISOString().split('T')[0];

  const endpoint = `${baseUrl}/rest/v1/leads?select=*&data=gte.${startDate}&data=lte.${endDate}&order=data.asc`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': config.key,
        'Authorization': `Bearer ${config.key}`,
        'Content-Type': 'application/json'
      }
    });

    await handleSupabaseError(response, "Erro na tabela 'leads'");

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
                } else if (rawVal === null || rawVal === undefined) {
                    formatted[key] = 0;
                } else {
                    formatted[key] = 0;
                }
            }
        });
        return formatted as DashboardMetric;
    });

  } catch (error: any) {
    console.error("Fetch Metrics Detail:", error);
    throw error;
  }
};

export const fetchFinancialSettings = async (config: SupabaseConfig): Promise<FinancialSettings> => {
  const baseUrl = config.url.replace(/\/$/, "");
  const endpoint = `${baseUrl}/rest/v1/financial_settings?select=*&limit=1&order=id.desc`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': config.key,
        'Authorization': `Bearer ${config.key}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
            return {
                id: data[0].id,
                average_ticket: Number(data[0].average_ticket) || 0
            };
        }
    }
    return { average_ticket: 0 };
  } catch (error) {
    return { average_ticket: 0 };
  }
};

export const saveFinancialSettings = async (config: SupabaseConfig, settings: FinancialSettings): Promise<void> => {
    const baseUrl = config.url.replace(/\/$/, "");
    const endpoint = `${baseUrl}/rest/v1/financial_settings`;
    let targetId = settings.id;

    if (!targetId) {
      try {
        const checkResponse = await fetch(`${endpoint}?select=id&limit=1&order=id.desc`, {
          method: 'GET',
          headers: {
            'apikey': config.key,
            'Authorization': `Bearer ${config.key}`,
            'Content-Type': 'application/json'
          }
        });
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (checkData.length > 0) targetId = checkData[0].id;
        }
      } catch (e) {}
    }

    const method = targetId ? 'PATCH' : 'POST';
    const url = targetId ? `${endpoint}?id=eq.${targetId}` : endpoint;
    const payload = { average_ticket: settings.average_ticket };

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'apikey': config.key,
                'Authorization': `Bearer ${config.key}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(payload)
        });
        await handleSupabaseError(response, "Erro ao salvar ticket");
    } catch (error) {
        throw error;
    }
};

export const fetchInvestments = async (config: SupabaseConfig): Promise<Investment[]> => {
  const baseUrl = config.url.replace(/\/$/, "");
  const endpoint = `${baseUrl}/rest/v1/investimentos?select=*&order=data_inicio.desc`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': config.key,
        'Authorization': `Bearer ${config.key}`,
        'Content-Type': 'application/json'
      }
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
  const endpoint = `${baseUrl}/rest/v1/investimentos`;

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
  const endpoint = `${baseUrl}/rest/v1/investimentos?id=eq.${id}`;

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
  const endpoint = `${baseUrl}/rest/v1/investimentos?id=eq.${id}`;
  
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: {
      'apikey': config.key,
      'Authorization': `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation' // Importante para verificar se a deleção afetou linhas
    }
  });

  await handleSupabaseError(response, "Erro ao remover registro");

  // Se o retorno for um array vazio, significa que nada foi deletado (provavelmente RLS)
  const data = await response.json();
  if (Array.isArray(data) && data.length === 0) {
    throw new Error("O registro não foi excluído. Verifique se você tem permissão de DELETE na tabela 'investimentos' do Supabase.");
  }
};