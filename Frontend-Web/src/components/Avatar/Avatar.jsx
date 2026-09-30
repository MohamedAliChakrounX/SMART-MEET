import React from 'react';

const Avatar = ({ name, initials, color, size = 'medium' }) => {
    const baseStyles = "inline-flex items-center justify-center rounded-full text-white font-semibold flex-shrink-0";

    const sizes = {
        small: "w-6 h-6 text-[10px]",
        medium: "w-8 h-8 text-xs",
        large: "w-10 h-10 text-sm"
    };

    return (
        <div
            className={`${baseStyles} ${sizes[size]}`}
            style={{ backgroundColor: color || '#3B82F6' }}
            title={name}
        >
            {initials}
        </div>
    );
};

export default Avatar;
