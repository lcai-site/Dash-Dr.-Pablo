import React, { useState, useEffect } from 'react';
import { Settings, Save, X, DollarSign, TrendingUp, Plus, Trash2, Calendar, AlertTriangle, Loader2, Globe, Edit3 } from 'lucide-react';
import { FinancialSettings, Investment, SupabaseConfig, SettingsModalProps } from '../types';
import { addInvestment, deleteInvestment, updateInvestment } from '../services/supabaseService';

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  currentSettings, 
  investments,
  onSaveSettings,
  onRefreshData,
  config
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'investments'>('general');
  const [ticket, setTicket] = useState(currentSettings.average_ticket);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Investment Form State
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [newInvAmount, setNewInvAmount] = useState('');
  const [newInvStart, setNewInvStart] = useState('');
  const [newInvEnd, setNewInvEnd] = useState('');
  const [newInvPlatform, setNewInvPlatform] = useState('');
  const [isProcessingInv, setIsProcessingInv] = useState(false);
  
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setTicket(currentSettings.average_ticket);
        setErrorMsg(null);
        resetInvestmentForm();
    }
  }, [isOpen, currentSettings]);

  if (!isOpen) return null;

  const handleSaveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    try {
        await onSaveSettings({
            ...currentSettings,
            average_ticket: ticket
        });
    } catch (error: any) {
        console.error("Save Ticket Error:", error);
        setErrorMsg(error.message || "Falha ao salvar ticket médio.");
    } finally {
        setIsSaving(false);
    }
  };

  const resetInvestmentForm = () => {
    setEditingId(null);
    setNewInvAmount('');
    setNewInvStart('');
    setNewInvEnd('');
    setNewInvPlatform('');
    setErrorMsg(null);
  };

  const handleProcessInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvAmount || !newInvStart || !newInvEnd) return;
    
    setIsProcessingInv(true);
    setErrorMsg(null);
    try {
      const payload = {
        data_inicio: newInvStart,
        data_fim: newInvEnd,
        valor: Number(newInvAmount),
        plataforma: newInvPlatform || 'Google Ads'
      };

      if (editingId) {
        await updateInvestment(config, editingId, payload);
      } else {
        await addInvestment(config, payload);
      }
      
      resetInvestmentForm();
      onRefreshData(); 
    } catch (err: any) {
      console.error("Process Investment Error:", err);
      setErrorMsg(err.message || "Erro ao processar investimento.");
    } finally {
      setIsProcessingInv(false);
    }
  };

  const handleStartEdit = (inv: Investment) => {
    setEditingId(inv.id);
    setNewInvAmount(inv.valor.toString());
    setNewInvStart(inv.data_inicio);
    setNewInvEnd(inv.data_fim);
    setNewInvPlatform(inv.plataforma);
    setErrorMsg(null);
    
    const formElement = document.getElementById('inv-form');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteInvestment = async () => {
    if (!editingId) return;
    if (!window.confirm("ATENÇÃO: Deseja realmente EXCLUIR este investimento permanentemente?")) return;
    
    setIsDeleting(true);
    setErrorMsg(null);
    
    try {
      await deleteInvestment(config, editingId);
      resetInvestmentForm();
      onRefreshData();
    } catch (err: any) {
      console.error("Delete Error:", err);
      setErrorMsg(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Settings className="w-5 h-5 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-white">Configurações</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
            <div className="bg-rose-500/10 border-b border-rose-500/20 p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-rose-400 font-medium leading-relaxed">{errorMsg}</p>
            </div>
        )}

        <div className="flex border-b border-slate-800 flex-shrink-0">
          <button 
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'general' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Ticket Médio
          </button>
          <button 
            onClick={() => setActiveTab('investments')}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'investments' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Ads / Tráfego
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          {activeTab === 'general' && (
            <form onSubmit={handleSaveTicket} className="space-y-6">
               <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-400" />
                      Honorários Médios por Contrato (R$)
                  </label>
                  <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
                      <input 
                          type="number" 
                          value={ticket}
                          onChange={(e) => setTicket(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all placeholder:text-slate-700"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                      />
                  </div>
              </div>

              <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-900/20"
              >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>Salvar Ticket <Save className="w-4 h-4" /></>
                  )}
              </button>
            </form>
          )}

          {activeTab === 'investments' && (
            <div className="space-y-8">
               <form id="inv-form" onSubmit={handleProcessInvestment} className={`p-5 rounded-2xl border transition-all ${editingId ? 'bg-indigo-500/5 border-indigo-500/30 ring-1 ring-indigo-500/20 shadow-inner' : 'bg-slate-950/50 border-slate-800'} space-y-4`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-black text-slate-200 flex items-center gap-2 uppercase tracking-widest">
                      {editingId ? <Edit3 className="w-3.5 h-3.5 text-indigo-400" /> : <Plus className="w-3.5 h-3.5 text-emerald-500" />}
                      {editingId ? 'Editar Investimento' : 'Novo Registro de Ads'}
                    </h3>
                    {editingId && (
                      <button 
                        type="button" 
                        onClick={resetInvestmentForm}
                        className="text-[9px] font-black text-indigo-400 hover:text-white uppercase tracking-widest"
                      >
                        CANCELAR
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Início do Período</label>
                      <input 
                        type="date"
                        required
                        value={newInvStart}
                        onChange={(e) => setNewInvStart(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Fim do Período</label>
                      <input 
                        type="date"
                        required
                        value={newInvEnd}
                        onChange={(e) => setNewInvEnd(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Valor Total (R$)</label>
                      <input 
                          type="number" 
                          required
                          value={newInvAmount}
                          onChange={(e) => setNewInvAmount(e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Canal / Plataforma</label>
                      <input 
                          type="text" 
                          required
                          value={newInvPlatform}
                          onChange={(e) => setNewInvPlatform(e.target.value)}
                          placeholder="Ex: Google Ads"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                        />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isProcessingInv || isDeleting}
                      className={`flex-1 font-black text-xs uppercase py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${editingId ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/20'}`}
                    >
                      {isProcessingInv ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>{editingId ? 'Salvar Alterações' : 'Registrar Investimento'} <Save className="w-3.5 h-3.5" /></>
                      )}
                    </button>

                    {editingId && (
                      <button
                        type="button"
                        onClick={handleDeleteInvestment}
                        disabled={isProcessingInv || isDeleting}
                        className="w-12 h-12 bg-rose-500/5 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-500 rounded-xl transition-all flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                        title="Excluir este investimento permanentemente"
                      >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
               </form>

               <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-slate-500 flex items-center gap-2 uppercase tracking-widest">
                      <Calendar className="w-3.5 h-3.5 text-emerald-500" /> Histórico de Lançamentos
                    </h3>
                    <span className="text-[9px] text-slate-600 font-black uppercase tracking-tighter">{investments.length} REGISTROS</span>
                 </div>

                 {investments.length === 0 ? (
                   <div className="text-center py-10 text-slate-600 text-[10px] font-bold uppercase tracking-widest bg-slate-950/30 rounded-2xl border border-dashed border-slate-800">
                     Nenhum investimento registrado ainda.
                   </div>
                 ) : (
                   <div className="space-y-3">
                     {investments.map((inv) => (
                       <div key={inv.id} className={`flex items-center justify-between p-4 bg-slate-950 border rounded-2xl transition-all group ${editingId === inv.id ? 'border-indigo-500 ring-1 ring-indigo-500/20 shadow-lg' : 'border-slate-800 hover:border-slate-700 shadow-sm'}`}>
                         <div className="flex-1">
                           <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">
                             <Globe className="w-3 h-3 text-emerald-500" />
                             {inv.plataforma}
                             <span className="text-slate-800 mx-1">|</span>
                             <Calendar className="w-3 h-3" />
                             {new Date(inv.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')} - {new Date(inv.data_fim + 'T12:00:00').toLocaleDateString('pt-BR')}
                           </div>
                           <div className="text-lg font-black text-white tracking-tight">
                             R$ {inv.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                           </div>
                         </div>
                         
                         <div className="flex items-center gap-2">
                           <button 
                              onClick={() => handleStartEdit(inv)}
                              className={`p-2.5 transition-all rounded-lg border ${editingId === inv.id ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-emerald-500/50 hover:text-emerald-400'}`}
                              title="Editar este registro"
                           >
                             <Edit3 className="w-4 h-4" />
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;