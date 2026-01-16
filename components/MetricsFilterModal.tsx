import React from 'react';
import { X, CheckSquare, Square, Eye, EyeOff } from 'lucide-react';

interface MetricsFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableMetrics: string[];
  selectedMetrics: string[];
  onToggleMetric: (metric: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const MetricsFilterModal: React.FC<MetricsFilterModalProps> = ({
  isOpen,
  onClose,
  availableMetrics,
  selectedMetrics,
  onToggleMetric,
  onSelectAll,
  onDeselectAll
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-800/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Eye className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Métricas Visíveis</h2>
              <p className="text-xs text-slate-400 mt-1">Selecione quais indicadores deseja exibir no painel.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-800 bg-slate-900">
            <button 
                onClick={onSelectAll}
                className="text-[10px] font-black uppercase tracking-wider flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all border border-emerald-500/20"
            >
                <CheckSquare className="w-3 h-3" /> Marcar Todas
            </button>
            <button 
                onClick={onDeselectAll}
                className="text-[10px] font-black uppercase tracking-wider flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all border border-rose-500/20"
            >
                <Square className="w-3 h-3" /> Desmarcar Todas
            </button>
            <div className="ml-auto text-xs text-slate-500 font-medium">
                {selectedMetrics.length} de {availableMetrics.length} selecionadas
            </div>
        </div>

        {/* List */}
        <div className="p-6 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-3">
          {availableMetrics.map((metric) => {
            const isSelected = selectedMetrics.includes(metric);
            return (
              <div 
                key={metric}
                onClick={() => onToggleMetric(metric)}
                className={`
                    flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none
                    ${isSelected 
                        ? 'bg-indigo-500/10 border-indigo-500/50 shadow-sm' 
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 opacity-60 hover:opacity-100'
                    }
                `}
              >
                <div className={`
                    w-5 h-5 rounded flex items-center justify-center transition-colors border
                    ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-transparent'}
                `}>
                    <CheckSquare className="w-3.5 h-3.5" />
                </div>
                <span className={`text-xs font-bold uppercase tracking-wide ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                    {metric}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-800/30 rounded-b-2xl flex justify-end">
             <button 
                onClick={onClose}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-indigo-900/20 text-sm"
             >
                Concluir
             </button>
        </div>
      </div>
    </div>
  );
};

export default MetricsFilterModal;