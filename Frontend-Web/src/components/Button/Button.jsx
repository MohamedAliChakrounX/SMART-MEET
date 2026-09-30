import React from 'react';

const Button = ({ children, variant = 'primary', icon: Icon, onClick, className = '', ...props }) => {
    const baseStyles = "inline-flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium cursor-pointer transition-all hover:-translate-y-0.5";

    const variants = {
        primary: "bg-blue-900 text-white border-transparent hover:bg-blue-800",

        secondary: "bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200",
        ghost: "bg-transparent text-gray-500 border-gray-200 hover:bg-gray-50",
        danger: "bg-red-500 text-white border-transparent hover:bg-red-600"
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${className}`}
            onClick={onClick}
            {...props}
        >
            {Icon && <Icon size={18} className="flex-shrink-0" />}
            {children}
        </button>
    );
};

export default Button;
