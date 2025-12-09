import React, { useState, useEffect, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import SettingsModal from './components/SettingsModal';
import { DashboardMetric, DateRange, FinancialSettings, Investment } from './types';
import { fetchDashboardMetrics, fetchFinancialSettings, saveFinancialSettings, fetchInvestments } from './services/supabaseService';
import { SUPABASE_CONFIG } from './constants';

const App: React.FC = () => {
  // Use hardcoded config directly
  const config = SUPABASE_CONFIG;
  
  // Data State
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [financialSettings, setFinancialSettings] = useState<FinancialSettings>({ average_ticket: 0 });
  const [investments, setInvestments] = useState<Investment[]>([]);
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Filter State: Default to last 30 days
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return { start, end, label: '30 Dias' };
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // FIX: Fetch wide range (2024-2026) to ensure we get data even if default filter is empty.
      // This solves the "Blue Screen" / Empty state issue when data is in the future relative to 'today'.
      const wideRange = {
          start: new Date('2024-01-01'),
          end: new Date('2026-12-31'),
          label: 'All Time'
      };

      // Parallel fetch
      const [metricsData, settingsData, investmentsData] = await Promise.all([
        fetchDashboardMetrics(config, wideRange), // Fetch EVERYTHING
        fetchFinancialSettings(config),
        fetchInvestments(config)
      ]);
      
      setMetrics(metricsData);
      setFinancialSettings(settingsData);
      setInvestments(investmentsData);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  // Effect to trigger data load on mount only (since we fetch wide range now)
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
      loadData();
  };

  const handleSaveSettings = async (newSettings: FinancialSettings) => {
      await saveFinancialSettings(config, newSettings);
      setFinancialSettings(newSettings);
  };

  return (
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
        />
    </>
  );
};

export default App;