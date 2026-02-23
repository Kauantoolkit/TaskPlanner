import React, { useState } from 'react';
import { Info, X } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export function LocalModeBanner() {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('local-mode-banner-dismissed') === 'true';
  });

  if (isSupabaseConfigured || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('local-mode-banner-dismissed', 'true');
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50 px-4 py-2">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Info size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            <span className="font-black">Modo Local:</span> Seus dados estão salvos apenas neste navegador. 
            <a 
              href="/AUTENTICACAO_SUPABASE.md" 
              target="_blank"
              className="underline ml-1 hover:text-blue-600"
            >
              Configure autenticação
            </a> para sincronizar entre dispositivos.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors shrink-0"
          title="Dispensar"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
