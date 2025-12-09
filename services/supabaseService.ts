import { SupabaseConfig, DashboardMetric, DateRange, FinancialSettings, Investment } from '../types';

export const fetchDashboardMetrics = async (
  config: SupabaseConfig, 
  range: DateRange
): Promise<DashboardMetric[]> => {
  const baseUrl = config.url.replace(/\/$/, "");
  
  // Format dates for query YYYY-MM-DD
  const startDate = range.start.toISOString().split('T')[0];
  const endDate = range.end.toISOString().split('T')[0];

  // Query 'dashboard_diario' view
  const endpoint = `${baseUrl}/rest/v1/dashboard_diario?select=*&data_referencia=gte.${startDate}&data_referencia=lte.${endDate}&order=data_referencia.asc`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': config.key,
        'Authorization': `Bearer ${config.key}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
    }

    const data: any[] = await response.json();

    // DYNAMIC MAPPING:
    // Instead of explicitly listing fields (which hides new columns),
    // we iterate over all keys returned by the database.
    return data.map(record => {
        const formatted: any = {};
        
        Object.keys(record).forEach(key => {
            if (key === 'data_referencia') {
                formatted[key] = record[key];
            } else if (key === 'id') {
                formatted[key] = record[key];
            } else {
                // Try to convert everything else to number
                const val = Number(record[key]);
                formatted[key] = isNaN(val) ? 0 : val;
            }
        });

        return formatted as DashboardMetric;
    });

  } catch (error) {
    console.error("Supabase Metrics Fetch Error:", error);
    throw error;
  }
};

// --- FINANCIAL SETTINGS SERVICES ---

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
                average_ticket: Number(data[0].average_ticket)
            };
        }
    }
    return { average_ticket: 0 };
  } catch (error) {
    console.warn("Could not fetch financial settings, using defaults.", error);
    return { average_ticket: 0 };
  }
};

export const saveFinancialSettings = async (config: SupabaseConfig, settings: FinancialSettings): Promise<void> => {
    const baseUrl = config.url.replace(/\/$/, "");
    const endpoint = `${baseUrl}/rest/v1/financial_settings`;

    // 1. Resolve ID: If we don't have an ID in the settings object, try to fetch it from the DB first.
    // This handles cases where the initial fetch might have failed or the state is out of sync.
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
          if (checkData.length > 0) {
            targetId = checkData[0].id;
          }
        }
      } catch (e) {
        // Ignore check error, fallback to POST
      }
    }

    // 2. Determine Method
    let method = 'POST';
    let url = endpoint;
    
    // We only care about Average Ticket
    const payload: any = {
        average_ticket: settings.average_ticket
    };

    if (targetId) {
        method = 'PATCH';
        url = `${endpoint}?id=eq.${targetId}`;
    }

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

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`DB Error: ${errorText}`);
        }
    } catch (error) {
        console.error("Save Settings Error:", error);
        throw error;
    }
};

// --- INVESTMENT HISTORY SERVICES ---

export const fetchInvestments = async (config: SupabaseConfig): Promise<Investment[]> => {
  const baseUrl = config.url.replace(/\/$/, "");
  const endpoint = `${baseUrl}/rest/v1/marketing_investments?select=*&order=start_date.desc`;

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
      start_date: item.start_date,
      end_date: item.end_date,
      amount: Number(item.amount)
    }));
  } catch (error) {
    console.error("Error fetching investments:", error);
    return [];
  }
};

export const addInvestment = async (config: SupabaseConfig, investment: Omit<Investment, 'id'>): Promise<void> => {
  const baseUrl = config.url.replace(/\/$/, "");
  const endpoint = `${baseUrl}/rest/v1/marketing_investments`;

  try {
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

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DB Error: ${errorText}`);
    }
  } catch (error) {
    console.error("Error adding investment:", error);
    throw error;
  }
};

export const deleteInvestment = async (config: SupabaseConfig, id: number): Promise<void> => {
  const baseUrl = config.url.replace(/\/$/, "");
  const endpoint = `${baseUrl}/rest/v1/marketing_investments?id=eq.${id}`;

  try {
    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        'apikey': config.key,
        'Authorization': `Bearer ${config.key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DB Error: ${errorText}`);
    }
  } catch (error) {
    console.error("Error deleting investment:", error);
    throw error;
  }
};