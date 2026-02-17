import React from 'react';
import { AlertTriangle, X, CheckCircle, Info } from 'lucide-react';

/**
 * ConfirmModal Component
 * Premium styled confirmation dialog
 */
export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' }) {
    if (!isOpen) return null;

    const typeStyles = {
        danger: {
            icon: AlertTriangle,
            iconColor: 'text-red-400',
            iconBg: 'bg-red-500/20',
            button: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-red-500/20'
        },
        warning: {
            icon: AlertTriangle,
            iconColor: 'text-orange-400',
            iconBg: 'bg-orange-500/20',
            button: 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-orange-500/20'
        },
        info: {
            icon: Info,
            iconColor: 'text-cyan-400',
            iconBg: 'bg-cyan-500/20',
            button: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-cyan-500/20'
        },
        success: {
            icon: CheckCircle,
            iconColor: 'text-green-400',
            iconBg: 'bg-green-500/20',
            button: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-green-500/20'
        }
    };

    const styles = typeStyles[type] || typeStyles.danger;
    const Icon = styles.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Content */}
                <div className="p-6 text-center">
                    {/* Icon */}
                    <div className={`w-16 h-16 ${styles.iconBg} rounded-2xl flex items-center justify-center mb-6 mx-auto`}>
                        <Icon size={32} className={styles.iconColor} />
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold text-white mb-3">
                        {title}
                    </h3>

                    {/* Message */}
                    <p className="text-slate-300 leading-relaxed mb-8">
                        {message}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3 justify-center">
                        {cancelText && (
                            <button
                                onClick={onClose}
                                className="flex-1 px-6 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all"
                            >
                                {cancelText}
                            </button>
                        )}
                        <button
                            onClick={onConfirm}
                            className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${styles.button} ${!cancelText ? 'max-w-[200px]' : ''}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
