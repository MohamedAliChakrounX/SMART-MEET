import React from 'react'
import { motion } from 'framer-motion'
import { Building2, Users, Video, Upload, MessageSquare } from 'lucide-react'
import { useMeeting } from '../../../../context/MeetingContext'
import { useI18n } from '../../../../i18n/useI18n'

export type SectionType = 'organisation' | 'users' | 'meetings' | 'upload' | 'chatbot'

interface SidebarProps {
  activeSection: SectionType
  setActiveSection: (section: SectionType) => void
}

export function Sidebar({ activeSection, setActiveSection }: SidebarProps) {
  const { darkMode } = useMeeting()
  const { t } = useI18n()

  const navItems = [
    {
      id: 'meetings',
      label: t('sidebar.meetings'),
      icon: Video,
    },
    {
      id: 'upload',
      label: t('sidebar.upload'),
      icon: Upload,
    },
    {
      id: 'organisation',
      label: t('sidebar.organisation'),
      icon: Building2,
    },
    {
      id: 'users',
      label: t('sidebar.users'),
      icon: Users,
    },
    {
      id: 'chatbot',
      label: t('sidebar.chatbot') || 'Agent Conversationnel',
      icon: MessageSquare,
    },
  ] as const

  return (
    <aside className={`w-16 border-r shadow-[2px_0_8px_-3px_rgba(0,0,0,0.05)] h-full flex flex-col shrink-0 z-20 transition-colors duration-300 ${
      darkMode
        ? 'bg-gray-900 border-gray-800'
        : 'bg-white border-slate-200'
    }`}>
      <nav className="flex-1 py-10 flex flex-col items-center gap-5 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              title={item.label}
              className={`relative flex items-center justify-center rounded-xl transition-all duration-300 w-10 h-10 group ${
                isActive
                  ? darkMode
                    ? 'bg-blue-500/15 text-blue-400 shadow-sm border border-blue-500/30'
                    : 'bg-blue-600/10 text-blue-700 shadow-sm border border-blue-200/50'
                  : darkMode
                    ? 'text-gray-500 hover:bg-gray-800 hover:text-gray-200 border border-transparent'
                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
              }`}
            >
              <Icon
                strokeWidth={isActive ? 2 : 1.5}
                className={`w-[18px] h-[18px] transition-transform duration-300 ${
                  isActive ? 'scale-105' : 'group-hover:scale-110'
                }`}
              />
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className={`absolute -left-[14px] w-1 h-6 rounded-full ${
                    darkMode ? 'bg-blue-400' : 'bg-blue-600'
                  }`}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 30,
                  }}
                />
              )}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
