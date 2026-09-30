import React from 'react';

const StatusBadge = ({ status }) => {
    const baseStyles = "inline-flex px-3 py-1 rounded-xl text-xs font-medium";

    const variants = {
        pending: "bg-amber-100 text-amber-800",
        open: "bg-emerald-100 text-emerald-800",
        closed: "bg-gray-100 text-gray-800",
        completed: "bg-blue-100 text-blue-800"
    };

    return (
        <span className={`${baseStyles} ${variants[status.toLowerCase()] || variants.pending}`}>
            {status}
        </span>
    );
};

export default StatusBadge;
