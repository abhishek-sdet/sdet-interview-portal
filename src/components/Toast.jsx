import toast, { Toaster } from 'react-hot-toast';

// Custom toast styles matching the app's glassmorphism design
export const toastStyles = {
    success: {
        style: {
            background: 'rgba(16, 185, 129, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            fontWeight: '500',
        },
        iconTheme: {
            primary: '#10b981',
            secondary: 'rgba(16, 185, 129, 0.1)',
        },
    },
    error: {
        style: {
            background: 'rgba(239, 68, 68, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontWeight: '500',
        },
        iconTheme: {
            primary: '#ef4444',
            secondary: 'rgba(239, 68, 68, 0.1)',
        },
    },
    loading: {
        style: {
            background: 'rgba(59, 130, 246, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#3b82f6',
            fontWeight: '500',
        },
        iconTheme: {
            primary: '#3b82f6',
            secondary: 'rgba(59, 130, 246, 0.1)',
        },
    },
};

// Toast wrapper component
export function ToastProvider({ children }) {
    return (
        <>
            {children}
            <Toaster
                position="top-right"
                reverseOrder={false}
                gutter={8}
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: 'rgba(30, 41, 59, 0.9)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        fontSize: '14px',
                    },
                    success: toastStyles.success,
                    error: toastStyles.error,
                    loading: toastStyles.loading,
                }}
            />
        </>
    );
}

// Helper functions for consistent toast usage
// Helper functions for consistent toast usage
export const showToast = {
    success: (message, options = {}) => toast.success(message, { ...toastStyles.success, ...options }),
    error: (message, options = {}) => toast.error(message, { ...toastStyles.error, ...options }),
    loading: (message, options = {}) => toast.loading(message, { ...toastStyles.loading, ...options }),
    dismiss: (toastId) => toast.dismiss(toastId),
};

export default toast;
