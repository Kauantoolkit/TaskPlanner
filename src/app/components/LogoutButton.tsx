import React from 'react';
import { supabase } from '../lib/supabase';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

export function LogoutButton() {
  const handleLogout = async () => {
    try {
      // Limpar dados locais primeiro
      localStorage.clear();
      sessionStorage.clear();
      
      // Fazer signOut no Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success('Logout realizado!');
      
      // Forçar navegação para a página atual ( limpa cache e força re-render)
      window.location.href = window.location.href;
    } catch (error: any) {
      // Em caso de erro, ainda assim tenta redirecionar
      console.error('Erro no logout:', error);
      window.location.href = window.location.href;
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
