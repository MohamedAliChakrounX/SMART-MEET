import React from 'react';
import { useMeeting } from '../../context/MeetingContext';

const Badge = ({ children, variant = 'default', className = '' }) => {
    const { darkMode } = useMeeting();
    const baseStyles = "inline-flex items-center px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider";

    const variants = {
        default: darkMode
            ? "bg-blue-900/30 text-blue-400"
            : "bg-blue-50 text-blue-800",
        aiGenerated: darkMode
            ? "bg-blue-900/30 text-blue-400"
            : "bg-blue-100 text-blue-900",

        confidential: darkMode
            ? "bg-red-900/30 text-red-400"
            : "bg-red-50 text-red-800",
        productdev: darkMode
            ? "bg-blue-900/30 text-blue-400"
            : "bg-blue-100 text-blue-800",
        sales: darkMode
            ? "bg-emerald-900/30 text-emerald-400"
            : "bg-emerald-100 text-emerald-800",
        strategy: darkMode
            ? "bg-amber-900/30 text-amber-400"
            : "bg-amber-100 text-amber-800",
        marketing: darkMode
            ? "bg-pink-900/30 text-pink-400"
            : "bg-pink-100 text-pink-800",
        hr: darkMode
            ? "bg-purple-900/30 text-purple-400"
            : "bg-purple-100 text-purple-800"
    };

    return (
        <span className={`${baseStyles} ${variants[variant] || variants.default} ${className}`}>
            {children}
        </span>
    );
};

export default Badge;
