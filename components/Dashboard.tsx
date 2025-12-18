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

// Auxiliar para formatar data local YYYY-MM-DD para filtros consistentes
const toLocalISO = (date: Date) => {
    return date.toLocaleDateString('en-CA'); 
};

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

  const stats = useMemo(() => {
    if (!metrics || metrics.length === 0) return null;

    const startDateStr = toLocalISO(currentRange.start);
    const endDateStr = toLocalISO(currentRange.end);

    // 1. Filtro de período
    const filteredMetrics = metrics.filter(m => 
        m.data_referencia >= startDateStr && m.data_referencia <= endDateStr
    );

    // 2. Helpers Robustos (Anti-NaN)
    const sumKeys = (data: DashboardMetric[], keys: string[]): number => {
        if (!data || data.length === 0) return 0;
        const total = data.reduce((acc, curr) => {
            let foundValue = 0;
            for (const key of keys) {
                const val = Number(curr[key]);
                if (!isNaN(val) && val !== 0) {
                    foundValue = val;
                    break; 
                }
            }
            return acc + foundValue;
        }, 0);
        return isNaN(total) ? 0 : total;
    };

    const getValueAtEnd = (data: DashboardMetric[], keys: string[]): number => {
        if (!data || data.length === 0) return 0;
        const lastRecord = data[data.length - 1];
        for (const key of keys) {
            const val = Number(lastRecord[key]);
            if (!isNaN(val)) return val;
        }
        return 0;
    };

    // --- CÁLCULOS ESTRATÉGICOS ---
    const sumContratos = sumKeys(filteredMetrics, ['total_contratos_dia', 'comercial_contratos_fechados', 'contratos_fechados']);
    const sumProcessos = sumKeys(filteredMetrics, ['juridico_protocolados', 'processos_protocolados']);
    const sumReunioes = sumKeys(filteredMetrics, ['n3_reuniao_feita', 'comercial_reunioes_feitas', 'reunioes_feitas']);
    const sumTotalLeads = sumKeys(filteredMetrics, ['total_leads_dia', 'comercial_aguardando_analise', 'aguardando_analise']);
    
    const conversionRate = sumTotalLeads > 0 
        ? ((sumContratos / sumTotalLeads) * 100).toFixed(2) 
        : '0.00';

    // Snapshots (Estoque/Fila)
    const snapshotPendentes = getValueAtEnd(filteredMetrics, ['comercial_pendentes_total', 'clientes_pendentes_total']);
    const snapshotAgendamento = getValueAtEnd(filteredMetrics, ['posvenda_aguardando_agendamento', 'n2_aguardando_agendamento', 'aguardando_agendamento']);
    const snapshotDocumentacao = getValueAtEnd(filteredMetrics, ['posvenda_aguardando_documentacao', 'n4_aguardando_documentacao', 'aguardando_documentacao']);
    const snapshotProducao = getValueAtEnd(filteredMetrics, ['juridico_producao_inicial', 'producao_inicial', 'estoque_processos']);
    const snapshotFinanceiro = getValueAtEnd(filteredMetrics, ['financeiro_aguardando_atend', 'financeiro_acordo_pendente', 'pendente_financeiro']);

    // --- RAIO-X DINÂMICO ---
    const allUniqueKeys = new Set<string>();
    metrics.forEach(m => {
        Object.keys(m).forEach(k => {
             if (k !== 'data_referencia' && k !== 'id' && typeof m[k] === 'number') {
                 allUniqueKeys.add(k);
             }
        });
    });
    
    const dynamicStats = Array.from(allUniqueKeys).sort().map(key => {
        const isSnap = key.includes('aguardando') || key.includes('pendente') || key.includes('estoque') || key.includes('producao');
        const isPct = key.includes('taxa') || key.includes('percentual');
        
        let totalVal = 0;
        let labelType = 'Total no período';

        if (isPct) {
            if (key.includes('conversao')) {
                totalVal = sumTotalLeads > 0 ? (sumContratos / sumTotalLeads) * 100 : 0;
            } else {
                totalVal = filteredMetrics.length > 0 
                    ? filteredMetrics.reduce((a, b) => a + (Number(b[key]) || 0), 0) / filteredMetrics.length 
                    : 0;
            }
            labelType = 'Média/Ponderada';
        } else if (isSnap) {
            totalVal = filteredMetrics.length > 0 
                ? filteredMetrics.reduce((a, b) => a + (Number(b[key]) || 0), 0) / filteredMetrics.length 
                : 0;
            labelType = 'Média da Fila';
        } else {
            totalVal = filteredMetrics.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);
        }

        const todayValue = filteredMetrics.length > 0 
            ? Number(filteredMetrics[filteredMetrics.length - 1][key]) || 0 
            : 0;

        return {
            key,
            label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            total: isNaN(totalVal) ? 0 : totalVal,
            today: isNaN(todayValue) ? 0 : todayValue,
            labelType,
            isPct
        };
    });

    // --- FINANCEIRO ---
    const calculateDailyCost = (targetDate: Date) => {
      const tDateStr = toLocalISO(targetDate);
      const inv = investments.find(i => tDateStr >= i.start_date && tDateStr <= i.end_date);
      if (!inv) return 0;
      const start = new Date(inv.start_date + 'T12:00:00');
      const end = new Date(inv.end_date + 'T12:00:00');
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
      return durationDays > 0 ? inv.amount / durationDays : 0;
    };

    let totalEstimatedCost = 0;
    let cursor = new Date(currentRange.start);
    while (cursor <= currentRange.end) {
      totalEstimatedCost += calculateDailyCost(cursor);
      cursor.setDate(cursor.getDate() + 1);
    }
    const cpa = sumContratos > 0 ? totalEstimatedCost / sumContratos : 0;
    const revenue = sumContratos * financialSettings.average_ticket;
    const roi = totalEstimatedCost > 0 ? ((revenue - totalEstimatedCost) / totalEstimatedCost) * 100 : 0;

    return {
        filteredMetrics, 
        sumContratos,
        sumReunioes,
        sumTotalLeads,
        conversionRate,
        snapshotPendentes,
        snapshotAgendamento,
        snapshotDocumentacao,
        sumProcessos,
        snapshotProducao,
        snapshotFinanceiro,
        estimatedCost: totalEstimatedCost,
        cpa,
        revenue,
        roi,
        dynamicStats
    };
  }, [metrics, financialSettings, currentRange, investments]);

  const evolutionData = useMemo(() => {
    if (!stats) return [];
    return stats.filteredMetrics.map(m => ({
        date: new Date(m.data_referencia + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        "Entrada Leads": m.total_leads_dia || m.aguardando_analise || 0,
        "Contratos": m.total_contratos_dia || m.contratos_fechados || 0,
        "Protocolados": m.juridico_protocolados || m.processos_protocolados || 0
    }));
  }, [stats]);

  if (!stats) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500"><Loader2 className="animate-spin mr-2" /> Carregando base de dados...</div>;

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      {/* HEADER */}
      <header className="flex flex-col xl:flex-row xl:items-center justify-between mb-8 gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
             <Target className="text-emerald-500" /> Dashboard Diário
          </h1>
          <p className="text-slate-400 text-sm mt-1">Dados de {toLocalISO(currentRange.start)} até {toLocalISO(currentRange.end)}</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center">
             <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                <button onClick={() => setActiveTab('strategic')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'strategic' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>
                    <BarChart3 className="w-4 h-4" /> Visão Estratégica
                </button>
                <button onClick={() => setActiveTab('full')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'full' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>
                    <LayoutGrid className="w-4 h-4" /> Raio-X Completo
                </button>
             </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                    {['7 Dias', '15 Dias', '30 Dias'].map((l) => (
                        <button key={l} onClick={() => {
                            const end = new Date();
                            const start = new Date();
                            const days = l === '7 Dias' ? 7 : l === '15 Dias' ? 15 : 30;
                            start.setDate(end.getDate() - (days - 1));
                            onRangeChange({ start, end, label: l });
                        }} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${currentRange.label === l ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>{l}</button>
                    ))}
                    <button onClick={() => setIsCustomDateOpen(!isCustomDateOpen)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${currentRange.label === 'Personalizado' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>📅</button>
                </div>
                {isCustomDateOpen && (
                    <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
                        <input type="date" className="bg-slate-800 text-slate-200 text-xs rounded px-2 py-1" value={toLocalISO(currentRange.start)} onChange={(e) => onRangeChange({...currentRange, start: new Date(e.target.value + 'T12:00:00'), label: 'Personalizado'})} />
                        <input type="date" className="bg-slate-800 text-slate-200 text-xs rounded px-2 py-1" value={toLocalISO(currentRange.end)} onChange={(e) => onRangeChange({...currentRange, end: new Date(e.target.value + 'T12:00:00'), label: 'Personalizado'})} />
                    </div>
                )}
                <button onClick={onOpenSettings} className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg"><Settings className="w-4 h-4" /></button>
                <button onClick={onRefresh} className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg"><RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} /></button>
            </div>
        </div>
      </header>

      {/* VIEW: STRATEGIC */}
      {activeTab === 'strategic' && (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* 1. COMERCIAL */}
            <div>
                <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" /> COMERCIAL
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KPICard title="AGUARDANDO ANÁLISE" value={stats.sumTotalLeads} subValue="Leads (Total Entrada)" icon={<Users />} colorClass="text-blue-400" />
                    <KPICard title="CONTRATOS FECHADOS" value={stats.sumContratos} subValue="Total do Período" icon={<FileCheck />} colorClass="text-emerald-400" />
                    <KPICard title="TAXA DE CONVERSÃO" value={`${stats.conversionRate}%`} subValue="Contratos / Leads (Entrada)" icon={<Target />} colorClass="text-purple-400" />
                </div>
            </div>

            {/* 2. PÓS-VENDA (ESTOQUE LÍQUIDO) */}
            <div>
                <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" /> PÓS-VENDA (ESTOQUE LÍQUIDO)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <KPICard title="REUNIÕES FEITAS" value={stats.sumReunioes} subValue="Total do Período" icon={<CheckCircle />} colorClass="text-indigo-400" />
                    <KPICard title="PENDENTES TOTAL" value={stats.snapshotPendentes} subValue="Entrada - Doc. Completa" icon={<Clock />} colorClass="text-amber-400" />
                    <KPICard title="AGUARDANDO AGENDAMENTO" value={stats.snapshotAgendamento} subValue="Pendentes - Aguard. Doc" icon={<Calendar />} colorClass="text-orange-400" />
                    <KPICard title="AGUARDANDO DOCUMENTAÇÃO" value={stats.snapshotDocumentacao} subValue="Aguard. Doc - Completos" icon={<FileText />} colorClass="text-yellow-400" />
                </div>
            </div>

            {/* 3. OPERACIONAL & FINANCEIRO */}
            <div>
                <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-500" /> OPERACIONAL & FINANCEIRO
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KPICard title="EM PRODUÇÃO" value={stats.snapshotProducao} subValue="Estoque Inicial (Atual)" icon={<FileText />} colorClass="text-cyan-400" />
                    <KPICard title="PROCESSOS PROTOCOLADOS" value={stats.sumProcessos} subValue="Total Realizado" icon={<CheckCircle />} colorClass="text-emerald-400" />
                    <KPICard title="PENDENTE FINANCEIRO" value={stats.snapshotFinanceiro} subValue="Aguardando/Acordo" icon={<DollarSign />} colorClass="text-rose-400" />
                </div>
            </div>

            {/* CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
                    <h2 className="text-white font-bold mb-6 flex items-center gap-2">Evolução Diária</h2>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={evolutionData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                <Legend iconType="circle" />
                                <Line type="monotone" dataKey="Entrada Leads" stroke="#60a5fa" strokeWidth={3} dot={false} />
                                <Line type="monotone" dataKey="Contratos" stroke="#34d399" strokeWidth={3} dot={false} />
                                <Line type="monotone" dataKey="Protocolados" stroke="#fbbf24" strokeWidth={3} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col">
                    <h2 className="text-white font-bold mb-6">Funil de Eficiência</h2>
                    <div className="h-[300px] flex-grow">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { name: 'Leads (Total)', value: stats.sumTotalLeads, fill: '#60a5fa' },
                                { name: 'Reuniões', value: stats.sumReunioes, fill: '#818cf8' },
                                { name: 'Contratos', value: stats.sumContratos, fill: '#34d399' },
                                { name: 'Protocolados', value: stats.sumProcessos, fill: '#fbbf24' },
                            ]} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={120} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#1e293b' }} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24} label={{ position: 'right', fill: '#94a3b8', fontSize: 12 }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* FINANCIALS FOOTER */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <KPICard title="INVESTIMENTO (EST.)" value={`R$ ${stats.estimatedCost.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} subValue="Baseado em histórico" icon={<DollarSign />} colorClass="text-slate-400" />
                <KPICard title="CPA (CUSTO/CONTRATO)" value={`R$ ${stats.cpa.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} subValue="Eficiência de Custo" icon={<PieChart />} colorClass="text-slate-400" />
                <KPICard title="ROI ESTIMADO" value={`${stats.roi.toFixed(1)}%`} subValue={`Ticket Médio: R$ ${financialSettings.average_ticket}`} icon={<Settings />} colorClass={stats.roi > 0 ? "text-emerald-400" : "text-slate-400"} />
            </div>
        </div>
      )}

      {/* VIEW: FULL X-RAY */}
      {activeTab === 'full' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-500">
            {stats.dynamicStats.map((item) => (
                <div key={item.key} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-emerald-500/50 transition-all group">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 h-8 line-clamp-2 group-hover:text-slate-300">{item.label}</h4>
                    <div className="flex justify-between items-end">
                        <div>
                            <span className="text-2xl font-black text-white block">
                                {item.isPct ? item.total.toFixed(1) + '%' : Math.round(item.total).toLocaleString('pt-BR')}
                            </span>
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">{item.labelType}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-lg font-bold text-emerald-500 block">{item.today}</span>
                            <span className="text-[9px] font-bold text-slate-600 uppercase">Hoje</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;