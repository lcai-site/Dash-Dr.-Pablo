import React, { useMemo, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar
} from 'recharts';
import { 
  Target, Users, FileCheck, RefreshCw, Settings, Calendar, DollarSign, PieChart, Briefcase, FileText, Clock, CheckCircle, AlertCircle, Loader2, LayoutGrid, BarChart3
} from 'lucide-react';
import { DashboardMetric, DateRange, FinancialSettings, Investment } from '../types';
import KPICard from './KPICard';

interface DashboardProps {
  metrics: DashboardMetric[];
  financialSettings: FinancialSettings;
  investments: Investment[];
  onRefresh: () => void;
  isRefreshing: boolean;
  currentRange: DateRange;
  onRangeChange: (range: DateRange) => void;
  onOpenSettings: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    metrics, 
    financialSettings,
    investments,
    onRefresh, 
    isRefreshing,
    currentRange,
    onRangeChange,
    onOpenSettings
}) => {
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'strategic' | 'full'>('strategic');

  // -- CALCULATE STATISTICS --
  const stats = useMemo(() => {
    if (metrics.length === 0) return null;

    // 1. Client-Side Filtering
    // Convert currentRange to YYYY-MM-DD strings for comparison
    const startDateStr = currentRange.start.toISOString().split('T')[0];
    const endDateStr = currentRange.end.toISOString().split('T')[0];

    // Filter metrics for Flow Calculations (Sums)
    const filteredMetrics = metrics.filter(m => 
        m.data_referencia >= startDateStr && m.data_referencia <= endDateStr
    );

    // 2. Helper for Snapshots (Stocks/Queues)
    // Scans backwards from the end date to find the last valid non-zero entry
    // Updated to accept multiple possible keys for fallback
    const getLatestNonZero = (keys: string[]) => {
        let limitIndex = -1;
        for (let i = metrics.length - 1; i >= 0; i--) {
            if (metrics[i].data_referencia <= endDateStr) {
                limitIndex = i;
                break;
            }
        }
        if (limitIndex === -1) return 0;

        for (let i = limitIndex; i >= 0; i--) {
            // Try each key in priority order
            for (const key of keys) {
                const val = Number(metrics[i][key]);
                if (val > 0) return val;
            }
        }
        return 0;
    };

    // Helper for Summing multiple possible keys (Flows)
    const sumKeys = (record: DashboardMetric, keys: string[]) => {
        for (const key of keys) {
            const val = Number(record[key]);
            if (!isNaN(val) && val !== 0) return val;
        }
        return 0;
    };

    // --- 3. BASIC AGGREGATIONS (Flows using Filtered Data) ---
    // Updated to check for new column names (comercial_, juridico_, etc.) based on screenshots
    
    // Contratos: Try explicit totals first, then prefixed, then old
    const sumContratos = filteredMetrics.reduce((acc, curr) => 
        acc + sumKeys(curr, ['total_contratos_dia', 'comercial_contratos_fechados', 'contratos_fechados']), 0);

    const sumProcessos = filteredMetrics.reduce((acc, curr) => 
        acc + sumKeys(curr, ['juridico_protocolados', 'processos_protocolados']), 0);

    const sumReunioes = filteredMetrics.reduce((acc, curr) => 
        acc + sumKeys(curr, ['n3_reuniao_feita', 'comercial_reunioes_feitas', 'reunioes_feitas']), 0);
    
    // Input for Conversion Rate (Volume)
    const sumAnaliseInput = filteredMetrics.reduce((acc, curr) => 
        acc + sumKeys(curr, ['total_leads_dia', 'comercial_aguardando_analise', 'aguardando_analise']), 0);
    
    // Snapshot Metrics (Stocks for Strategic View)
    // We use snapshots because these represent "Current Pending Items"
    
    // Juridico Producao
    const snapshotProducao = getLatestNonZero(['juridico_producao_inicial', 'producao_inicial']);
    
    // Financeiro
    const snapshotFinanceiro = getLatestNonZero(['financeiro_aguardando_atend', 'financeiro_acordo_pendente', 'financeiro_aguardando']);
    
    // Post-Sales Snapshots
    const snapshotPendentesTotal = getLatestNonZero(['comercial_pendentes_total', 'clientes_pendentes_total']);
    const snapshotAgendamento = getLatestNonZero(['n2_aguardando_agendamento', 'comercial_aguardando_agendamento', 'aguardando_agendamento']);
    const snapshotDocumentacao = getLatestNonZero(['n4_aguardando_documentacao', 'aguardando_documentacao']);

    // --- 4. BUSINESS LOGIC CALCULATIONS ---

    // A. TAXA DE CONVERSÃO (Nova Lógica Baseada em Colunas Específicas)
    // Usamos SUM(total_contratos_dia) / SUM(total_leads_dia)
    const sumTotalLeadsDia = filteredMetrics.reduce((acc, curr) => acc + (Number(curr.total_leads_dia) || 0), 0);
    const sumTotalContratosDia = filteredMetrics.reduce((acc, curr) => acc + (Number(curr.total_contratos_dia) || 0), 0);

    const conversionRate = sumTotalLeadsDia > 0 
        ? ((sumTotalContratosDia / sumTotalLeadsDia) * 100).toFixed(2) 
        : '0.00';

    // --- 5. FINANCIAL CALCULATIONS ---
    
    const calculateDailyCost = (targetDate: Date) => {
      const tDateStr = targetDate.toISOString().split('T')[0];
      const inv = investments.find(i => tDateStr >= i.start_date && tDateStr <= i.end_date);
      if (!inv) return 0;

      const start = new Date(inv.start_date);
      const end = new Date(inv.end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
      
      return durationDays > 0 ? inv.amount / durationDays : 0;
    };

    let totalEstimatedCost = 0;
    const cursor = new Date(currentRange.start);
    const end = new Date(currentRange.end);

    while (cursor <= end) {
      totalEstimatedCost += calculateDailyCost(cursor);
      cursor.setDate(cursor.getDate() + 1);
    }
    
    const cpa = sumContratos > 0 ? totalEstimatedCost / sumContratos : 0;
    const revenue = sumContratos * financialSettings.average_ticket;
    const roi = totalEstimatedCost > 0 ? ((revenue - totalEstimatedCost) / totalEstimatedCost) * 100 : 0;

    // --- 6. DYNAMIC COLUMNS (FULL VIEW) ---
    // Extract all unique keys from ALL metrics (to find new columns)
    const allUniqueKeys = new Set<string>();
    metrics.forEach(m => {
        Object.keys(m).forEach(k => {
             if (k !== 'data_referencia' && k !== 'id' && typeof m[k] === 'number') {
                 allUniqueKeys.add(k);
             }
        });
    });
    
    const allKeys = Array.from(allUniqueKeys).sort();

    const dynamicStats = allKeys.map(key => {
        let sum = filteredMetrics.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);
        let labelType = 'Total no período';
        
        // --- FIX CONVERSION RATE CALCULATION (Weighted Average) ---
        // SUM(total_contratos_dia) / SUM(total_leads_dia)
        if (key === 'taxa_conversao_percentual') {
            // Se total leads > 0, calculamos a ponderada. Senão 0.
            sum = sumTotalLeadsDia > 0 ? (sumTotalContratosDia / sumTotalLeadsDia) * 100 : 0;
            labelType = 'Taxa Ponderada';
        } 
        // Para outras taxas que não conhecemos o denominador, usamos média simples
        else if (key.includes('taxa') || key.includes('percentual')) {
             const daysCount = filteredMetrics.length || 1;
             sum = sum / daysCount;
             labelType = 'Média (Período)';
        }

        const current = getLatestNonZero([key]);
        return {
            key,
            label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            sum,
            current,
            labelType
        };
    });

    return {
        filteredMetrics, 
        sumAnaliseInput,
        sumContratos,
        sumReunioes,
        conversionRate,
        snapshotPendentesTotal,
        snapshotAgendamento,
        snapshotDocumentacao,
        sumProcessos,
        snapshotProducao,
        snapshotFinanceiro,
        estimatedCost: totalEstimatedCost,
        cpa,
        revenue,
        roi,
        dynamicStats // For the Full View tab
    };
  }, [metrics, financialSettings, currentRange, investments]);

  // -- PREPARE CHART DATA --
  const evolutionData = useMemo(() => {
    if (!stats) return [];
    return stats.filteredMetrics.map(m => ({
        date: new Date(m.data_referencia).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        "Entrada Leads": m.total_leads_dia || m.comercial_aguardando_analise || m.aguardando_analise || 0,
        "Contratos": m.total_contratos_dia || m.comercial_contratos_fechados || m.contratos_fechados || 0,
        "Protocolados": m.juridico_protocolados || m.processos_protocolados || 0
    }));
  }, [stats]);

  const funnelData = useMemo(() => {
      if (!stats) return [];
      return [
          { name: 'Leads (Análise)', value: stats.sumAnaliseInput, fill: '#60a5fa' },
          { name: 'Reuniões', value: stats.sumReunioes, fill: '#818cf8' },
          { name: 'Contratos', value: stats.sumContratos, fill: '#34d399' },
          { name: 'Protocolados', value: stats.sumProcessos, fill: '#fbbf24' },
      ];
  }, [stats]);

  // -- HANDLERS --
  const handlePresetChange = (days: number, label: string) => {
    setIsCustomDateOpen(false);
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    onRangeChange({ start, end, label });
  };
  
  const handleCustomDateChange = (startStr: string, endStr: string) => {
      const start = startStr ? new Date(startStr) : currentRange.start;
      const end = endStr ? new Date(endStr) : currentRange.end;
      onRangeChange({ start, end, label: 'Personalizado' });
  };

  if (!stats) {
    return (
        <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
            <div className="text-center text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-emerald-500" />
                <p>Carregando dados...</p>
            </div>
        </div>
    );
  }

  const hasData = stats.filteredMetrics.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      {/* HEADER & CONTROLS */}
      <header className="flex flex-col xl:flex-row xl:items-center justify-between mb-8 gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
             <Target className="text-emerald-500" />
             Dashboard Diário
          </h1>
          <p className="text-slate-400 text-sm mt-1">Visão consolidada da view <code>dashboard_diario</code></p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
             {/* Tab Switcher */}
             <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                <button
                    onClick={() => setActiveTab('strategic')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
                        activeTab === 'strategic' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <BarChart3 className="w-4 h-4" />
                    Visão Estratégica
                </button>
                <button
                    onClick={() => setActiveTab('full')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
                        activeTab === 'full' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <LayoutGrid className="w-4 h-4" />
                    Raio-X Completo
                </button>
             </div>

            <div className="h-8 w-px bg-slate-800 hidden md:block"></div>

            <div className="flex flex-wrap items-center gap-3">
                {/* Date Presets */}
                <div className="flex flex-wrap bg-slate-900 rounded-lg p-1 border border-slate-800">
                    {['7 Dias', '15 Dias', '30 Dias'].map((l) => {
                        const days = l === '7 Dias' ? 7 : l === '15 Dias' ? 15 : 30;
                        const isActive = currentRange.label === l;
                        return (
                            <button 
                                key={l}
                                onClick={() => handlePresetChange(days, l)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                    isActive 
                                    ? 'bg-slate-700 text-white shadow' 
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                {l}
                            </button>
                        )
                    })}
                    <button 
                        onClick={() => {
                            setIsCustomDateOpen(true);
                            onRangeChange({...currentRange, label: 'Personalizado'});
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                            currentRange.label === 'Personalizado'
                            ? 'bg-slate-700 text-white shadow' 
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Calendar className="w-3 h-3" />
                        Personalizado
                    </button>
                </div>

                {/* Custom Date Inputs */}
                {isCustomDateOpen && (
                    <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800 animate-in fade-in slide-in-from-top-1">
                        <input 
                            type="date"
                            className="bg-slate-800 text-slate-200 text-xs rounded px-2 py-1 border border-slate-700 focus:outline-none focus:border-emerald-500"
                            value={currentRange.start.toISOString().split('T')[0]}
                            onChange={(e) => handleCustomDateChange(e.target.value, '')}
                        />
                        <span className="text-slate-500 text-xs">até</span>
                        <input 
                            type="date" 
                            className="bg-slate-800 text-slate-200 text-xs rounded px-2 py-1 border border-slate-700 focus:outline-none focus:border-emerald-500"
                            value={currentRange.end.toISOString().split('T')[0]}
                            onChange={(e) => handleCustomDateChange('', e.target.value)}
                        />
                    </div>
                )}

                <div className="h-8 w-px bg-slate-800 mx-1 hidden md:block"></div>

                <button 
                    onClick={onOpenSettings}
                    className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors group relative"
                    title="Configurações Financeiras"
                >
                    <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                </button>

                <button 
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </div>
      </header>

      {!hasData && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400" />
              <div>
                  <h4 className="text-sm font-semibold text-blue-300">Nenhum dado neste período</h4>
                  <p className="text-xs text-blue-400/80">Tente selecionar "Personalizado" e buscar datas em 2025 ou verifique o filtro selecionado.</p>
              </div>
          </div>
      )}

      {/* --- TAB CONTENT: STRATEGIC VIEW --- */}
      {activeTab === 'strategic' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* SECTION 1: COMERCIAL */}
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 pl-1 border-l-4 border-emerald-500 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Comercial
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <KPICard 
                    title="Aguardando Análise"
                    value={stats.sumAnaliseInput} 
                    subValue="Leads (Total Entrada)"
                    icon={<Users />}
                    colorClass="text-blue-400"
                />

                <KPICard 
                    title="Reuniões Feitas"
                    value={stats.sumReunioes}
                    subValue="Total do Período"
                    icon={<Clock />}
                    colorClass="text-indigo-400"
                />

                <KPICard 
                    title="Contratos Fechados"
                    value={stats.sumContratos}
                    subValue="Total do Período"
                    icon={<FileCheck />}
                    colorClass="text-emerald-400"
                />

                <KPICard 
                    title="Taxa de Conversão"
                    value={`${stats.conversionRate}%`}
                    subValue="Contratos / Leads (Entrada)"
                    icon={<Target />}
                    colorClass="text-purple-400"
                />
            </div>

            {/* SECTION 2: PÓS-VENDA */}
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 pl-1 border-l-4 border-amber-500 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Pós-Venda
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <KPICard 
                    title="Pendentes Total"
                    value={stats.snapshotPendentesTotal}
                    subValue="Estoque Atual (Hoje)"
                    icon={<Clock />}
                    colorClass="text-amber-400"
                />
                <KPICard 
                    title="Aguardando Agendamento"
                    value={stats.snapshotAgendamento}
                    subValue="Estoque Atual (Hoje)"
                    icon={<Calendar />}
                    colorClass="text-orange-400"
                />
                <KPICard 
                    title="Aguardando Documentação"
                    value={stats.snapshotDocumentacao}
                    subValue="Estoque Atual (Hoje)"
                    icon={<FileText />}
                    colorClass="text-yellow-400"
                />
            </div>

            {/* SECTION 3: JURÍDICO & FINANCEIRO */}
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 pl-1 border-l-4 border-blue-500 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Operacional & Financeiro
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <KPICard 
                    title="Em Produção"
                    value={stats.snapshotProducao}
                    subValue="Estoque Inicial (Atual)"
                    icon={<FileText />}
                    colorClass="text-cyan-400"
                />
                <KPICard 
                    title="Processos Protocolados"
                    value={stats.sumProcessos}
                    subValue="Total Realizado"
                    icon={<CheckCircle />}
                    colorClass="text-emerald-400"
                />
                <KPICard 
                    title="Pendente Financeiro"
                    value={stats.snapshotFinanceiro}
                    subValue="Aguardando/Acordo (Atual)"
                    icon={<DollarSign />}
                    colorClass="text-rose-400"
                />
            </div>

            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* EVOLUTION CHART */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-slate-500" />
                        Evolução Diária
                    </h2>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={evolutionData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip 
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="Entrada Leads" stroke="#60a5fa" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="Contratos" stroke="#34d399" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="Protocolados" stroke="#fbbf24" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* FUNNEL CHART */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Target className="w-5 h-5 text-slate-500" />
                        Funil de Eficiência
                    </h2>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                data={funnelData}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={true} vertical={false} />
                                <XAxis type="number" stroke="#64748b" fontSize={10} hide />
                                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={100} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                    cursor={{fill: '#334155', opacity: 0.4}}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30} label={{ position: 'right', fill: '#fff', fontSize: 12 }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* FOOTER FINANCIALS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard 
                    title="Investimento (Est.)"
                    value={`R$ ${stats.estimatedCost.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                    subValue={`Baseado em histórico`}
                    icon={<DollarSign />}
                    colorClass="text-slate-400"
                />

                <KPICard 
                    title="CPA (Custo/Contrato)"
                    value={`R$ ${stats.cpa.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                    subValue="Eficiência de Custo"
                    icon={<PieChart />}
                    colorClass="text-slate-400"
                />

                <KPICard 
                    title="ROI Estimado"
                    value={`${stats.roi.toFixed(1)}%`}
                    subValue={`Ticket Médio: R$ ${financialSettings.average_ticket}`}
                    icon={<Settings />}
                    colorClass={stats.roi > 0 ? "text-emerald-400" : "text-slate-400"}
                />
            </div>
        </div>
      )}

      {/* --- TAB CONTENT: FULL X-RAY VIEW --- */}
      {activeTab === 'full' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 pl-1 border-l-4 border-indigo-500 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                Todas as Métricas (Acumulado & Atual)
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {stats.dynamicStats.map((item) => {
                    const hasData = item.sum !== 0 || item.current !== 0;
                    return (
                        <div key={item.key} className={`border rounded-lg p-4 transition-colors ${
                            hasData 
                            ? 'bg-slate-800 border-emerald-500/30 hover:bg-slate-750' 
                            : 'bg-slate-900/50 border-slate-800 text-slate-500'
                        }`}>
                            <h4 className={`text-xs font-medium uppercase mb-2 h-8 overflow-hidden line-clamp-2 ${
                                hasData ? 'text-slate-400' : 'text-slate-600'
                            }`} title={item.label}>
                                {item.label}
                            </h4>
                            <div className="flex justify-between items-end">
                                <div>
                                    <span className={`text-2xl font-bold block ${
                                        hasData ? 'text-white' : 'text-slate-600'
                                    }`}>
                                        {item.key === 'taxa_conversao_percentual' 
                                            ? item.sum.toFixed(2) + '%' 
                                            : item.sum.toLocaleString('pt-BR')}
                                    </span>
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wide">
                                        {item.labelType}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className={`text-lg font-semibold block ${
                                        hasData ? 'text-emerald-400' : 'text-slate-700'
                                    }`}>{item.current}</span>
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wide">Hoje</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;