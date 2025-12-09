import React, { useState } from 'react';
import { Database, Key, Globe, LayoutDashboard, Loader2, ArrowRight } from 'lucide-react';
import { SupabaseConfig } from '../types';

interface ConnectionModalProps {
  onConnect: (config: SupabaseConfig) => Promise<void>;
  onDemo: () => void;
  isLoading: boolean;
  error: string | null;
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({ onConnect, onDemo, isLoading, error }) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && key) {
      onConnect({ url, key });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-slate-800/50 p-6 border-b border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
                <LayoutDashboard className="w-6 h-6 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-white">LeadFlow Connect</h2>
          </div>
          <p className="text-slate-400 text-sm">
            Connect to your Supabase project to visualize your <code>dashboard_diario</code> data.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-500" />
              Project URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzproject.supabase.co"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-slate-600"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Key className="w-4 h-4 text-slate-500" />
              Anon API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6Ik..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-slate-600"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                Connect Database
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
          
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-700"></div>
            <span className="flex-shrink-0 mx-4 text-slate-500 text-xs uppercase">Or</span>
            <div className="flex-grow border-t border-slate-700"></div>
          </div>

          <button
            type="button"
            onClick={onDemo}
            className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <Database className="w-4 h-4" />
            View Demo Data
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConnectionModal;
