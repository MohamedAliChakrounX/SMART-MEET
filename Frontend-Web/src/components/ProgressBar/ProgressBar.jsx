import React from 'react';
import { Check } from 'lucide-react';
import { useMeeting } from '../../context/MeetingContext';

const ProgressBar = ({ currentStep }) => {
    const { darkMode } = useMeeting();

    const steps = [
        { id: 1, label: 'Upload' },
        { id: 2, label: 'Transcription' },
        { id: 3, label: 'Refine' }
    ];

    return (
        <div className="w-full flex items-center justify-between relative py-1">
            {/* Connecting Line Background */}
            <div className={`absolute top-6 left-0 w-full h-0.5 -translate-y-1/2 -z-10 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>

            {/* Active Progress Line */}
            <div
                className="absolute top-6 left-0 h-0.5 -translate-y-1/2 bg-blue-900 transition-all duration-500 ease-out -z-10 rounded"
                style={{ width: `${((Math.min(currentStep, steps.length) - 1) / (steps.length - 1)) * 100}%` }}
            ></div>

            {steps.map((step) => {
                const isCompleted = step.id < currentStep;
                const isCurrent = step.id === currentStep;
                const ringColor = darkMode ? 'ring-gray-950' : 'ring-white';

                return (
                    <div key={step.id} className="flex flex-col items-center gap-2 relative z-0 group cursor-default">
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ring-4 ${ringColor} ${isCompleted
                                    ? 'bg-blue-900 text-white scale-100'
                                    : isCurrent
                                        ? darkMode
                                            ? 'bg-gray-800 border-2 border-blue-400 text-blue-400 scale-110 shadow-lg shadow-blue-900/30'
                                            : 'bg-white border-2 border-blue-900 text-blue-900 scale-110 shadow-lg shadow-blue-900/20'
                                        : darkMode
                                            ? 'bg-gray-800 text-gray-500 scale-90'
                                            : 'bg-gray-100 text-gray-400 scale-90'
                                }`}
                        >
                            {isCompleted ? <Check size={14} strokeWidth={3} /> : step.id}
                        </div>
                        <span
                            className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 whitespace-nowrap ${isCurrent
                                    ? darkMode ? 'text-blue-400' : 'text-blue-900'
                                    : isCompleted
                                        ? darkMode ? 'text-gray-400' : 'text-gray-500'
                                        : darkMode ? 'text-gray-600' : 'text-gray-300'
                                }`}
                        >
                            {step.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export default ProgressBar;
