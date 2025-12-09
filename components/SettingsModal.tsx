import React, { useState, useEffect } from 'react';
import { Settings, Save, X, DollarSign, TrendingUp, Plus, Trash2, Calendar, AlertTriangle, Loader2 } from 'lucide-react';
import { FinancialSettings, Investment, SupabaseConfig } from '../types';
import { addInvestment, deleteInvestment } from '../services/supabaseService';
import { SUPABASE_CONFIG } from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: FinancialSettings;
  investments: Investment[];
  onSaveSettings: (settings: FinancialSettings) => Promise<void>;
  onRefreshData: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  currentSettings, 
  investments,
  onSaveSettings,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'investments'>('general');
  const [ticket, setTicket] = useState(currentSettings.average_ticket);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Investment State
  const [newInvAmount, setNewInvAmount] = useState('');
  const [newInvStart, setNewInvStart] = useState('');
  const [newInvEnd, setNewInvEnd] = useState('');
  const [isAddingInv, setIsAddingInv] = useState(false);
  
  // Deleting State (stores the ID of the item being deleted)
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
        setTicket(currentSettings.average_ticket);
        setErrorMsg(null);
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
        // Stay open or give visual feedback? For now, we just stop loading.
    } catch (error: any) {
        setErrorMsg(error.message || "Failed to save settings");
    } finally {
        setIsSaving(false);
    }
  };

  const handleAddInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvAmount || !newInvStart || !newInvEnd) return;
    
    setIsAddingInv(true);
    setErrorMsg(null);
    try {
      await addInvestment(SUPABASE_CONFIG, {
        start_date: newInvStart,
        end_date: newInvEnd,
        amount: Number(newInvAmount)
      });
      // Reset form
      setNewInvAmount('');
      setNewInvStart('');
      setNewInvEnd('');
      onRefreshData(); // Reloads investments list
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add investment");
    } finally {
      setIsAddingInv(false);
    }
  };

  const handleDeleteInvestment = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja remover este investimento?")) return;
    
    setDeletingId(id);
    setErrorMsg(null);
    
    try {
      await deleteInvestment(SUPABASE_CONFIG, id);
      onRefreshData();
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erro ao excluir. Verifique se a Policy (RLS) de DELETE está ativa no Supabase.");
    } finally {
      setDeletingId(null);
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

        {/* Error Display */}
        {errorMsg && (
            <div className="bg-rose-500/10 border-b border-rose-500/20 p-3 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-rose-400">{errorMsg}</p>
            </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-800 flex-shrink-0">
          <button 
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Geral
          </button>
          <button 
            onClick={() => setActiveTab('investments')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'investments' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Investimentos
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          {/* TAB 1: GENERAL (TICKET) */}
          {activeTab === 'general' && (
            <form onSubmit={handleSaveTicket} className="space-y-6">
               <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-400" />
                      Ticket Médio (Por Contrato)
                  </label>
                  <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                      <input 
                          type="number" 
                          value={ticket}
                          onChange={(e) => setTicket(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-slate-600"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                      />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Valor médio estimado de honorários para cada contrato fechado. Utilizado para calcular a Receita Estimada e ROI.
                  </p>
              </div>

              <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                  {!isSaving && <Save className="w-4 h-4" />}
              </button>
            </form>
          )}

          {/* TAB 2: INVESTMENTS */}
          {activeTab === 'investments' && (
            <div className="space-y-8">
               {/* Add New Form */}
               <form onSubmit={handleAddInvestment} className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-500" />
                    Novo Investimento
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Início</label>
                      <input 
                        type="date"
                        required
                        value={newInvStart}
                        onChange={(e) => setNewInvStart(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Fim</label>
                      <input 
                        type="date"
                        required
                        value={newInvEnd}
                        onChange={(e) => setNewInvEnd(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Valor Investido (R$)</label>
                    <input 
                        type="number" 
                        required
                        value={newInvAmount}
                        onChange={(e) => setNewInvAmount(e.target.value)}
                        placeholder="Ex: 1000.00"
                        step="0.01"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                      />
                  </div>

                  <button
                    type="submit"
                    disabled={isAddingInv}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/20 text-xs font-semibold py-2 rounded transition-all"
                  >
                    {isAddingInv ? 'Adicionando...' : 'Adicionar Investimento'}
                  </button>
               </form>

               {/* List */}
               <div className="space-y-3">
                 <h3 className="text-sm font-semibold text-slate-200">Histórico</h3>
                 {investments.length === 0 ? (
                   <div className="text-center py-6 text-slate-500 text-xs italic bg-slate-950/30 rounded-lg">
                     Nenhum investimento registrado.
                   </div>
                 ) : (
                   <div className="space-y-2">
                     {investments.map((inv) => (
                       <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors">
                         <div>
                           <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                             <Calendar className="w-3 h-3" />
                             {new Date(inv.start_date).toLocaleDateString('pt-BR')} até {new Date(inv.end_date).toLocaleDateString('pt-BR')}
                           </div>
                           <div className="text-sm font-bold text-white">
                             R$ {inv.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                           </div>
                         </div>
                         <button 
                            onClick={() => handleDeleteInvestment(inv.id)}
                            disabled={deletingId === inv.id}
                            className="p-2 text-slate-600 hover:text-rose-500 transition-colors rounded hover:bg-rose-500/10 disabled:opacity-50"
                            title="Remover"
                         >
                           {deletingId === inv.id ? (
                             <Loader2 className="w-4 h-4 animate-spin" />
                           ) : (
                             <Trash2 className="w-4 h-4" />
                           )}
                         </button>
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