import React, { useState } from 'react';
import { X, UserPlus, Users, Crown, Trash2, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { memberSchema } from '../schemas/formSchemas';
import { useWorkspace } from '../context/WorkspaceContext';
import { motion as Motion, AnimatePresence } from 'motion/react';
import { ConfirmDialog } from './ConfirmDialog';
import { clsx } from 'clsx';

interface MembersModalProps {
  onClose: () => void;
}

export function MembersModal({ onClose }: MembersModalProps) {
  const {
    members,
    currentWorkspace,
    addMember,
    removeMember,
    isOwner
  } = useWorkspace();

  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isValid }
  } = useForm({
    resolver: zodResolver(memberSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: ''
    }
  });

  const onSubmit = async (data: { name: string; email: string }) => {
    // Check for duplicate email
    const emailExists = members.some(
      member => member.email.toLowerCase() === data.email.toLowerCase()
    );

    if (emailExists) {
      setError('email', {
        type: 'manual',
        message: 'Este email já está cadastrado'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addMember(data.name, data.email);
      reset({ name: '', email: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding member:', error);
      setError('email', {
        type: 'manual',
        message: 'Erro ao adicionar membro'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    reset({ name: '', email: '' });
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

            {/* Contador de Membros */}
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
          <div className="p-3 md:p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Lista de Membros */}
            <div className="space-y-3 mb-6">
              <AnimatePresence mode="popLayout">
                {members.map((member) => (
                  <Motion.div
                    key={member.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 flex items-center gap-4 group hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                  >
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg">
                      {member.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
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

                    {/* Ações */}
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

            {/* Adicionar Membro */}
            {isOwner() && (
              <div>
                {!showAddForm ? (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full p-4 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-all flex items-center justify-center gap-2 font-black min-h-[56px]"
                  >
                    <UserPlus size={20} strokeWidth={2.5} />
                    Adicionar Membro
                  </button>
                ) : (
                  <Motion.form
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleSubmit(onSubmit)}
                    className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="member-name"
                        className="block text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1 px-1"
                      >
                        Nome
                      </label>
                      <input
                        id="member-name"
                        type="text"
                        maxLength={100}
                        placeholder="João Silva"
                        {...register('name')}
                        className={clsx(
                          "w-full px-4 py-3 rounded-xl border-2 font-bold focus:outline-none transition-all",
                          errors.name
                            ? "border-red-500 bg-red-50/50 dark:bg-red-950/20 text-gray-900 dark:text-gray-100"
                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        )}
                        autoFocus
                        aria-invalid={!!errors.name}
                        aria-describedby={errors.name ? "name-error" : undefined}
                        aria-required="true"
                      />
                      {errors.name && (
                        <p id="name-error" className="text-xs text-red-600 dark:text-red-400 mt-1 px-1 font-bold" role="alert">
                          {errors.name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="member-email"
                        className="block text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1 px-1"
                      >
                        Email
                      </label>
                      <input
                        id="member-email"
                        type="email"
                        maxLength={255}
                        placeholder="joao@exemplo.com"
                        {...register('email')}
                        className={clsx(
                          "w-full px-4 py-3 rounded-xl border-2 font-bold focus:outline-none transition-all",
                          errors.email
                            ? "border-red-500 bg-red-50/50 dark:bg-red-950/20 text-gray-900 dark:text-gray-100"
                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        )}
                        aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? "email-error" : undefined}
                        aria-required="true"
                      />
                      {errors.email && (
                        <p id="email-error" className="text-xs text-red-600 dark:text-red-400 mt-1 px-1 font-bold" role="alert">
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={!isValid || isSubmitting}
                        className={clsx(
                          "flex-1 font-black py-3 px-4 rounded-xl transition-all min-h-[48px] flex items-center justify-center gap-2",
                          !isValid || isSubmitting
                            ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        )}
                        aria-disabled={!isValid || isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ADICIONANDO...
                          </>
                        ) : (
                          'Adicionar'
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelForm}
                        disabled={isSubmitting}
                        className="px-4 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-black hover:bg-gray-300 dark:hover:bg-gray-600 transition-all min-h-[48px]"
                      >
                        Cancelar
                      </button>
                    </div>
                  </Motion.form>
                )}
              </div>
            )}

            {!isOwner() && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                <p className="text-gray-600 dark:text-gray-400 text-sm font-bold">
                  Apenas o dono do workspace pode adicionar membros.
                </p>
              </div>
            )}
          </div>
        </Motion.div>
      </div>

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <ConfirmDialog
          isOpen={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => {
            removeMember(confirmDelete.id);
            setConfirmDelete(null);
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
