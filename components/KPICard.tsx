import React from 'react';
import {KPICardProps} from '../types';
import {TrendingUp, TrendingDown, Minus} from 'lucide-react';

const KPICard: React.FC<KPICardProps> = ({ title, value, subValue, icon, trend, trendValue, colorClass }) => {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
      <div className={`absolute -right-4 -top-4 p-8 rounded-full opacity-5 group-hover:opacity-10 transition-opacity ${colorClass.replace('text-', 'bg-')}`}>
      </div>
      
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className={`p-2 rounded-lg bg-slate-900/50 border border-slate-700/50 ${colorClass}`}>
           {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: "w-5 h-5" }) : icon}
        </div>
        {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-slate-900/50 border border-slate-700/50
                ${trend === 'up' ? 'text-emerald-400' : ''}
                ${trend === 'down' ? 'text-rose-400' : ''}
                ${trend === 'neutral' ? 'text-slate-400' : ''}
            `}>
              {trend === 'up' && <TrendingUp className="w-3 h-3" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3" />}
              {trendValue}
            </div>
        )}
      </div>

      <div className="relative z-10">
        <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">{title}</h3>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        {subValue && (
            <p className="text-slate-500 text-xs mt-1">{subValue}</p>
        )}
      </div>
    </div>
  );
};

export default KPICard;