import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import PulseModal from './PulseModal';
import { useTranslation } from 'react-i18next';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  itemName?: string;
  loading?: boolean;
}

const ConfirmDeleteModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  itemName,
  loading 
}: ConfirmDeleteModalProps) => {
  const { t } = useTranslation();

  return (
    <PulseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title || t('common.confirm_delete_title', 'Delete Confirmation')}
      subtitle={t('common.permanent_action', 'This action cannot be undone')}
      icon={AlertTriangle}
      maxWidth="max-w-md"
      footer={
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] font-black uppercase tracking-widest text-[10px] hover:bg-[var(--bg-elevated)]/80 transition-all"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-6 py-4 rounded-2xl bg-rose-500 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-rose-500/20 hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Trash2 size={14} />
                {t('common.confirm_delete', 'Confirm Delete')}
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center mb-6 border border-rose-500/20">
          <AlertTriangle className="text-rose-500" size={40} />
        </div>
        <p className="text-lg font-bold text-[var(--text-primary)] leading-tight mb-2">
          {description || t('common.delete_warning', 'Are you sure you want to permanently delete this item?')}
        </p>
        {itemName && (
          <div className="mt-2 px-4 py-2 rounded-xl bg-rose-500/5 border border-rose-500/10">
            <span className="text-rose-400 font-black tracking-tight">{itemName}</span>
          </div>
        )}
      </div>
    </PulseModal>
  );
};

export default ConfirmDeleteModal;
