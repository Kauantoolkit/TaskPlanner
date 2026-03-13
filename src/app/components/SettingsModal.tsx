import React, { useState } from 'react';
import { X, Trash2, Moon, Sun, Bell, Settings as SettingsIcon, Clock } from 'lucide-react';
import { Settings } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

interface SettingsModalProps {
  settings: Settings;
  onUpdate: (newSettings: Settings) => void;
  onClose: () => void;
  onClearAll: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onUpdate, onClose, onClearAll }) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const toggleSetting = (key: keyof Settings) => {
    onUpdate({ ...settings, [key]: !settings[key] });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-2 md:p-4">
        <div
          className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 transition-colors max-h-[90vh] overflow-y-auto"
          role="dialog"
          aria-labelledby="settings-modal-title"
          aria-modal="true"
        >
          <div className="p-4 md:p-8 pb-4">
            <div className="flex items-center justify-between mb-4 md:mb-8">
              <h2
                id="settings-modal-title"
                className="text-lg md:text-xl font-black text-gray-800 dark:text-gray-100 tracking-tight flex items-center gap-2"
              >
                <SettingsIcon size={24} className="text-blue-600" /> Configurações
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors min-w-[44px] min-h-[44px]"
                aria-label="Fechar modal"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Dark Mode Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl" aria-hidden="true">
                    {settings.darkMode ? <Moon size={20} /> : <Sun size={20} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-700 dark:text-gray-200" id="dark-mode-label">
                      Tema Escuro
                    </span>
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                      Ajuste visual
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleSetting('darkMode')}
                  role="switch"
                  aria-checked={settings.darkMode}
                  aria-labelledby="dark-mode-label"
                  className={`w-12 h-6 rounded-full transition-colors relative min-w-[48px] min-h-[24px] ${
                    settings.darkMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.darkMode ? 'translate-x-6' : 'translate-x-0'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="sr-only">{settings.darkMode ? 'Desativar' : 'Ativar'} tema escuro</span>
                </button>
              </div>

              {/* Confirm Delete Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl" aria-hidden="true">
                    <Bell size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-700 dark:text-gray-200" id="confirm-delete-label">
                      Confirmar exclusão
                    </span>
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                      Segurança extra
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleSetting('confirmDelete')}
                  role="switch"
                  aria-checked={settings.confirmDelete}
                  aria-labelledby="confirm-delete-label"
                  className={`w-12 h-6 rounded-full transition-colors relative min-w-[48px] min-h-[24px] ${
                    settings.confirmDelete ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.confirmDelete ? 'translate-x-6' : 'translate-x-0'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="sr-only">{settings.confirmDelete ? 'Desativar' : 'Ativar'} confirmação de exclusão</span>
                </button>
              </div>

              {/* Sort By Time Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-xl" aria-hidden="true">
                    <Clock size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-700 dark:text-gray-200" id="sort-by-time-label">
                      Ordenar por horário
                    </span>
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                      Organização
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleSetting('sortByTime')}
                  role="switch"
                  aria-checked={settings.sortByTime}
                  aria-labelledby="sort-by-time-label"
                  className={`w-12 h-6 rounded-full transition-colors relative min-w-[48px] min-h-[24px] ${
                    settings.sortByTime ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.sortByTime ? 'translate-x-6' : 'translate-x-0'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="sr-only">{settings.sortByTime ? 'Desativar' : 'Ativar'} ordenação por horário</span>
                </button>
              </div>

              {/* Danger Zone */}
              <div className="pt-4 mt-8 border-t border-gray-100 dark:border-gray-800">
                <h3 className="text-xs font-black text-red-400 uppercase tracking-widest px-2 mb-4">
                  Zona de Perigo
                </h3>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 p-4 text-red-500 font-bold border-2 border-red-50 dark:border-red-950/30 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-2xl transition-all group min-h-[56px]"
                  aria-label="Apagar todos os dados"
                >
                  <Trash2 size={20} className="group-hover:rotate-12 transition-transform" strokeWidth={2.5} />
                  APAGAR TODOS OS DADOS
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-8 pt-4">
            <button
              onClick={onClose}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 md:py-4 rounded-xl md:rounded-2xl transition-all shadow-xl shadow-blue-100 dark:shadow-none min-h-[56px]"
            >
              SALVAR E VOLTAR
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Clear All Dialog */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={onClearAll}
        title="Apagar todos os dados"
        description="Tem certeza que deseja apagar todos os dados? Esta ação não pode ser desfeita. Todas as suas tarefas, categorias e configurações serão perdidas permanentemente."
        confirmText="Sim, apagar tudo"
        cancelText="Cancelar"
        variant="danger"
      />
    </>
  );
};
