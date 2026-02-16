import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * ConfirmModal Component
 * Premium styled confirmation dialog
 */
export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' }) {
    if (!isOpen) return null;

    const typeStyles = {
        danger: {
            icon: 'text-red-400',
            iconBg: 'bg-red-500/20',
            button: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
        },
        warning: {
            icon: 'text-orange-400',
            iconBg: 'bg-orange-500/20',
            button: 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white'
        },
        info: {
            icon: 'text-cyan-400',
            iconBg: 'bg-cyan-500/20',
            button: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white'
        }
    };

    const styles = typeStyles[type] || typeStyles.danger;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Content */}
                <div className="p-6">
                    {/* Icon */}
                    <div className={`w-16 h-16 ${styles.iconBg} rounded-2xl flex items-center justify-center mb-4`}>
                        <AlertTriangle size={32} className={styles.icon} />
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold text-white mb-2">
                        {title}
                    </h3>

                    {/* Message */}
                    <p className="text-slate-300 leading-relaxed mb-6">
                        {message}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onConfirm}
                            className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${styles.button}`}
                        >
                            {confirmText}
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all"
                        >
                            {cancelText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
