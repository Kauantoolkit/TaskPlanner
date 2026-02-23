import React from 'react';
import { supabase } from '../lib/supabase';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

export function LogoutButton() {
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Logout realizado!');
    } catch (error: any) {
      toast.error('Erro ao fazer logout');
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 px-4 py-2 text-sm font-black text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
      title="Sair da conta"
    >
      <LogOut size={18} strokeWidth={2.5} />
      <span>SAIR</span>
    </button>
  );
}
