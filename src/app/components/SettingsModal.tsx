import React from 'react';
import { X, Trash2, Moon, Sun, Bell, Settings as SettingsIcon } from 'lucide-react';
import { Settings } from '../types';

interface SettingsModalProps {
  settings: Settings;
  onUpdate: (newSettings: Settings) => void;
  onClose: () => void;
  onClearAll: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onUpdate, onClose, onClearAll }) => {
  const toggleSetting = (key: keyof Settings) => {
    onUpdate({ ...settings, [key]: !settings[key] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 transition-colors">
        <div className="p-8 pb-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-gray-800 dark:text-gray-100 tracking-tight flex items-center gap-2">
              <SettingsIcon size={24} className="text-blue-600" /> Configurações
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                  {settings.darkMode ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-gray-700 dark:text-gray-200">Tema Escuro</span>
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Ajuste visual</span>
                </div>
              </div>
              <button
                onClick={() => toggleSetting('darkMode')}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.darkMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Bell size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-gray-700 dark:text-gray-200">Confirmar exclusão</span>
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Segurança extra</span>
                </div>
              </div>
              <button
                onClick={() => toggleSetting('confirmDelete')}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.confirmDelete ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.confirmDelete ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="pt-4 mt-8 border-t border-gray-100 dark:border-gray-800">
              <h3 className="text-xs font-black text-red-400 uppercase tracking-widest px-2 mb-4">Zona de Perigo</h3>
              <button
                onClick={() => {
                  if (confirm('Tem certeza que deseja apagar todos os dados? Isso não pode ser desfeito.')) {
                    onClearAll();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 p-4 text-red-500 font-bold border-2 border-red-50 dark:border-red-950/30 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-2xl transition-all group"
              >
                <Trash2 size={20} className="group-hover:rotate-12 transition-transform" /> APAGAR TODOS OS DADOS
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 pt-4">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-100 dark:shadow-none"
          >
            SALVAR E VOLTAR
          </button>
        </div>
      </div>
    </div>
  );
};
