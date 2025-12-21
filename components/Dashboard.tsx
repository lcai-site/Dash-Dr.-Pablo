import React, { useMemo, useState } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';
import { 
  Target, Users, FileCheck, RefreshCw, Settings, Calendar, DollarSign, PieChart, Briefcase, FileText, Clock, CheckCircle, Loader2, LayoutGrid, BarChart3, DatabaseZap, Search, ChevronDown
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
  const [activeTab, setActiveTab] = useState<'strategic' | 'full'>('strategic');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const stats = useMemo(() => {
    if (!metrics) return null;

    const startDateStr = toLocalISO(currentRange.start);
    const endDateStr = toLocalISO(currentRange.end);

    const filteredMetrics = metrics.filter(m => 
        m.data >= startDateStr && m.data <= endDateStr
    );

    const sumKey = (data: DashboardMetric[], key: string): number => {
        return data.reduce((acc, curr) => {
            const val = curr[key];
            return acc + (typeof val === 'number' ? val : 0);
        }, 0);
    };

    const lastVal = (data: DashboardMetric[], key: string): number => {
        if (data.length === 0) return 0;
        const val = data[data.length - 1][key];
        return typeof val === 'number' ? val : 0;
    };

    // --- FINANCEIRO ---
    const calculateTotalDailyCost = (targetDate: Date) => {
      const tDateStr = toLocalISO(targetDate);
      const activeInvs = investments.filter(i => tDateStr >= i.data_inicio && tDateStr <= i.data_fim);
      return activeInvs.reduce((total, inv) => {
        const start = new Date(inv.data_inicio + 'T12:00:00');
        const end = new Date(inv.data_fim + 'T12:00:00');
        const diffDays = Math.max(1, Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        return total + (inv.valor / diffDays);
      }, 0);
    };

    let totalCost = 0;
    let cursor = new Date(currentRange.start);
    while (cursor <= currentRange.end) {
      totalCost += calculateTotalDailyCost(cursor);
      cursor.setDate(cursor.getDate() + 1);
    }

    // --- MAPEAMENTO ESTRATÉGICO RIGOROSO ---
    const com_Leads = filteredMetrics.length; 
    const com_Contratos = sumKey(filteredMetrics, 'contratos_fechados');
    const com_Taxa = com_Leads > 0 ? ((com_Contratos / com_Leads) * 100).toFixed(2) : '0.00';

    // Funil Comercial / Atendimento
    const pv_FollowUps = sumKey(filteredMetrics, 'followups_realizados');
    const pv_AguardAnalise = sumKey(filteredMetrics, 'aguardando_analise');
    const pv_OnboardReal = sumKey(filteredMetrics, 'onboard_realizado');
    
    // Etapas N
    const n1_OnboardPend = sumKey(filteredMetrics, 'n1_onboard_pendente');
    const n2_Agendamento = sumKey(filteredMetrics, 'n2_aguardando_agendamento');
    const n3_ReuniaoMarc = sumKey(filteredMetrics, 'n3_reuniao_marcada');
    const n3_ReuniaoFeit = sumKey(filteredMetrics, 'n3_reuniao_feita');
    const n5_ContratoAssin = sumKey(filteredMetrics, 'n5_contrato_assinado');

    // Jurídico
    const op_Producao = sumKey(filteredMetrics, 'producao_de_inicial');
    const op_Protocolos = sumKey(filteredMetrics, 'processos_protocolados');
    
    const cpa = com_Contratos > 0 ? totalCost / com_Contratos : 0;
    const revenue = com_Contratos * financialSettings.average_ticket;
    const roi = totalCost > 0 ? ((revenue - totalCost) / totalCost) * 100 : 0;

    // DESCOBERTA DINÂMICA
    const numericKeys = new Set<string>();
    metrics.forEach(m => {
        Object.keys(m).forEach(k => {
            if (k !== 'data' && k !== 'id' && k !== 'telefone' && typeof m[k] === 'number') {
                numericKeys.add(k);
            }
        });
    });

    const dynamicStats = Array.from(numericKeys).sort().map(key => {
        const isSnap = key.includes('pendente') || key.includes('aguardando') || key.includes('producao');
        return {
            key,
            label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            total: sumKey(filteredMetrics, key),
            today: lastVal(filteredMetrics, key),
            labelType: isSnap ? 'Estoque' : 'Total'
        };
    });

    return {
        com: { leads: com_Leads, contratos: com_Contratos, taxa: com_Taxa },
        pv: { follow: pv_FollowUps, analise: pv_AguardAnalise, onboard: pv_OnboardReal, n1: n1_OnboardPend, n2: n2_Agendamento, n3m: n3_ReuniaoMarc, n3f: n3_ReuniaoFeit, n5: n5_ContratoAssin },
        op: { producao: op_Producao, protocolos: op_Protocolos },
        fin: { cost: totalCost, cpa, roi },
        dynamic: dynamicStats,
        filteredMetrics
    };
  }, [metrics, currentRange, investments, financialSettings]);

  const chartData = useMemo(() => {
    if (!stats) return [];
    const dailyMap = new Map();
    stats.filteredMetrics.forEach(m => {
        const date = String(m.data).substring(5, 10);
        const existing = dailyMap.get(date) || { date, leads: 0, contratos: 0 };
        existing.leads += 1;
        existing.contratos += (Number(m.contratos_fechados) || 0);
        dailyMap.set(date, existing);
    });
    return Array.from(dailyMap.values());
  }, [stats]);

  const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
      const date = new Date(value + 'T12:00:00');
      if (type === 'start') {
          onRangeChange({ ...currentRange, start: date, label: 'Personalizado' });
      } else {
          onRangeChange({ ...currentRange, end: date, label: 'Personalizado' });
      }
  };

  if (isRefreshing && metrics.length === 0) {
      return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
              <div className="text-center">
                  <p className="text-white font-bold text-lg">LeadFlow Analytics</p>
                  <p className="text-xs">Sincronizando com Supabase Real-time...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 pt-16 selection:bg-emerald-500/30">
      <header className="flex flex-col xl:flex-row xl:items-center justify-between mb-10 gap-6">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
             <div className="p-2 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20 transition-transform hover:scale-110">
                <Target className="text-slate-950 w-6 h-6" />
             </div>
             LeadFlow <span className="text-emerald-500">Analytics</span>
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium flex items-center gap-2">
            <DatabaseZap className="w-4 h-4 text-emerald-500/50" />
            Fonte: <span className="text-slate-300">tabela leads</span> • {currentRange.label}
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center">
             {/* Navegação de Tabs */}
             <div className="flex bg-slate-900/50 backdrop-blur rounded-xl p-1 border border-slate-800 shadow-inner">
                <button onClick={() => setActiveTab('strategic')} className={`px-5 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'strategic' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                    <BarChart3 className="w-4 h-4" /> ESTRATÉGICO
                </button>
                <button onClick={() => setActiveTab('full')} className={`px-5 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'full' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                    <LayoutGrid className="w-4 h-4" /> RAIO-X COMPLETO
                </button>
             </div>
             
             {/* Seletor de Data */}
             <div className="flex items-center gap-2">
                <div className="relative">
                    <button 
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all shadow-lg"
                    >
                        <Calendar className="w-4 h-4 text-emerald-500" />
                        {currentRange.label}
                        <ChevronDown className={`w-3 h-3 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showDatePicker && (
                        <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in duration-200">
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                {['7 Dias', '15 Dias', '30 Dias', 'Personalizado'].map((l) => (
                                    <button 
                                        key={l} 
                                        onClick={() => {
                                            if (l === 'Personalizado') return;
                                            const end = new Date();
                                            const start = new Date();
                                            const days = parseInt(l);
                                            start.setDate(end.getDate() - (days - 1));
                                            onRangeChange({ start, end, label: l });
                                            setShowDatePicker(false);
                                        }}
                                        className={`px-3 py-2 text-[10px] font-bold rounded-lg border transition-all ${currentRange.label === l ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="space-y-3 pt-3 border-t border-slate-800">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase">Início</label>
                                    <input 
                                        type="date" 
                                        value={toLocalISO(currentRange.start)}
                                        onChange={(e) => handleCustomDateChange('start', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:ring-1 focus:ring-emerald-500 outline-none" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase">Fim</label>
                                    <input 
                                        type="date" 
                                        value={toLocalISO(currentRange.end)}
                                        onChange={(e) => handleCustomDateChange('end', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:ring-1 focus:ring-emerald-500 outline-none" 
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <button onClick={onOpenSettings} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-emerald-500 transition-all hover:scale-105 shadow-lg"><Settings className="w-5 h-5" /></button>
                <button onClick={onRefresh} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-emerald-500 transition-all hover:scale-105 shadow-lg"><RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} /></button>
             </div>
        </div>
      </header>

      {!stats && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-20 text-center animate-pulse">
              <DatabaseZap className="w-16 h-16 text-slate-800 mx-auto mb-4" />
              <p className="text-slate-600 font-bold uppercase tracking-widest">Nenhum dado processado</p>
          </div>
      )}

      {stats && activeTab === 'strategic' && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* GRUPO COMERCIAL */}
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" /> VISÃO COMERCIAL
                    </h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KPICard title="TOTAL LEADS" value={stats.com.leads} subValue="Entradas no Período" icon={<Users />} colorClass="text-blue-400" />
                    <KPICard title="CONTRATOS FECHADOS" value={stats.com.contratos} subValue="Soma: contratos_fechados" icon={<FileCheck />} colorClass="text-emerald-400" />
                    <KPICard title="TAXA DE CONVERSÃO" value={`${stats.com.taxa}%`} subValue="Performance Funil" icon={<Target />} colorClass="text-purple-400" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <KPICard title="AGUARDANDO ANÁLISE" value={stats.pv.analise} icon={<Clock />} colorClass="text-slate-400" />
                    <KPICard title="FOLLOW-UPS REALIZADOS" value={stats.pv.follow} icon={<CheckCircle />} colorClass="text-indigo-400" />
                    <KPICard title="ONBOARD REALIZADO" value={stats.pv.onboard} icon={<FileCheck />} colorClass="text-emerald-400" />
                </div>
            </section>

            {/* STATUS DO PROCESSO */}
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-amber-500" /> STATUS DO FLUXO (N)
                    </h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <KPICard title="N1 - ONBOARD PEND." value={stats.pv.n1} icon={<Clock />} colorClass="text-rose-400" />
                    <KPICard title="N2 - AGENDAMENTO" value={stats.pv.n2} icon={<Calendar />} colorClass="text-orange-400" />
                    <KPICard title="N3 - REUNIÃO MARC." value={stats.pv.n3m} icon={<Clock />} colorClass="text-blue-400" />
                    <KPICard title="N3 - REUNIÃO FEITA" value={stats.pv.n3f} icon={<CheckCircle />} colorClass="text-indigo-400" />
                    <KPICard title="N5 - CONTRATO ASS." value={stats.pv.n5} icon={<FileCheck />} colorClass="text-emerald-400" />
                </div>
            </section>

            {/* GRÁFICO E FINANÇAS */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 bg-slate-900/50 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                    <h2 className="text-white text-lg font-black mb-8 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-emerald-500" /> EVOLUÇÃO DIÁRIA
                    </h2>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }} />
                                <Area name="Leads" type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
                                <Area name="Contratos" type="monotone" dataKey="contratos" stroke="#10b981" strokeWidth={2} fill="transparent" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="space-y-6">
                    <KPICard title="INVESTIMENTO TOTAL" value={`R$ ${stats.fin.cost.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} subValue="Ads/Tráfego no Período" icon={<DollarSign />} colorClass="text-slate-300" />
                    <KPICard title="CPA (CUSTO AQUIS.)" value={`R$ ${stats.fin.cpa.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} icon={<PieChart />} colorClass="text-slate-300" />
                    <KPICard title="ROI ESTIMADO" value={`${stats.fin.roi.toFixed(1)}%`} subValue={`Base: R$ ${financialSettings.average_ticket}`} icon={<Target />} colorClass={stats.fin.roi > 0 ? "text-emerald-400" : "text-rose-400"} />
                </div>
            </div>
        </div>
      )}

      {stats && activeTab === 'full' && (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="relative max-w-md mx-auto mb-10 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-emerald-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Filtrar colunas do CSV..." 
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-slate-600 shadow-xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {stats.dynamic.filter(s => s.label.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
                    <div key={item.key} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-emerald-500/50 transition-all group flex flex-col justify-between h-40 hover:shadow-2xl hover:shadow-emerald-500/5">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 line-clamp-2 group-hover:text-emerald-500 transition-colors">{item.label}</h4>
                        <div className="flex justify-between items-end">
                            <div>
                                <span className="text-3xl font-black text-white block tracking-tighter">{item.total}</span>
                                <span className="text-[9px] font-bold text-slate-600 uppercase flex items-center gap-1"><DatabaseZap className="w-3 h-3" /> {item.labelType}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-bold text-emerald-500 block">{item.today}</span>
                                <span className="text-[9px] font-bold text-slate-600 uppercase">Hoje</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;