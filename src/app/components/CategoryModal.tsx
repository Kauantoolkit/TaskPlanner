import React, { useState } from 'react';
import { X, Plus, Trash2, Check } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { categorySchema } from '../schemas/formSchemas';
import { Category } from '../types';
import { CATEGORY_COLORS } from '../types/formTypes';
import { clsx } from 'clsx';

interface CategoryModalProps {
  categories: Category[];
  onClose: () => void;
  onAdd: (name: string, color: string) => void;
  onDelete: (id: string) => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({ categories, onClose, onAdd, onDelete }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isValid }
  } = useForm({
    resolver: zodResolver(categorySchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      color: CATEGORY_COLORS[0].value
    }
  });

  const selectedColor = watch('color');

  const onSubmit = async (data: { name: string; color: string }) => {
    setIsSubmitting(true);
    try {
      await onAdd(data.name, data.color);
      // Reset form completely including color
      reset({
        name: '',
        color: CATEGORY_COLORS[0].value
      });
    } catch (error) {
      console.error('Error adding category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-2 md:p-4">
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 transition-colors max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-labelledby="category-modal-title"
        aria-modal="true"
      >
        <div className="p-4 md:p-8 pb-4">
          <div className="flex items-center justify-between mb-4 md:mb-8">
            <h2
              id="category-modal-title"
              className="text-lg md:text-xl font-black text-gray-800 dark:text-gray-100 tracking-tight"
            >
              Categorias
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors min-w-[44px] min-h-[44px]"
              aria-label="Fechar modal"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mb-6 md:mb-8 space-y-4">
            <div>
              <label
                htmlFor="category-name"
                className="text-xs uppercase tracking-widest font-black text-gray-400 dark:text-gray-500 mb-2 block px-1"
              >
                Nova Categoria
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    id="category-name"
                    type="text"
                    autoFocus
                    maxLength={50}
                    placeholder="Ex: Trabalho, Estudo..."
                    {...register('name')}
                    className={clsx(
                      "w-full bg-gray-50 dark:bg-gray-800 border-2 outline-none rounded-xl px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600",
                      errors.name
                        ? "border-red-500 focus:border-red-600 bg-red-50/50 dark:bg-red-950/20"
                        : "border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-950"
                    )}
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
                <button
                  type="submit"
                  disabled={!isValid || isSubmitting}
                  className={clsx(
                    "p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all shadow-lg",
                    !isValid || isSubmitting
                      ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed shadow-none"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100 dark:shadow-none"
                  )}
                  aria-label="Adicionar categoria"
                  aria-disabled={!isValid || isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Plus size={20} strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest font-black text-gray-400 dark:text-gray-500 mb-2 block px-1">
                Cor da Categoria
              </label>
              <div className="flex flex-wrap gap-2">
                <Controller
                  name="color"
                  control={control}
                  render={({ field }) => (
                    <>
                      {CATEGORY_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => field.onChange(color.value)}
                          className={clsx(
                            "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all",
                            color.value.split(' ')[0],
                            field.value === color.value
                              ? "ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-900 scale-110"
                              : "scale-100 hover:scale-105"
                          )}
                          aria-label={`Cor ${color.name}`}
                          aria-pressed={field.value === color.value}
                        >
                          {field.value === color.value && <Check size={16} className="text-white" strokeWidth={3} />}
                        </button>
                      ))}
                    </>
                  )}
                />
              </div>
            </div>
          </form>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl group transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={clsx("w-3 h-3 rounded-full", cat.color.split(' ')[0])} />
                  <span className="font-bold text-gray-700 dark:text-gray-200">{cat.name}</span>
                </div>
                <button
                  onClick={() => onDelete(cat.id)}
                  className="text-gray-300 dark:text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  aria-label={`Remover categoria ${cat.name}`}
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
        <div className="p-4 md:p-8 pt-4">
          <button
            onClick={onClose}
            className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-black py-3 md:py-4 rounded-xl md:rounded-2xl transition-all min-h-[44px]"
          >
            FECHAR
          </button>
        </div>
      </div>
    </div>
  );
};
