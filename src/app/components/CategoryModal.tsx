import React, { useState } from 'react';
import { X, Plus, Trash2, Check } from 'lucide-react';
import { Category } from '../types';
import { clsx } from 'clsx';

interface CategoryModalProps {
  categories: Category[];
  onClose: () => void;
  onAdd: (name: string, color: string) => void;
  onDelete: (id: string) => void;
}

const COLORS = [
  { name: 'Blue', value: 'bg-blue-500 text-white' },
  { name: 'Orange', value: 'bg-orange-500 text-white' },
  { name: 'Green', value: 'bg-emerald-500 text-white' },
  { name: 'Purple', value: 'bg-purple-500 text-white' },
  { name: 'Rose', value: 'bg-rose-500 text-white' },
  { name: 'Indigo', value: 'bg-indigo-500 text-white' },
  { name: 'Gray', value: 'bg-gray-500 text-white' },
  { name: 'Amber', value: 'bg-amber-500 text-white' },
];

export const CategoryModal: React.FC<CategoryModalProps> = ({ categories, onClose, onAdd, onDelete }) => {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name, selectedColor);
    setName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 transition-colors">
        <div className="p-8 pb-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-gray-800 dark:text-gray-100 tracking-tight">Categorias</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mb-8 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest font-black text-gray-400 dark:text-gray-500 mb-2 block px-1">Nova Categoria</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Trabalho, Estudo..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-950 outline-none rounded-xl px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600"
                />
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-3 rounded-xl transition-all shadow-lg shadow-blue-100 dark:shadow-none"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={clsx(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                    color.value.split(' ')[0],
                    selectedColor === color.value ? "ring-2 ring-offset-2 ring-blue-500 scale-110" : "scale-100"
                  )}
                >
                  {selectedColor === color.value && <Check size={14} />}
                </button>
              ))}
            </div>
          </form>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl group transition-colors">
                <div className="flex items-center gap-3">
                  <div className={clsx("w-3 h-3 rounded-full", cat.color.split(' ')[0])} />
                  <span className="font-bold text-gray-700 dark:text-gray-200">{cat.name}</span>
                </div>
                <button
                  onClick={() => onDelete(cat.id)}
                  className="text-gray-300 dark:text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-center py-8 text-gray-400 font-medium italic">Nenhuma categoria criada.</p>
            )}
          </div>
        </div>
        <div className="p-8 pt-4">
          <button
            onClick={onClose}
            className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-black py-4 rounded-2xl transition-all"
          >
            FECHAR
          </button>
        </div>
      </div>
    </div>
  );
};
