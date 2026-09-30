import { FileText, Table, Hash, FileOutput } from 'lucide-react';

const ExportSidebar = ({ darkMode }) => {
    const exportOptions = [
        { id: 'pdf', label: 'PDF', icon: FileText, color: 'text-red-500', bgColor: 'bg-red-50' },
        { id: 'doc', label: 'DOC', icon: FileOutput, color: 'text-blue-500', bgColor: 'bg-blue-50' },
        { id: 'csv', label: 'CSV', icon: Hash, color: 'text-orange-500', bgColor: 'bg-orange-50' },
        { id: 'excel', label: 'EXCEL', icon: Table, color: 'text-green-500', bgColor: 'bg-green-50' },
    ];

    return (
        <div className={`fixed right-8 top-1/2 -translate-y-1/2 flex flex-col gap-4 p-4 rounded-3xl border backdrop-blur-xl shadow-2xl z-40 transition-all duration-500 ${darkMode
            ? 'bg-gray-900/90 border-gray-700 shadow-blue-900/10'
            : 'bg-white/90 border-gray-100 shadow-gray-200/50'
            }`}>
            <div className="flex flex-col items-center gap-1 mb-2">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Export
                    </span>
                </div>
                <div className={`h-[1px] w-full ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}></div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {exportOptions.map((option) => (
                    <button
                        key={option.id}
                        className={`group relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${darkMode
                            ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                            : 'hover:bg-gray-50 text-gray-500 hover:text-gray-900 border border-transparent hover:border-gray-100 shadow-sm'
                            }`}
                        title={`Exporter en ${option.label}`}
                    >
                        <option.icon size={22} className={`transition-colors duration-300 group-hover:${option.color}`} />
                        <span className="text-[8px] font-bold mt-1 opacity-60 group-hover:opacity-100 uppercase tracking-tighter">{option.id}</span>

                        {/* Tooltip */}
                        <span className={`absolute right-full mr-5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 pointer-events-none whitespace-nowrap shadow-xl border ${darkMode
                            ? 'bg-gray-950 text-white border-gray-800'
                            : 'bg-white text-gray-900 border-gray-100'
                            }`}>
                            {option.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ExportSidebar;
