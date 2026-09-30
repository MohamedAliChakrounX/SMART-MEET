import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const CollapsibleSection = ({
    id,
    icon: Icon,
    title,
    subtitle,
    children,
    defaultOpen = true,
    headerBadge,
    headerAction
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div id={id} className="bg-white rounded-lg mb-4 border border-gray-200 overflow-hidden scroll-mt-6">
            <div
                className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-gray-50 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3 flex-1">
                    {Icon && <Icon className="text-gray-500" size={20} />}
                    <div className="flex-1">
                        <h3 className="text-base font-semibold text-gray-900 m-0">{title}</h3>
                        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
                    </div>
                    {headerBadge}
                    {headerAction && <div onClick={(e) => e.stopPropagation()}>{headerAction}</div>}
                </div>
                <ChevronDown
                    className={`text-gray-400 transition-transform duration-200 ml-3 ${isOpen ? 'rotate-180' : ''}`}
                    size={20}
                />
            </div>
            {isOpen && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                    {children}
                </div>
            )}
        </div>
    );
};

export default CollapsibleSection;
