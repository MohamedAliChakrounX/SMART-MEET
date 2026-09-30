import React from 'react';
import { AlertCircle } from 'lucide-react';

const ErrorState = ({ title = 'Error', message, onRetry, className = '' }) => {
    return (
        <div className={`flex flex-col items-center justify-center p-8 text-center rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 ${className}`}>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
                <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">{title}</h3>
            <p className="text-red-600 dark:text-red-400 max-w-md mb-6">{message || "Something went wrong. Please try again."}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                    Try Again
                </button>
            )}
        </div>
    );
};

export default ErrorState;
