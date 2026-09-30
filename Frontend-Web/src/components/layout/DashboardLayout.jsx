import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
    LayoutDashboard,
    FileText,
    BarChart2,
    Mic,
    Settings,
    User,
    Search,
    Bell,
    MessageSquare,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'
import { useMeeting } from '../../context/MeetingContext'

export function DashboardLayout({ children }) {
    const location = useLocation()
    const { sidebarWidth, navbarHeight } = useMeeting()

    const navigation = [
        {
            name: 'Dashboard',
            href: '/',
            icon: LayoutDashboard,
        },
        {
            name: 'Meeting Minutes',
            href: '/summary', // Routing correction based on current app
            icon: FileText,
        },
        {
            name: 'Analytics',
            href: '/analytics',
            icon: BarChart2,
        },
        {
            name: 'Transcription',
            href: '/transcription',
            icon: Mic,
        },
        {
            name: 'ChatBot IA',
            href: '/chatbot',
            icon: MessageSquare,
        },
    ]

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex transition-colors duration-300">
            {/* Sidebar */}
            <aside
                style={{ width: `${sidebarWidth}px` }}
                className="bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 fixed h-full z-10 hidden md:flex flex-col"
            >

                <div
                    style={{ height: `${navbarHeight}px` }}
                    className="flex items-center px-6 border-b border-gray-100 dark:border-gray-800"
                >

                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg">S</span>
                        </div>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">SFM</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                        : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white',
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        'h-5 w-5',
                                        isActive ? 'text-blue-900 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500',
                                    )}
                                />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate dark:text-white">
                                Jane Doe
                            </p>
                            <p className="text-xs text-gray-500 truncate dark:text-gray-400">COO</p>
                        </div>
                        <Settings className="h-4 w-4 text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-white" />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div
                style={{ marginLeft: `${sidebarWidth}px` }}
                className="flex-1 flex flex-col min-h-screen"
            >

                {/* Header */}
                <header
                    style={{ height: `${navbarHeight}px` }}
                    className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 px-4 sm:px-6 lg:px-8 flex items-center justify-between"
                >

                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative max-w-md w-full hidden sm:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Rechercher des réunions, transcriptions..."
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent dark:text-white"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="relative">
                            <Bell className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
                        </Button>
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-medium text-sm">
                            JD
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}
