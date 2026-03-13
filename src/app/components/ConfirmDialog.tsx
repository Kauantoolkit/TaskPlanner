import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger'
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const variantStyles = {
    danger: {
      icon: 'text-red-600',
      iconBg: 'bg-red-50 dark:bg-red-950/20',
      confirmButton: 'bg-red-600 hover:bg-red-700 text-white shadow-red-100'
    },
    warning: {
      icon: 'text-yellow-600',
      iconBg: 'bg-yellow-50 dark:bg-yellow-950/20',
      confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-yellow-100'
    },
    info: {
      icon: 'text-blue-600',
      iconBg: 'bg-blue-50 dark:bg-blue-950/20',
      confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100'
    }
  };

  const styles = variantStyles[variant];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
          role="alertdialog"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-description"
        >
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className={`${styles.iconBg} p-3 rounded-full shrink-0`}>
                <AlertTriangle size={24} className={styles.icon} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  id="confirm-dialog-title"
                  className="text-lg font-black text-gray-800 dark:text-gray-100 mb-2"
                >
                  {title}
                </h3>
                <p
                  id="confirm-dialog-description"
                  className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed"
                >
                  {description}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors shrink-0"
                aria-label="Fechar diálogo"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
          </div>

          <div className="p-6 pt-0 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-black py-3 rounded-xl transition-all min-h-[44px]"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={`flex-1 ${styles.confirmButton} font-black py-3 rounded-xl transition-all shadow-lg min-h-[44px]`}
              autoFocus
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
