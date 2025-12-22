import React, { useMemo, useState } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { 
  Target, Users, FileCheck, RefreshCw, Settings, Calendar, DollarSign, Clock, CheckCircle, Loader2, BarChart3, Briefcase, ShieldCheck, TrendingUp, Filter, Headphones, Landmark, Archive, FileText, Lock, Unlock, AlertCircle, X, ChevronRight, Info, EyeOff, ShieldAlert
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
  const [showDatePicker, setShowDatePicker] = useState(false);

  const stats = useMemo(() => {
    if (!metrics || metrics.length === 0) return null;

    const filteredMetrics = metrics.filter(m => {
        const d = (m as any)._parsedDate;
        if (!d) return false;
        return d >= currentRange.start && d <= currentRange.end;
    });

    const countLeadsWithAny = (keys: string[]): number => {
        return filteredMetrics.filter(m => keys.some(k => Number(m[k]) > 0)).length;
    };

    const sumValues = (key: string): number => {
        return filteredMetrics.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);
    };

    // --- COMERCIAL ---
    const com_leads = filteredMetrics.length;
    const com_analise = countLeadsWithAny(['aguardando_analise']);
    const com_followups = sumValues('followups_realizados');
    const com_contratos = countLeadsWithAny(['contratos_fechados', 'n5_contrato_assinado']);
    const com_taxa = com_leads > 0 ? ((com_contratos / com_leads) * 100).toFixed(2) : '0.00';

    // --- PÓS-VENDA ---
    const pv_pendentes = countLeadsWithAny(['clientes_pendentes_total']);
    const pv_onboard = countLeadsWithAny(['onboard_realizado']);
    const pv_agendamento = countLeadsWithAny(['aguardando_agendamento', 'n2_aguardando_agendamento']);
    const pv_doc_aguard = countLeadsWithAny(['aguardando_documentacao', 'n4_aguardando_documentacao']);
    const pv_doc_comp = countLeadsWithAny(['documentacao_completa']);

    // --- JURÍDICO ---
    const jur_producao = countLeadsWithAny(['producao_de_inicial']);
    const jur_revisao = countLeadsWithAny(['revisao_de_inicial']);
    const jur_protocolos = countLeadsWithAny(['processos_protocolados']);
    
    const volume_trabalho_jur = jur_producao + jur_revisao;
    const jur_taxa = volume_trabalho_jur > 0 
        ? ((jur_protocolos / volume_trabalho_jur) * 100).toFixed(2) 
        : (jur_protocolos > 0 ? "100.00" : "0.00");

    // --- SUPORTE & FINANCEIRO ---
    const sup_aguard = countLeadsWithAny(['aguardando_atendimento']);
    const sup_final = sumValues('atendimentos_finalizados');
    const fin_aguard = countLeadsWithAny(['aguardando_atendimento_financeiro']);
    const fin_acordo = countLeadsWithAny(['contato_inicial_acordo_pendente']);

    // --- GESTÃO ---
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

    const gestao_cac = com_contratos > 0 ? totalCost / com_contratos : 0;
    const gestao_custo_prot = jur_protocolos > 0 ? totalCost / jur_protocolos : 0;

    // DINÂMICO
    const numericKeys = new Set<string>();
    metrics.forEach(m => Object.keys(m).forEach(k => {
        if (!['data', 'id', 'telefone', 'nome', 'email', 'origem', 'status', '_parsedDate'].includes(k) && typeof m[k] === 'number') {
            numericKeys.add(k);
        }
    }));

    const dynamicStats = Array.from(numericKeys).sort().map(key => ({
        key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        total: sumValues(key),
        avg: (sumValues(key) / (filteredMetrics.length || 1)).toFixed(2)
    }));

    return {
        comercial: { analise: com_analise, follow: com_followups, contratos: com_contratos, taxa: com_taxa, leads: com_leads },
        posVenda: { pendentes: pv_pendentes, onboard: pv_onboard, agendamento: pv_agendamento, docAguard: pv_doc_aguard, docComp: pv_doc_comp },
        juridico: { producao: jur_producao, revisao: jur_revisao, protocolos: jur_protocolos, taxa: jur_taxa },
        supFin: { supAguard: sup_aguard, supFinal: sup_final, finAguard: fin_aguard, finAcordo: fin_acordo },
        gestao: { cac: gestao_cac, custoProt: gestao_custo_prot, totalCost },
        dynamicStats,
        filteredMetrics
    };
  }, [metrics, currentRange, investments]);

  const handleUnlock = () => {
    const pin = window.prompt("Digite o PIN de Segurança (Padrão: 1234):");
    if (pin === "1234") {
      setIsGestaoUnlocked(true);
    } else if (pin !== null) {
      alert("PIN Incorreto!");
    }
  };

  const chartData = useMemo(() => {
    if (!stats) return [];
    const dailyMap = new Map();
    stats.filteredMetrics.forEach(m => {
        const d = (m as any)._parsedDate;
        if (!d) return;
        const date = d.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
        const existing = dailyMap.get(date) || { date, leads: 0, contratos: 0 };
        existing.leads += 1;
        existing.contratos += (Number(m.contratos_fechados) || Number(m.n5_contrato_assinado) ? 1 : 0);
        dailyMap.set(date, existing);
    });
    return Array.from(dailyMap.values());
  }, [stats]);

  if (isRefreshing && (!metrics || metrics.length === 0)) {
      return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
              <p className="text-white font-bold text-lg tracking-widest uppercase animate-pulse">Sincronizando Banco...</p>
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
          <p className="text-slate-500 text-sm mt-2 font-medium flex items-center gap-2">
            Status: <span className="text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/20">{metrics.length} leads no log</span> • {currentRange.label}
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center">
             <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800 shadow-xl">
                {[7, 15, 30].map(d => (
                  <button key={d} onClick={() => {
                    const end = new Date(); const start = new Date(); start.setDate(end.getDate() - (d - 1));
                    onRangeChange({ start, end, label: `${d} Dias` });
                  }} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${currentRange.label === `${d} Dias` ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
                    {d}D
                  </button>
                ))}
                <button onClick={() => setShowDatePicker(!showDatePicker)} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all flex items-center gap-2 ${showDatePicker ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  <Calendar className="w-3 h-3" /> {showDatePicker ? 'OK' : 'CALENDÁRIO'}
                </button>
             </div>

             <div className="flex bg-slate-900/50 rounded-xl p-1 border border-slate-800">
                <button onClick={() => setActiveTab('strategic')} className={`px-5 py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'strategic' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>ESTRATÉGICO</button>
                <button onClick={() => setActiveTab('full')} className={`px-5 py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'full' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>MÉTRICAS</button>
             </div>

             <div className="flex items-center gap-2">
                <button onClick={onOpenSettings} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-emerald-500 transition-all shadow-lg"><Settings className="w-5 h-5" /></button>
                <button onClick={onRefresh} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-emerald-500 transition-all shadow-lg"><RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} /></button>
             </div>
        </div>
      </header>

      {showDatePicker && (
        <div className="mb-8 p-6 bg-slate-900 border border-emerald-500/20 rounded-2xl flex flex-wrap items-center gap-6 animate-in slide-in-from-top-4 duration-300 shadow-2xl">
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Início</label>
                <input type="date" value={currentRange.start.toISOString().split('T')[0]} onChange={(e) => onRangeChange({...currentRange, start: new Date(e.target.value + 'T12:00:00'), label: 'Customizado'})} className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-xs text-white" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-700 mt-4" />
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Fim</label>
                <input type="date" value={currentRange.end.toISOString().split('T')[0]} onChange={(e) => onRangeChange({...currentRange, end: new Date(e.target.value + 'T12:00:00'), label: 'Customizado'})} className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-xs text-white" />
            </div>
            <button onClick={() => setShowDatePicker(false)} className="mt-4 ml-auto p-2 bg-slate-800 rounded-lg text-slate-400"><X className="w-4 h-4" /></button>
        </div>
      )}

      {stats ? (
        activeTab === 'strategic' ? (
          <div className="space-y-12 animate-in fade-in duration-500">
              
              {/* COMERCIAL */}
              <section>
                  <div className="flex items-center gap-3 mb-6">
                      <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" /> COMERCIAL</h3>
                      <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <KPICard title="TOTAL DE LEADS" value={stats.comercial.leads} icon={<Users />} colorClass="text-slate-400" />
                      <KPICard title="AGUARD. ANÁLISE" value={stats.comercial.analise} icon={<Clock />} colorClass="text-blue-400" />
                      <KPICard title="CONTRATOS" value={stats.comercial.contratos} icon={<FileCheck />} colorClass="text-emerald-400" subValue="Leads que assinaram" />
                      <KPICard title="TAXA CONVERSÃO" value={`${stats.comercial.taxa}%`} icon={<Target />} colorClass="text-purple-400" />
                  </div>
              </section>

              {/* JURÍDICO */}
              <section>
                  <div className="flex items-center gap-3 mb-6">
                      <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2"><Briefcase className="w-4 h-4 text-amber-500" /> JURÍDICO</h3>
                      <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <KPICard title="PROD. INICIAL" value={stats.juridico.producao} icon={<Clock />} colorClass="text-amber-400" />
                      <KPICard title="REVISÃO INICIAL" value={stats.juridico.revisao} icon={<FileText />} colorClass="text-blue-400" />
                      <KPICard title="PROTOCOLADOS" value={stats.juridico.protocolos} icon={<Archive />} colorClass="text-emerald-400" />
                      <KPICard 
                          title="APROVEITAMENTO" 
                          value={`${stats.juridico.taxa}%`} 
                          icon={<TrendingUp />} 
                          colorClass={Number(stats.juridico.taxa) > 100 ? "text-amber-400" : "text-purple-400"}
                          subValue="Protocolos vs Produção"
                      />
                  </div>
                  {Number(stats.juridico.taxa) > 100 && (
                      <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center gap-3">
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                          <p className="text-[10px] text-amber-200/60 font-medium uppercase tracking-widest leading-relaxed">
                            Aproveitamento acima de 100% indica conclusão de processos acumulados de períodos anteriores.
                          </p>
                      </div>
                  )}
              </section>

              {/* PÓS-VENDA */}
              <section>
                  <div className="flex items-center gap-3 mb-6">
                      <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-500" /> PÓS-VENDA</h3>
                      <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <KPICard title="PENDENTES" value={stats.posVenda.pendentes} icon={<Users />} colorClass="text-slate-400" />
                      <KPICard title="ONBOARD FEITO" value={stats.posVenda.onboard} icon={<CheckCircle />} colorClass="text-emerald-400" />
                      <KPICard title="AGENDAMENTO" value={stats.posVenda.agendamento} icon={<Calendar />} colorClass="text-orange-400" />
                      <KPICard title="DOC. PENDENTE" value={stats.posVenda.docAguard} icon={<FileText />} colorClass="text-blue-400" />
                      <KPICard title="DOC. COMPLETA" value={stats.posVenda.docComp} icon={<CheckCircle />} colorClass="text-indigo-400" />
                  </div>
              </section>

              {/* GESTÃO & INVESTIMENTOS - CORREÇÃO DE VISUALIZAÇÃO */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  <div className="xl:col-span-2 space-y-8">
                      <section className="relative">
                          <div className="flex items-center justify-between mb-6">
                              <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                                  <DollarSign className="w-4 h-4 text-emerald-500" /> GESTÃO E CUSTOS
                              </h3>
                              {isGestaoUnlocked ? (
                                <button onClick={() => setIsGestaoUnlocked(false)} className="text-[9px] font-black text-slate-500 hover:text-white border border-slate-800 px-3 py-1.5 rounded-lg uppercase tracking-widest transition-all flex items-center gap-2">
                                    <EyeOff className="w-3 h-3" /> Ocultar Dados
                                </button>
                              ) : (
                                <button onClick={handleUnlock} className="text-[9px] font-black text-emerald-500 hover:text-white border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 rounded-lg uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg hover:bg-emerald-500/10">
                                    <Lock className="w-3 h-3" /> Desbloquear Dados Sensíveis
                                </button>
                              )}
                          </div>

                          <div className="relative">
                            <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-500 ${!isGestaoUnlocked ? 'opacity-40 grayscale blur-sm pointer-events-none' : 'opacity-100 grayscale-0 blur-0'}`}>
                                <KPICard title="INVESTIMENTO TOTAL" value={isGestaoUnlocked ? `R$ ${stats.gestao.totalCost.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : "R$ •••••••"} subValue="Rateio no período" icon={<DollarSign />} colorClass="text-slate-200" />
                                <KPICard title="CAC" value={isGestaoUnlocked ? `R$ ${stats.gestao.cac.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : "R$ •••••••"} subValue="Custo/Contrato" icon={<Users />} colorClass="text-emerald-400" />
                                <KPICard title="CUSTO POR PROTOCOLO" value={isGestaoUnlocked ? `R$ ${stats.gestao.custoProt.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : "R$ •••••••"} icon={<Archive />} colorClass="text-blue-400" />
                            </div>
                            
                            {!isGestaoUnlocked && (
                              <div className="absolute inset-0 flex items-center justify-center z-20">
                                 <div className="bg-slate-900/90 border border-emerald-500/30 p-6 rounded-2xl shadow-2xl flex flex-col items-center text-center gap-4 max-w-xs backdrop-blur-md">
                                    <div className="p-3 bg-emerald-500/10 rounded-full">
                                      <ShieldAlert className="w-8 h-8 text-emerald-500" />
                                    </div>
                                    <div className="space-y-1">
                                      <h4 className="text-white font-bold text-sm uppercase tracking-tighter">Área Restrita</h4>
                                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Os dados financeiros e de custos estão protegidos por PIN para privacidade da gestão.</p>
                                    </div>
                                    <button onClick={handleUnlock} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase rounded-xl transition-all shadow-lg shadow-emerald-900/40">
                                      Digitar PIN (1234)
                                    </button>
                                 </div>
                              </div>
                            )}
                          </div>
                      </section>

                      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                          <h2 className="text-white text-lg font-black mb-8 flex items-center gap-2 uppercase tracking-tighter">
                              <BarChart3 className="w-5 h-5 text-emerald-500" /> Evolução do Log
                          </h2>
                          <div className="h-[280px]">
                              <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={chartData}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                      <XAxis dataKey="date" stroke="#475569" fontSize={10} axisLine={false} />
                                      <YAxis stroke="#475569" fontSize={10} axisLine={false} />
                                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
                                      <Area type="monotone" dataKey="leads" stroke="#3b82f6" fill="#3b82f610" strokeWidth={3} />
                                      <Area type="monotone" dataKey="contratos" stroke="#10b981" fill="#10b98110" strokeWidth={3} />
                                  </AreaChart>
                              </ResponsiveContainer>
                          </div>
                      </div>
                  </div>

                  {/* SUPORTE E FINANCEIRO */}
                  <div className="space-y-6">
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                          <h3 className="text-slate-500 text-[9px] font-black uppercase mb-4 tracking-widest flex items-center gap-2"><Headphones className="w-3 h-3 text-blue-400" /> SUPORTE</h3>
                          <div className="grid grid-cols-2 gap-3">
                              <div className="bg-slate-950 p-3 rounded-xl text-center border border-slate-800">
                                  <div className="text-[8px] font-bold text-slate-600 uppercase mb-1">Pendente</div>
                                  <div className="text-xl font-black text-white">{stats.supFin.supAguard}</div>
                              </div>
                              <div className="bg-slate-950 p-3 rounded-xl text-center border border-slate-800">
                                  <div className="text-[8px] font-bold text-slate-600 uppercase mb-1">Finalizados</div>
                                  <div className="text-xl font-black text-emerald-500">{stats.supFin.supFinal}</div>
                              </div>
                          </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                          <h3 className="text-slate-500 text-[9px] font-black uppercase mb-4 tracking-widest flex items-center gap-2"><Landmark className="w-3 h-3 text-orange-400" /> FINANCEIRO</h3>
                          <div className="grid grid-cols-2 gap-3">
                              <div className="bg-slate-950 p-3 rounded-xl text-center border border-slate-800">
                                  <div className="text-[8px] font-bold text-slate-600 uppercase mb-1">Fila</div>
                                  <div className="text-xl font-black text-white">{stats.supFin.finAguard}</div>
                              </div>
                              <div className="bg-slate-950 p-3 rounded-xl text-center border border-slate-800">
                                  <div className="text-[8px] font-bold text-slate-600 uppercase mb-1">Acordos</div>
                                  <div className="text-xl font-black text-orange-400">{stats.supFin.finAcordo}</div>
                              </div>
                          </div>
                      </div>

                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-start gap-3">
                          <Info className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          <p className="text-[9px] text-slate-500 leading-relaxed uppercase font-bold tracking-tight">
                            Investimentos configurados são rateados dia a dia para o cálculo preciso do CAC.
                          </p>
                      </div>
                  </div>
              </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-in zoom-in duration-300">
              {stats.dynamicStats.map((item) => (
                  <div key={item.key} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex justify-between items-center group hover:border-emerald-500 transition-all">
                      <div>
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 group-hover:text-emerald-500">{item.label}</div>
                          <div className="text-2xl font-black text-white">{item.total}</div>
                      </div>
                      <div className="text-right">
                          <div className="text-[9px] font-bold text-slate-700 uppercase">Frequência</div>
                          <div className="text-xs font-black text-emerald-500">{item.avg}</div>
                      </div>
                  </div>
              ))}
          </div>
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
            <p className="text-lg font-bold uppercase tracking-widest opacity-40">Processando Histórico...</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;