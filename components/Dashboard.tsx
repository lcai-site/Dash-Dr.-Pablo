import React, { useMemo, useState } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { 
  Target, Users, FileCheck, RefreshCw, Settings, Calendar, DollarSign, Clock, CheckCircle, Loader2, BarChart3, Briefcase, ShieldCheck, TrendingUp, Headphones, Landmark, Archive, FileText, Lock, EyeOff, ShieldAlert, AlertCircle, X, ChevronRight, Info
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
    if (!metrics) return null;

    const rangeStart = new Date(currentRange.start);
    rangeStart.setHours(0,0,0,0);
    const rangeEnd = new Date(currentRange.end);
    rangeEnd.setHours(23,59,59,999);

    // Filtra e ORDENA cronologicamente (importante pois a API agora retorna DESC)
    const filteredMetrics = metrics
        .filter(m => {
            const d = (m as any)._parsedDate;
            if (!d) return false;
            const checkDate = new Date(d);
            return checkDate >= rangeStart && checkDate <= rangeEnd;
        })
        .sort((a, b) => {
            const dateA = (a as any)._parsedDate?.getTime() || 0;
            const dateB = (b as any)._parsedDate?.getTime() || 0;
            return dateA - dateB;
        });

    // Soma valores de colunas específicas com trim nas chaves para evitar erros de espaço
    const sumValues = (searchKeys: string[]): number => {
        const lowerSearchKeys = searchKeys.map(k => k.toLowerCase().trim());
        return filteredMetrics.reduce((acc, record) => {
            const recordKeys = Object.keys(record);
            const actualKey = recordKeys.find(rk => lowerSearchKeys.includes(rk.toLowerCase().trim()));
            if (actualKey) {
                const val = Number(record[actualKey]);
                return acc + (isNaN(val) ? 0 : val);
            }
            return acc;
        }, 0);
    };

    // Fallback: Conta registros baseados em texto na coluna 'status' (para quando não há colunas booleanas)
    const countByStatus = (keywords: string[]): number => {
        return filteredMetrics.filter(record => {
            const statusVal = String(record['status'] || '').toLowerCase();
            return keywords.some(k => statusVal.includes(k.toLowerCase()));
        }).length;
    };

    // Helper que tenta somar colunas, se der zero, tenta contar pelo status
    const smartCount = (cols: string[], statusKeywords: string[]): number => {
        const colSum = sumValues(cols);
        if (colSum > 0) return colSum;
        return countByStatus(statusKeywords);
    };

    // --- CÁLCULOS ESTRUTURAIS ---
    
    // Comercial
    const com_leads = filteredMetrics.length;
    const com_analise = sumValues(['aguardando_analise']);
    const com_oportunidade = sumValues(['oportunidade']);
    const com_contratos = sumValues(['contratos_fechados']);
    const com_n5_assinado = sumValues(['n5_contrato_assinado']);
    const com_contratos_total = com_contratos + com_n5_assinado; // Para KPI Card
    const com_taxa = com_leads > 0 ? ((com_contratos / com_leads) * 100).toFixed(2) : '0.00';
    
    // Taxa de Aproveitamento: Contratos / Aguardando Análise (ou Oportunidade)
    const baseAproveitamento = com_analise > 0 ? com_analise : (com_oportunidade > 0 ? com_oportunidade : 1);
    const com_aproveitamento = ((com_contratos / baseAproveitamento) * 100).toFixed(2);

    // Pós-Venda
    const pv_pendentes = sumValues(['clientes_pendentes_total']);
    const pv_reuniao_pendente_col = sumValues(['reuniao_pendente']);
    const pv_reuniao_marcada = sumValues(['n3_reuniao_marcada']);
    const pv_reuniao_feita = sumValues(['n3_reuniao_feita']);
    const pv_aguardando_agendamento = sumValues(['aguardando_agendamento']);
    const pv_n2_aguardando = sumValues(['n2_aguardando_agendamento']);
    const pv_doc_aguard = sumValues(['aguardando_documentacao']);
    const pv_doc_comp = sumValues(['documentacao_completa']);

    // Jurídico
    const jur_producao = sumValues(['producao_de_inicial']);
    const jur_revisao = sumValues(['revisao_de_inicial']);
    const jur_protocolos = sumValues(['processos_protocolados']);
    const jur_estoque = jur_producao + jur_revisao; // Estoque lógico

    // Suporte & Financeiro
    const sup_aguardando = smartCount(['suporte_aguardando_atendimento'], ['suporte pendente']);
    const sup_finalizado = smartCount(['suporte_atendimentos_finalizados', 'atendimentos_finalizados'], ['suporte finalizado']);
    const fin_acordo_pendente = smartCount(['contato_inicial_acordo_pendente'], ['acordo pendente']);
    const fin_aguardando = smartCount(['aguardando_atendimento_financeiro', 'financeiro_aguardando_atendimento'], ['financeiro fila']);

    // --- GESTÃO E CUSTOS ---
    const calculateTotalDailyCostForDate = (targetDateStr: string) => {
      return investments.reduce((total, inv) => {
        if (targetDateStr >= inv.data_inicio && targetDateStr <= inv.data_fim) {
            const start = new Date(inv.data_inicio + 'T12:00:00');
            const end = new Date(inv.data_fim + 'T12:00:00');
            const diffDays = Math.max(1, Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
            return total + (inv.valor / diffDays);
        }
        return total;
      }, 0);
    };

    let totalCost = 0;
    const dayIterator = new Date(rangeStart);
    while (dayIterator <= rangeEnd) {
        const dateStr = toLocalISO(dayIterator);
        totalCost += calculateTotalDailyCostForDate(dateStr);
        dayIterator.setDate(dayIterator.getDate() + 1);
    }

    const gestao_cac = com_contratos > 0 ? totalCost / com_contratos : 0;
    const gestao_custo_prot = jur_protocolos > 0 ? totalCost / jur_protocolos : 0;

    // --- LISTA FIXA DE MÉTRICAS (VISÃO FULL - ORDEM SOLICITADA) ---
    const explicitMetricsList = [
        { label: 'Total de Leads', value: com_leads },
        { label: 'Aguardando Análise', value: com_analise },
        { label: 'Oportunidade', value: com_oportunidade },
        { label: 'Contratos Fechados', value: com_contratos },
        { label: 'N5 Contrato Assinado', value: com_n5_assinado },
        { label: 'Taxa de Conversão', value: `${com_taxa}%` },
        { label: 'Taxa de Aproveitamento', value: `${com_aproveitamento}%` },
        { label: 'Followups Realizados', value: sumValues(['followups_realizados']) },
        { label: 'Reunião Pendente', value: pv_reuniao_pendente_col },
        { label: 'N3 Reunião Marcada', value: pv_reuniao_marcada },
        { label: 'N3 Reunião Feita', value: pv_reuniao_feita },
        { label: 'Aguardando Agendamento', value: pv_aguardando_agendamento },
        { label: 'N2 Aguardando Agendamento', value: pv_n2_aguardando },
        { label: 'Aguardando Documentação', value: pv_doc_aguard },
        { label: 'Documentação Completa', value: pv_doc_comp },
        { label: 'Produção de Inicial', value: jur_producao },
        { label: 'Revisão de Inicial', value: jur_revisao },
        { label: 'Processos Protocolados', value: jur_protocolos },
        { label: 'Estoque de Processos', value: jur_estoque },
        { label: 'Aguardando Atendimento (Suporte)', value: sup_aguardando },
        { label: 'Atendimentos Finalizados (Suporte)', value: sup_finalizado },
        { label: 'Clientes Pendentes Total', value: pv_pendentes },
        { label: 'Contato Inicial Acordo Pendente', value: fin_acordo_pendente },
        { label: 'Aguardando Atendimento Financeiro', value: fin_aguardando },
        { label: 'Custo Aquisição Cliente', value: `R$ ${gestao_cac.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` },
        { label: 'Custo por Protocolo', value: `R$ ${gestao_custo_prot.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` }
    ];

    // KPIs Estruturados para aba ESTRATÉGICO
    return {
        comercial: { leads: com_leads, analise: com_analise, contratos: com_contratos_total, taxa: com_taxa },
        juridico: { producao: jur_estoque, protocolos: jur_protocolos, taxaPeriodo: '0.00', vazaoTotal: '0.00' }, // Simplificado para usar os calculados acima
        posVenda: { pendentes: pv_pendentes, reuniaoPendente: pv_reuniao_pendente_col + pv_aguardando_agendamento + pv_n2_aguardando, reuniaoMarcada: pv_reuniao_marcada, docAguard: pv_doc_aguard, docComp: pv_doc_comp },
        supFin: { supPendente: sup_aguardando, supFinal: sup_finalizado, finFila: fin_aguardando, finAcordos: fin_acordo_pendente },
        gestao: { cac: gestao_cac, custoProt: gestao_custo_prot, totalCost },
        explicitMetricsList,
        filteredMetrics
    };
  }, [metrics, currentRange, investments]);

  const handleUnlock = () => {
    const pin = window.prompt("Digite o PIN de Segurança:");
    if (pin === "4321") {
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
        const mKeys = Object.keys(m);
        const contractsKey = mKeys.find(k => ['contratos_fechados', 'n5_contrato_assinado'].includes(k.toLowerCase()));
        existing.contratos += contractsKey ? (Number(m[contractsKey]) || 0) : 0;
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
            Status: <span className="text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/20">{metrics.length} registros</span> • {currentRange.label}
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center">
             <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800 shadow-xl">
                {[7, 15, 30].map(d => (
                  <button key={d} onClick={() => {
                    const end = new Date(); end.setHours(23,59,59,999); 
                    const start = new Date(); start.setDate(end.getDate() - (d - 1)); start.setHours(0,0,0,0);
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
                <input type="date" value={currentRange.start.toISOString().split('T')[0]} onChange={(e) => {
                  const d = new Date(e.target.value + 'T00:00:00');
                  onRangeChange({...currentRange, start: d, label: 'Customizado'});
                }} className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-xs text-white" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-700 mt-4" />
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Fim</label>
                <input type="date" value={currentRange.end.toISOString().split('T')[0]} onChange={(e) => {
                  const d = new Date(e.target.value + 'T23:59:59');
                  onRangeChange({...currentRange, end: d, label: 'Customizado'});
                }} className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-xs text-white" />
            </div>
            <button onClick={() => setShowDatePicker(false)} className="mt-4 ml-auto p-2 bg-slate-800 rounded-lg text-slate-400"><X className="w-4 h-4" /></button>
        </div>
      )}

      {stats ? (
        activeTab === 'strategic' ? (
          <div className="space-y-10 animate-in fade-in duration-500">
              
              {/* 1. COMERCIAL */}
              <section>
                  <div className="flex items-center gap-3 mb-6">
                      <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" /> COMERCIAL</h3>
                      <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <KPICard title="TOTAL DE LEADS" value={stats.comercial.leads} icon={<Users />} colorClass="text-slate-400" />
                      <KPICard title="OPORTUNIDADES" value={stats.comercial.analise} icon={<Clock />} colorClass="text-blue-400" />
                      <KPICard title="CONTRATOS" value={stats.comercial.contratos} icon={<FileCheck />} colorClass="text-emerald-400" subValue="Soma no período" />
                      <KPICard title="TAXA CONVERSÃO" value={`${stats.comercial.taxa}%`} icon={<Target />} colorClass="text-purple-400" />
                  </div>
              </section>

              {/* 2. PÓS-VENDA */}
              <section>
                  <div className="flex items-center gap-3 mb-6">
                      <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-500" /> PÓS-VENDA</h3>
                      <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <KPICard title="PENDENTES" value={stats.posVenda.pendentes} icon={<Users />} colorClass="text-slate-400" />
                      <KPICard title="REUNIÃO PENDENTE" value={stats.posVenda.reuniaoPendente} icon={<Clock />} colorClass="text-orange-400" />
                      <KPICard title="REUNIÃO MARCADA" value={stats.posVenda.reuniaoMarcada} icon={<Calendar />} colorClass="text-emerald-400" />
                      <KPICard title="DOC. PENDENTE" value={stats.posVenda.docAguard} icon={<FileText />} colorClass="text-blue-400" />
                      <KPICard title="DOC. COMPLETA" value={stats.posVenda.docComp} icon={<CheckCircle />} colorClass="text-indigo-400" />
                  </div>
              </section>

              {/* 3. JURÍDICO */}
              <section>
                  <div className="flex items-center gap-3 mb-6">
                      <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2"><Briefcase className="w-4 h-4 text-amber-500" /> JURÍDICO</h3>
                      <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <KPICard title="PRODUÇÃO INICIAL" value={stats.juridico.producao} icon={<Clock />} colorClass="text-amber-400" />
                      <KPICard title="PROTOCOLADOS" value={stats.juridico.protocolos} icon={<Archive />} colorClass="text-emerald-400" />
                      <KPICard title="EFICIÊNCIA PERÍODO" value={`${(Number(stats.juridico.protocolos) > 0 ? (Number(stats.juridico.protocolos) / Math.max(1, Number(stats.juridico.producao))) * 100 : 0).toFixed(2)}%`} icon={<TrendingUp />} colorClass="text-blue-400" subValue="Conversão do trabalho atual" />
                      <KPICard title="VAZÃO DE ESTOQUE" value={`${(Number(stats.juridico.producao) > 0 ? (Number(stats.juridico.protocolos) / Number(stats.juridico.producao)) * 100 : 0).toFixed(2)}`} icon={<Target />} colorClass="text-purple-400" subValue="Vazão vs Produção" />
                  </div>
              </section>

              {/* 4. SUPORTE & 5. FINANCEIRO */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {/* SUPORTE */}
                  <section>
                      <div className="flex items-center gap-3 mb-6">
                          <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2"><Headphones className="w-4 h-4 text-blue-400" /> SUPORTE</h3>
                          <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                          <div className="grid grid-cols-2 gap-3">
                              <div className="bg-slate-950 p-4 rounded-xl text-center border border-slate-800">
                                  <div className="text-[8px] font-bold text-slate-500 uppercase mb-1">Pendente</div>
                                  <div className="text-2xl font-black text-white">{stats.supFin.supPendente}</div>
                              </div>
                              <div className="bg-slate-950 p-4 rounded-xl text-center border border-slate-800">
                                  <div className="text-[8px] font-bold text-slate-500 uppercase mb-1">Finalizados</div>
                                  <div className="text-2xl font-black text-emerald-500">{stats.supFin.supFinal}</div>
                              </div>
                          </div>
                      </div>
                  </section>

                  {/* FINANCEIRO */}
                  <section>
                      <div className="flex items-center gap-3 mb-6">
                          <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2"><Landmark className="w-4 h-4 text-orange-400" /> FINANCEIRO</h3>
                          <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                          <div className="grid grid-cols-2 gap-3">
                              <div className="bg-slate-950 p-4 rounded-xl text-center border border-slate-800">
                                  <div className="text-[8px] font-bold text-slate-500 uppercase mb-1">Fila</div>
                                  <div className="text-2xl font-black text-white">{stats.supFin.finFila}</div>
                              </div>
                              <div className="bg-slate-950 p-4 rounded-xl text-center border border-slate-800">
                                  <div className="text-[8px] font-bold text-slate-500 uppercase mb-1">Acordos</div>
                                  <div className="text-2xl font-black text-orange-400">{stats.supFin.finAcordos}</div>
                              </div>
                          </div>
                      </div>
                  </section>
              </div>

              {/* GESTÃO E CUSTOS */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-4">
                  <div className="xl:col-span-2 space-y-8">
                      <section className="relative">
                          <div className="flex items-center justify-between mb-6">
                              <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500" /> GESTÃO E CUSTOS</h3>
                              {isGestaoUnlocked ? (
                                <button onClick={() => setIsGestaoUnlocked(false)} className="text-[9px] font-black text-slate-500 hover:text-white border border-slate-800 px-3 py-1.5 rounded-lg uppercase tracking-widest transition-all flex items-center gap-2"><EyeOff className="w-3 h-3" /> Ocultar Dados</button>
                              ) : (
                                <button onClick={handleUnlock} className="text-[9px] font-black text-emerald-500 hover:text-white border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 rounded-lg uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg hover:bg-emerald-500/10"><Lock className="w-3 h-3" /> Desbloquear Dados Sensíveis</button>
                              )}
                          </div>

                          <div className="relative">
                            <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-500 ${!isGestaoUnlocked ? 'opacity-40 grayscale blur-sm pointer-events-none' : 'opacity-100 grayscale-0 blur-0'}`}>
                                <KPICard title="INVESTIMENTO NO PERÍODO" value={isGestaoUnlocked ? `R$ ${stats.gestao.totalCost.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : "R$ •••••••"} subValue="Baseado no intervalo selecionado" icon={<DollarSign />} colorClass="text-slate-200" />
                                <KPICard title="CAC" value={isGestaoUnlocked ? `R$ ${stats.gestao.cac.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : "R$ •••••••"} subValue="Custo/Contrato no período" icon={<Users />} colorClass="text-emerald-400" />
                                <KPICard title="CUSTO POR PROTOCOLO" value={isGestaoUnlocked ? `R$ ${stats.gestao.custoProt.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : "R$ •••••••"} icon={<Archive />} colorClass="text-blue-400" />
                            </div>
                            {!isGestaoUnlocked && (
                              <div className="absolute inset-0 flex items-center justify-center z-20">
                                 <div className="bg-slate-900/90 border border-emerald-500/30 p-6 rounded-2xl shadow-2xl flex flex-col items-center text-center gap-4 max-w-xs backdrop-blur-md">
                                    <div className="p-3 bg-emerald-500/10 rounded-full"><ShieldAlert className="w-8 h-8 text-emerald-500" /></div>
                                    <div className="space-y-1">
                                      <h4 className="text-white font-bold text-sm uppercase tracking-tighter">Área Restrita</h4>
                                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Os dados financeiros e de custos estão protegidos por PIN para privacidade da gestão.</p>
                                    </div>
                                    <button onClick={handleUnlock} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase rounded-xl transition-all shadow-lg shadow-emerald-900/40">Digitar PIN</button>
                                 </div>
                              </div>
                            )}
                          </div>
                      </section>

                      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                          <h2 className="text-white text-lg font-black mb-8 flex items-center gap-2 uppercase tracking-tighter"><BarChart3 className="w-5 h-5 text-emerald-500" /> Evolução de Volume</h2>
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

                  <div className="space-y-6">
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-start gap-3 mt-10">
                          <Info className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          <p className="text-[9px] text-slate-400 leading-relaxed uppercase font-bold tracking-tight">Nota: O investimento é rateado de forma pro-rata entre os dias do calendário do período selecionado que coincidem com o intervalo do investimento cadastrado.</p>
                      </div>
                  </div>
              </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-in zoom-in duration-300">
              {stats.explicitMetricsList.map((item, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex justify-between items-center group hover:border-emerald-500 transition-all">
                        <div>
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 group-hover:text-emerald-500">{item.label}</div>
                            <div className="text-2xl font-black text-white">{item.value}</div>
                        </div>
                    </div>
              ))}
          </div>
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-24 bg-slate-900/20 border border-dashed border-slate-800 rounded-[40px]">
            <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-6" />
            <p className="text-xl font-black text-white uppercase tracking-[0.2em] opacity-60">Cruzando Informações...</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;