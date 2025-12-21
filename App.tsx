import React, { useState, useEffect, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import SettingsModal from './components/SettingsModal';
import ConnectionModal from './components/ConnectionModal';
import { DashboardMetric, DateRange, FinancialSettings, Investment, SupabaseConfig } from './types';
import { fetchDashboardMetrics, fetchFinancialSettings, saveFinancialSettings, fetchInvestments } from './services/supabaseService';
import { SUPABASE_CONFIG } from './constants';

const App: React.FC = () => {
  const [config, setConfig] = useState<SupabaseConfig>(() => {
    const saved = localStorage.getItem('supabase_config');
    if (saved) return JSON.parse(saved);
    return SUPABASE_CONFIG;
  });
  
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [financialSettings, setFinancialSettings] = useState<FinancialSettings>({ average_ticket: 0 });
  const [investments, setInvestments] = useState<Investment[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(!config.key);
  const [error, setError] = useState<string | null>(null);
  
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29); // 30 dias incluindo hoje
    return { start, end, label: '30 Dias' };
  });

  const loadData = useCallback(async (currentConfig: SupabaseConfig, range: DateRange) => {
    if (!currentConfig.url || !currentConfig.key) return;
    
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
      setShowConnectModal(false);
    } catch (err: any) {
      console.error("Erro ao carregar dados:", err);
      setError(err.message || "Erro ao conectar ao Supabase.");
      setShowConnectModal(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (config.key) {
      loadData(config, dateRange);
    }
  }, [config, dateRange, loadData]);

  const handleConnect = async (newConfig: SupabaseConfig) => {
    setConfig(newConfig);
    localStorage.setItem('supabase_config', JSON.stringify(newConfig));
    await loadData(newConfig, dateRange);
  };

  const handleRefresh = () => {
      loadData(config, dateRange);
  };

  const handleSaveSettings = async (newSettings: FinancialSettings) => {
      await saveFinancialSettings(config, newSettings);
      setFinancialSettings(newSettings);
  };

  return (
    <div className="min-h-screen bg-slate-950">
        {showConnectModal && (
            <ConnectionModal 
                onConnect={handleConnect}
                onDemo={() => setShowConnectModal(false)}
                isLoading={isLoading}
                error={error}
            />
        )}

        {!showConnectModal && (
            <>
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
            </>
        )}
    </div>
  );
};

export default App;