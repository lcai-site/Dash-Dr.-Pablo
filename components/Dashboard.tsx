import React, { useMemo, useState } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { 
  Target, Users, FileCheck, RefreshCw, Settings, Calendar, DollarSign, PieChart, Clock, CheckCircle, Loader2, BarChart3, DatabaseZap, Search, ChevronDown, Briefcase, ShieldCheck, TrendingUp, Filter, Headphones, Landmark, Archive, FileText, Lock, Unlock
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

const toLocalISO = (date: Date) => date.toLocaleDateString('en-CA');

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
  const [isGestaoUnlocked, setIsGestaoUnlocked] = useState(false);
  const [pinError, setPinError] = useState(false);

  const stats = useMemo(() => {
    if (!metrics) return null;

    const startDateStr = toLocalISO(currentRange.start);
    const endDateStr = toLocalISO(currentRange.end);
    const filteredMetrics = metrics.filter(m => m.data >= startDateStr && m.data <= endDateStr);

    const sumKey = (key: string): number => filteredMetrics.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);

    // Cálculos de Investimento Real (Baseado no que você preenche na 'planilha' de investimentos)
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

    // 1. COMERCIAL
    const com_leads = filteredMetrics.length;
    const com_analise = sumKey('aguardando_analise');
    const com_followups = sumKey('followups_realizados');
    const com_contratos = sumKey('contratos_fechados');
    const com_taxa = com_leads > 0 ? ((com_contratos / com_leads) * 100).toFixed(2) : '0';

    // 2. PÓS-VENDA
    const pv_pendentes = sumKey('clientes_pendentes_total');
    const pv_onboard = sumKey('onboard_realizado');
    const pv_agendamento = sumKey('aguardando_agendamento');
    const pv_doc_aguard = sumKey('aguardando_documentacao');
    const pv_doc_comp = sumKey('documentacao_completa');

    // 3. JURÍDICO
    const jur_producao = sumKey('producao_de_inicial');
    const jur_revisao = sumKey('revisao_de_inicial');
    const jur_protocolos = sumKey('processos_protocolados');
    const jur_taxa = com_contratos > 0 ? ((jur_protocolos / com_contratos) * 100).toFixed(2) : '0';

    // 4. GESTÃO (Dados Estratégicos do Cliente)
    const gestao_cac = com_contratos > 0 ? totalCost / com_contratos : 0;
    const gestao_custo_prot = jur_protocolos > 0 ? totalCost / jur_protocolos : 0;
    const gestao_estoque = jur_protocolos - sumKey('arquivados');

    // INDICADORES MENORES
    const small_com_n5 = sumKey('n5_contrato_assinado');
    const small_pv_n1 = sumKey('n1_onboard_pendente');
    const small_pv_n2 = sumKey('n2_aguardando_agendamento');
    const small_pv_n3m = sumKey('n3_reuniao_marcada');
    const small_pv_n3f = sumKey('n3_reuniao_feita');
    const small_pv_n4 = sumKey('n4_aguardando_documentacao');
    const small_pv_n5 = sumKey('n5_organizando_dcs');
    
    const small_sup_aguard = sumKey('suporte_aguardando_atendimento');
    const small_sup_final = sumKey('suporte_atendimentos_finalizados');
    
    const small_fin_aguard = sumKey('financeiro_aguardando_atendimento');
    const small_fin_acordo = sumKey('contato_inicial_acordo_pendente');

    // DINÂMICO
    const numericKeys = new Set<string>();
    metrics.forEach(m => Object.keys(m).forEach(k => {
        if (k !== 'data' && k !== 'id' && typeof m[k] === 'number') numericKeys.add(k);
    }));

    const dynamicStats = Array.from(numericKeys).sort().map(key => ({
        key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        total: sumKey(key),
        today: metrics.length > 0 ? Number(metrics[metrics.length - 1][key]) || 0 : 0
    }));

    return {
        comercial: { analise: com_analise, follow: com_followups, contratos: com_contratos, taxa: com_taxa },
        posVenda: { pendentes: pv_pendentes, onboard: pv_onboard, agendamento: pv_agendamento, docAguard: pv_doc_aguard, docComp: pv_doc_comp },
        juridico: { producao: jur_producao, revisao: jur_revisao, protocolos: jur_protocolos, taxa: jur_taxa },
        gestao: { cac: gestao_cac, custoProt: gestao_custo_prot, estoque: gestao_estoque, totalCost },
        small: {
            com: { n5: small_com_n5 },
            pv: { n1: small_pv_n1, n2: small_pv_n2, n3m: small_pv_n3m, n3f: small_pv_n3f, n4: small_pv_n4, n5: small_pv_n5 },
            sup: { aguard: small_sup_aguard, final: small_sup_final },
            fin: { aguard: small_fin_aguard, acordo: small_fin_acordo }
        },
        dynamicStats,
        filteredMetrics
    };
  }, [metrics, currentRange, investments]);

  const handleUnlock = () => {
    const pin = window.prompt("Insira o PIN de acesso à Gestão:");
    if (pin === "1234") { // Você pode trocar esse PIN aqui
        setIsGestaoUnlocked(true);
        setPinError(false);
    } else if (pin !== null) {
        alert("PIN Incorreto. Acesso negado.");
        setPinError(true);
    }
  };

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

  if (isRefreshing && metrics.length === 0) {
      return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
              <p className="text-white font-bold text-lg tracking-widest">LEADFLOW</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 pt-16">
      <header className="flex flex-col xl:flex-row xl:items-center justify-between mb-10 gap-6">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
             <div className="p-2 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20">
                <Target className="text-slate-950 w-6 h-6" />
             </div>
             LeadFlow <span className="text-emerald-500">Analytics</span>
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">
            Monitorando: <span className="text-slate-300">dashboard_diario</span> • {currentRange.label}
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center">
             <div className="flex bg-slate-900/50 rounded-xl p-1 border border-slate-800">
                <button onClick={() => setActiveTab('strategic')} className={`px-5 py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'strategic' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>ESTRATÉGICO</button>
                <button onClick={() => setActiveTab('full')} className={`px-5 py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'full' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>RAIO-X</button>
             </div>
             <div className="flex items-center gap-2">
                <button onClick={onOpenSettings} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-emerald-500 transition-all shadow-lg"><Settings className="w-5 h-5" /></button>
                <button onClick={onRefresh} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-emerald-500 transition-all shadow-lg"><RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} /></button>
             </div>
        </div>
      </header>

      {stats && activeTab === 'strategic' && (
        <div className="space-y-12 animate-in fade-in duration-500">
            
            {/* GRUPO 1: COMERCIAL */}
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" /> COMERCIAL
                    </h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <KPICard title="AGUARDANDO ANÁLISE" value={stats.comercial.analise} icon={<Clock />} colorClass="text-blue-400" />
                    <KPICard title="FOLLOW-UPS REALIZADOS" value={stats.comercial.follow} subValue="(+ Realizados)" icon={<RefreshCw />} colorClass="text-indigo-400" />
                    <KPICard title="CONTRATOS FECHADOS" value={stats.comercial.contratos} icon={<FileCheck />} colorClass="text-emerald-400" />
                    <KPICard title="TAXA DE CONVERSÃO" value={`${stats.comercial.taxa}%`} icon={<Target />} colorClass="text-purple-400" />
                </div>
            </section>

            {/* GRUPO 2: PÓS-VENDA */}
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-500" /> PÓS-VENDA
                    </h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <KPICard title="CLIENTES PENDENTES" value={stats.posVenda.pendentes} subValue="Total no setor" icon={<Users />} colorClass="text-slate-400" />
                    <KPICard title="ONBOARD REALIZADO" value={stats.posVenda.onboard} icon={<CheckCircle />} colorClass="text-emerald-400" />
                    <KPICard title="AGUARDANDO AGENDAMENTO" value={stats.posVenda.agendamento} icon={<Calendar />} colorClass="text-orange-400" />
                    <KPICard title="AGUARDANDO DOCUMENTAÇÃO" value={stats.posVenda.docAguard} icon={<FileText />} colorClass="text-blue-400" />
                    <KPICard title="DOCUMENTAÇÃO COMPLETA" value={stats.posVenda.docComp} icon={<CheckCircle />} colorClass="text-indigo-400" />
                </div>
            </section>

            {/* GRUPO 3: JURÍDICO */}
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-amber-500" /> JURÍDICO
                    </h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <KPICard title="PRODUÇÃO DE INICIAL" value={stats.juridico.producao} icon={<Clock />} colorClass="text-amber-400" />
                    <KPICard title="REVISÃO DE INICIAL" value={stats.juridico.revisao} icon={<FileText />} colorClass="text-blue-400" />
                    <KPICard title="PROCESSOS PROTOCOLADOS" value={stats.juridico.protocolos} icon={<Archive />} colorClass="text-emerald-400" />
                    <KPICard title="TAXA APROVEITAMENTO" value={`${stats.juridico.taxa}%`} subValue="Protocolados vs Fechados" icon={<TrendingUp />} colorClass="text-purple-400" />
                </div>
            </section>

            {/* GRUPO 4: GESTÃO (PRIVADO) */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-8">
                    <section className="relative">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-emerald-500" /> GESTÃO (DADOS INTERNOS)
                                </h3>
                                {!isGestaoUnlocked && <Lock className="w-3 h-3 text-rose-500" />}
                                {isGestaoUnlocked && <Unlock className="w-3 h-3 text-emerald-500" />}
                            </div>
                            
                            {!isGestaoUnlocked && (
                                <button 
                                    onClick={handleUnlock}
                                    className="text-[9px] font-black text-emerald-500 hover:text-white border border-emerald-500/20 px-3 py-1 rounded-lg uppercase tracking-widest transition-all"
                                >
                                    Desbloquear Dados Sensíveis
                                </button>
                            )}
                        </div>

                        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-700 ${!isGestaoUnlocked ? 'blur-md pointer-events-none opacity-40 select-none' : 'blur-0'}`}>
                            <KPICard title="CAC" value={`R$ ${stats.gestao.cac.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} subValue="Custo Aquisição Cliente" icon={<Users />} colorClass="text-slate-300" />
                            <KPICard title="CUSTO POR PROTOCOLO" value={`R$ ${stats.gestao.custoProt.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} icon={<Archive />} colorClass="text-slate-300" />
                            <KPICard title="ESTOQUE DE PROCESSOS" value={stats.gestao.estoque} subValue="Protocolados - Arquivados" icon={<Briefcase />} colorClass="text-emerald-400" />
                        </div>
                        
                        {!isGestaoUnlocked && (
                            <div className="absolute inset-0 flex items-center justify-center z-20 pt-8">
                                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 p-6 rounded-2xl text-center shadow-2xl">
                                    <Lock className="w-8 h-8 text-rose-500 mx-auto mb-3" />
                                    <p className="text-white font-bold text-sm">ACESSO RESTRITO AO CLIENTE</p>
                                    <p className="text-slate-500 text-xs mt-1">Os dados de CAC e Estocagem são confidenciais.</p>
                                </div>
                            </div>
                        )}
                    </section>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                        <h2 className="text-white text-lg font-black mb-8 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-emerald-500" /> EVOLUÇÃO DIÁRIA
                        </h2>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="date" stroke="#475569" fontSize={10} axisLine={false} />
                                    <YAxis stroke="#475569" fontSize={10} axisLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                                    <Area type="monotone" dataKey="leads" stroke="#3b82f6" fill="#3b82f610" strokeWidth={2} />
                                    <Area type="monotone" dataKey="contratos" stroke="#10b981" fill="#10b98110" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* INDICADORES MENORES (FLUXO) */}
                <div className="space-y-8">
                    <section>
                        <h3 className="text-slate-500 text-[9px] font-black uppercase mb-4 tracking-widest flex items-center gap-2"><Filter className="w-3 h-3" /> INDICADORES DE FLUXO</h3>
                        <div className="space-y-3">
                            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center hover:border-emerald-500/30 transition-all">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Comercial: N5 - Contrato Assinado</span>
                                <span className="text-sm font-black text-white">{stats.small.com.n5}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-center">
                                    <div className="text-[8px] font-black text-slate-500 mb-1">N1 - ONBOARD PEND.</div>
                                    <div className="text-sm font-black text-rose-400">{stats.small.pv.n1}</div>
                                </div>
                                <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-center">
                                    <div className="text-[8px] font-black text-slate-500 mb-1">N2 - AGUARD. AGEND.</div>
                                    <div className="text-sm font-black text-orange-400">{stats.small.pv.n2}</div>
                                </div>
                                <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-center">
                                    <div className="text-[8px] font-black text-slate-500 mb-1">N3 - REUNIÃO MARC.</div>
                                    <div className="text-sm font-black text-blue-400">{stats.small.pv.n3m}</div>
                                </div>
                                <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-center">
                                    <div className="text-[8px] font-black text-slate-500 mb-1">N3 - REUNIÃO FEITA</div>
                                    <div className="text-sm font-black text-indigo-400">{stats.small.pv.n3f}</div>
                                </div>
                                <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-center">
                                    <div className="text-[8px] font-black text-slate-500 mb-1">N4 - AGUARD. DOC.</div>
                                    <div className="text-sm font-black text-blue-300">{stats.small.pv.n4}</div>
                                </div>
                                <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-center">
                                    <div className="text-[8px] font-black text-slate-500 mb-1">N5 - ORGANIZANDO DCS</div>
                                    <div className="text-sm font-black text-emerald-400">{stats.small.pv.n5}</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-slate-500 text-[9px] font-black uppercase mb-4 tracking-widest flex items-center gap-2"><Headphones className="w-3 h-3" /> SUPORTE</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                                <span className="text-[8px] font-bold text-slate-500 block mb-1 uppercase">Aguardando Atend.</span>
                                <span className="text-lg font-black text-white">{stats.small.sup.aguard}</span>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                                <span className="text-[8px] font-bold text-slate-500 block mb-1 uppercase">Finalizados</span>
                                <span className="text-lg font-black text-emerald-400">{stats.small.sup.final}</span>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-slate-500 text-[9px] font-black uppercase mb-4 tracking-widest flex items-center gap-2"><Landmark className="w-3 h-3" /> FINANCEIRO</h3>
                        <div className="space-y-3">
                            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Aguardando Financeiro</span>
                                <span className="text-lg font-black text-white">{stats.small.fin.aguard}</span>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Acordo Pendente</span>
                                <span className="text-lg font-black text-orange-400">{stats.small.fin.acordo}</span>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
      )}

      {stats && activeTab === 'full' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-in zoom-in duration-300">
            {stats.dynamicStats.map((item) => (
                <div key={item.key} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center hover:border-emerald-500/50 transition-all">
                    <div>
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{item.label}</div>
                        <div className="text-xl font-black text-white">{item.total}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[8px] font-bold text-slate-600 uppercase">Hoje</div>
                        <div className="text-sm font-black text-emerald-500">{item.today}</div>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;