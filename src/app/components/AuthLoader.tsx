import React from 'react';
import { Loader2 } from 'lucide-react';

export function AuthLoader() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 size={48} className="text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-400 font-bold">Carregando...</p>
      </div>
    </div>
  );
}
