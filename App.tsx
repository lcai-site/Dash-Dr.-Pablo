import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import Dashboard from './components/Dashboard';
import SettingsModal from './components/SettingsModal';
import { DashboardMetric, DateRange, FinancialSettings, Investment, SupabaseConfig } from './types';
import { fetchDashboardMetrics, fetchFinancialSettings, saveFinancialSettings, fetchInvestments } from './services/supabaseService';
import { SUPABASE_CONFIG } from './constants';

const App: React.FC = () => {
  // Conecta direto usando a config do código
  const [config] = useState<SupabaseConfig>(SUPABASE_CONFIG);
  
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [financialSettings, setFinancialSettings] = useState<FinancialSettings>({ average_ticket: 0 });
  const [investments, setInvestments] = useState<Investment[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    // Padrão: 7 dias (incluindo hoje)
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: '7 Dias' };
  });

  const loadData = useCallback(async (currentConfig: SupabaseConfig, range: DateRange) => {
    setIsLoading(true);
    setError(null);
    try {
      const [metricsData, settingsData, investmentsData] = await Promise.all([
        fetchDashboardMetrics(currentConfig, range),
        fetchFinancialSettings(currentConfig),
        fetchInvestments(currentConfig)
      ]);
      
      setMetrics(metricsData);
      setFinancialSettings(settingsData);
      setInvestments(investmentsData);
    } catch (err: any) {
      console.error("Erro na carga inicial:", err);
      setError(err.message || "Erro de conexão com o banco de dados.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(config, dateRange);
  }, [config, dateRange, loadData]);

  const handleRefresh = () => {
      loadData(config, dateRange);
  };

  const handleSaveSettings = async (newSettings: FinancialSettings) => {
      await saveFinancialSettings(config, newSettings);
      setFinancialSettings(newSettings);
  };

  if (isLoading && metrics.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950 z-[100]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse"></div>
            <Loader2 className="w-16 h-16 text-emerald-500 animate-spin relative z-10" />
          </div>
          <p className="text-white font-black text-xl tracking-[0.3em] uppercase animate-pulse">Sincronizando...</p>
        </div>
      </div>
    );
  }

  if (error && metrics.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/20 rounded-3xl p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white uppercase">Erro de Sincronização</h2>
            <p className="text-slate-400 text-sm leading-relaxed">{error}</p>
          </div>
          <button 
            onClick={handleRefresh}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3"
          >
            <RefreshCw className="w-4 h-4" /> Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
        <Dashboard 
            metrics={metrics}
            financialSettings={financialSettings}
            investments={investments}
            onRefresh={handleRefresh}
            isRefreshing={isLoading}
            currentRange={dateRange}
            onRangeChange={setDateRange}
            onOpenSettings={() => setIsSettingsOpen(true)}
        />
        
        <SettingsModal 
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            currentSettings={financialSettings}
            investments={investments}
            onSaveSettings={handleSaveSettings}
            onRefreshData={handleRefresh}
            config={config}
        />
    </div>
  );
};

export default App;