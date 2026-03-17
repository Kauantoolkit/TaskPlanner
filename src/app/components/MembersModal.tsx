import React, { useState } from 'react';
import { X, Users, Crown, Trash2, Mail, Copy, RefreshCw, Check } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { motion as Motion, AnimatePresence } from 'motion/react';
import { ConfirmDialog } from './ConfirmDialog';
import { clsx } from 'clsx';
import { toast } from 'sonner';

interface MembersModalProps {
  onClose: () => void;
}

export function MembersModal({ onClose }: MembersModalProps) {
  const {
    members,
    currentWorkspace,
    removeMember,
    regenerateInviteCode,
    isOwner,
  } = useWorkspace();

  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const inviteCode = currentWorkspace?.inviteCode;

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await regenerateInviteCode();
      toast.success('Novo código gerado');
    } catch {
      toast.error('Erro ao gerar novo código');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
        <Motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-100 dark:border-gray-800"
          role="dialog"
          aria-labelledby="members-modal-title"
          aria-modal="true"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 md:p-6 relative">
            <button
              onClick={onClose}
              className="absolute top-3 right-3 md:top-4 md:right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-all"
              aria-label="Fechar modal"
            >
              <X size={18} className="text-white md:w-5" />
            </button>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-10 h-10 md:w-14 md:h-14 bg-white/20 rounded-xl md:rounded-2xl flex items-center justify-center backdrop-blur">
                <Users size={22} className="text-white md:w-7 md:h-7" strokeWidth={2.5} />
              </div>
              <div>
                <h2 id="members-modal-title" className="text-xl md:text-2xl font-black text-white">
                  Membros
                </h2>
                <p className="text-white/80 text-xs md:text-sm font-bold">
                  {currentWorkspace?.name}
                </p>
              </div>
            </div>

            <div className="mt-3 md:mt-4 bg-white/10 backdrop-blur rounded-lg md:rounded-xl p-2 md:p-3">
              <div className="flex items-center justify-between">
                <span className="text-white/90 text-xs md:text-sm font-bold">
                  {members.length} {members.length === 1 ? 'membro' : 'membros'}
                </span>
                <span className="text-white/70 text-[10px] md:text-xs font-bold">
                  Membros ilimitados
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-3 md:p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">

            {/* Invite Code Section */}
            {isOwner() && (
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-900">
                <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">
                  Código de Convite
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-3">
                  Compartilhe este código para convidar pessoas para o workspace.
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 font-black text-lg tracking-[0.25em] text-blue-700 dark:text-blue-300 text-center">
                    {inviteCode || '——'}
                  </div>
                  <button
                    onClick={handleCopyCode}
                    disabled={!inviteCode}
                    className={clsx(
                      'p-3 rounded-xl transition-all min-w-[48px] min-h-[48px] flex items-center justify-center',
                      codeCopied
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                    )}
                    aria-label="Copiar código"
                  >
                    {codeCopied ? <Check size={18} strokeWidth={3} /> : <Copy size={18} strokeWidth={2.5} />}
                  </button>
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all min-w-[48px] min-h-[48px] flex items-center justify-center"
                    aria-label="Gerar novo código"
                    title="Gerar novo código (invalida o anterior)"
                  >
                    <RefreshCw size={18} strokeWidth={2.5} className={regenerating ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
            )}

            {!isOwner() && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                <p className="text-gray-600 dark:text-gray-400 text-sm font-bold">
                  Peça ao dono do workspace o código de convite para adicionar membros.
                </p>
              </div>
            )}

            {/* Members List */}
            <div className="space-y-3">
              <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Membros ({members.length})
              </p>
              <AnimatePresence mode="popLayout">
                {members.map((member) => (
                  <Motion.div
                    key={member.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 flex items-center gap-4 group hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg shrink-0">
                      {member.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-gray-900 dark:text-gray-100 truncate">
                          {member.name}
                        </h3>
                        {member.role === 'owner' && (
                          <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full shrink-0">
                            <Crown size={12} strokeWidth={3} />
                            <span className="text-xs font-black">DONO</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-sm font-bold mt-0.5">
                        <Mail size={14} className="shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    </div>

                    {isOwner() && member.role !== 'owner' && (
                      <button
                        onClick={() => setConfirmDelete({ id: member.id, name: member.name })}
                        className="opacity-0 group-hover:opacity-100 min-w-[36px] min-h-[36px] w-9 h-9 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all shrink-0"
                        aria-label={`Remover ${member.name}`}
                      >
                        <Trash2 size={16} strokeWidth={2.5} />
                      </button>
                    )}
                  </Motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </Motion.div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          isOpen={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onConfirm={async () => {
            try {
              await removeMember(confirmDelete.id);
              setConfirmDelete(null);
            } catch {
              toast.error('Erro ao remover membro');
            }
          }}
          title="Remover membro"
          description={`Tem certeza que deseja remover ${confirmDelete.name} do workspace?`}
          confirmText="Remover"
          cancelText="Cancelar"
          variant="danger"
        />
      )}
    </>
  );
}
