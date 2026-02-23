import React, { useState } from 'react';
import { X, UserPlus, Users, Crown, Trash2, Mail } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { motion as Motion, AnimatePresence } from 'motion/react';

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

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    addMember(name.trim(), email.trim());
    setName('');
    setEmail('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-gray-100 dark:border-gray-800"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-all"
          >
            <X size={20} className="text-white" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur">
              <Users size={28} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">
                Membros
              </h2>
              <p className="text-white/80 text-sm font-bold">
                {currentWorkspace?.name}
              </p>
            </div>
          </div>

          {/* Contador de Membros */}
          <div className="mt-4 bg-white/10 backdrop-blur rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-white/90 text-sm font-bold">
                {members.length} {members.length === 1 ? 'membro' : 'membros'}
              </span>
              <span className="text-white/70 text-xs font-bold">
                Membros ilimitados
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)]">
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
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-gray-900 dark:text-gray-100">
                        {member.name}
                      </h3>
                      {member.role === 'owner' && (
                        <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full">
                          <Crown size={12} strokeWidth={3} />
                          <span className="text-xs font-black">DONO</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-sm font-bold mt-0.5">
                      <Mail size={14} />
                      {member.email}
                    </div>
                  </div>

                  {/* Ações */}
                  {isOwner() && member.role !== 'owner' && (
                    <button
                      onClick={() => {
                        if (confirm(`Remover ${member.name}?`)) {
                          removeMember(member.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 w-9 h-9 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
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
                  className="w-full p-4 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-all flex items-center justify-center gap-2 font-black"
                >
                  <UserPlus size={20} strokeWidth={2.5} />
                  Adicionar Membro
                </button>
              ) : (
                <Motion.form
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleSubmit}
                  className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 space-y-3"
                >
                  <div>
                    <label className="block text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="João Silva"
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="joao@exemplo.com"
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-2 px-4 rounded-xl transition-all"
                    >
                      Adicionar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setName('');
                        setEmail('');
                      }}
                      className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-black hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
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
  );
}
