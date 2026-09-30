import React from 'react';

const Toggle = ({ checked, onChange, label }) => {
    return (
        <label className="inline-flex items-center gap-2 cursor-pointer">
            <div className="relative">
                <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900"></div>

            </div>
            {label && <span className="text-sm font-medium text-gray-700 select-none">{label}</span>}
        </label>
    );
};

export default Toggle;
