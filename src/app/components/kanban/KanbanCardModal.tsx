import React, { useState } from 'react';
import { X, Trash2, Calendar, Tag } from 'lucide-react';
import { KanbanCard } from '../../types';

interface KanbanCardModalProps {
  card: KanbanCard;
  onClose: () => void;
  onUpdate: (data: Partial<Pick<KanbanCard, 'title' | 'description' | 'dueDate' | 'labels'>>) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function KanbanCardModal({ card, onClose, onUpdate, onDelete }: KanbanCardModalProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? '');
  const [dueDate, setDueDate] = useState(card.dueDate ?? '');
  const [labelInput, setLabelInput] = useState('');
  const [labels, setLabels] = useState<string[]>(card.labels);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onUpdate({
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        labels,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const addLabel = () => {
    const l = labelInput.trim();
    if (l && !labels.includes(l)) {
      setLabels(prev => [...prev, l]);
    }
    setLabelInput('');
  };

  const removeLabel = (label: string) => {
    setLabels(prev => prev.filter(l => l !== label));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md flex flex-col gap-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold dark:text-white">Editar Card</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={20} className="dark:text-gray-400" />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Título</label>
          <input
            className="border dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Descrição</label>
          <textarea
            className="border dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Descrição opcional..."
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <Calendar size={12} /> Data de entrega
          </label>
          <input
            type="date"
            className="border dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <Tag size={12} /> Etiquetas
          </label>
          <div className="flex gap-2">
            <input
              className="flex-1 border dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={labelInput}
              onChange={e => setLabelInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLabel())}
              placeholder="Adicionar etiqueta..."
            />
            <button
              onClick={addLabel}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              +
            </button>
          </div>
          {labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {labels.map(l => (
                <span
                  key={l}
                  className="flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full"
                >
                  {l}
                  <button onClick={() => removeLabel(l)} className="hover:text-red-500 transition-colors">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-2">
          <button
            onClick={async () => { await onDelete(); onClose(); }}
            className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 transition-colors"
          >
            <Trash2 size={16} /> Excluir
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
