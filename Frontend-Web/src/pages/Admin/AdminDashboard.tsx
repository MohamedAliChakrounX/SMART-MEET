import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster } from './components/ui/Sonner'
import { AdminProvider } from './hooks/useAdminStore'
import { Sidebar, SectionType } from './components/layout/Sidebar'
import GlobalNavbar from '../../components/Navbar/Navbar'
import { OrganisationSection } from './components/sections/OrganisationSection'
import { UsersSection } from './components/sections/UsersSection'
import { PlaceholderSection } from './components/sections/PlaceholderSection'
import { AdminChatBotSection } from './components/sections/AdminChatBotSection'
import ArchiveLibrary from '../ArchiveLibrary/ArchiveLibrary'
import Upload from '../Upload/Upload'
import { Overview } from '../Overview/Overview'
import Transcription from '../Transcription/Transcription'
import RefineSummary from '../RefineSummary/RefineSummary'
import BehavioralAnalytics from '../BehavioralAnalytics/BehavioralAnalytics'
import { useMeeting } from '../../context/MeetingContext'

export type MeetingView = 'overview' | 'transcription' | 'pv' | 'analytics' | null

function AdminDashboardContent() {
  const [activeSection, setActiveSection] =
    useState<SectionType>('meetings')
  const [activeMeeting, setActiveMeeting] = useState<any | null>(null)
  const [activeMeetingView, setActiveMeetingView] = useState<MeetingView>(null)
  const { setCurrentMeeting, setCurrentMeetingId, darkMode } = useMeeting()

  const handleLogoClick = () => {
    setActiveSection('meetings')
    setActiveMeeting(null)
    setActiveMeetingView(null)
  }

  const handleMeetingSelect = (meeting: any, view: MeetingView = 'overview') => {
    // Sync the MeetingContext so child views (RefineSummary, Transcription, etc.) can resolve the meeting
    setCurrentMeeting(meeting)
    setCurrentMeetingId(String(meeting.id))
    setActiveMeeting(meeting)
    setActiveMeetingView(view)
  }

  const handleNewMeeting = () => {
    setActiveSection('upload')
    setActiveMeeting(null)
    setActiveMeetingView(null)
  }

  const handleUploadNavigate = (target: string, meetingId?: string) => {
    if (target === 'back') {
      setActiveSection('meetings')
    } else if (target === 'transcription') {
      // After upload: show transcription view inside the admin shell
      setActiveMeeting(meetingId ? { id: meetingId } : null)
      setActiveMeetingView('transcription')
    }
  }

  const handleMeetingNavigate = (target: string) => {
    if (target === 'back') {
      setActiveMeeting(null)
      setActiveMeetingView(null)
    } else {
      setActiveMeetingView(target as MeetingView)
    }
  }
  const sectionTitles: Record<SectionType, string> = {
    organisation: '1- Organisation',
    users: '2- Utilisateurs & Permissions',
    meetings: 'Meetings',
    upload: 'Upload',
    chatbot: 'Agent Conversationnel',
  }
  const renderSection = () => {
    if (activeMeeting && activeMeetingView) {
      switch (activeMeetingView) {
        case 'overview':
          return <Overview isEmbedded={true} onNavigate={handleMeetingNavigate} />
        case 'transcription':
          return <Transcription isEmbedded={true} onNavigate={handleMeetingNavigate} />
        case 'pv':
          return <RefineSummary isEmbedded={true} meetingId={activeMeeting?.id} onNavigate={handleMeetingNavigate} />
        case 'analytics':
          return <BehavioralAnalytics isEmbedded={true} onNavigate={handleMeetingNavigate} />
        default:
          return <Overview isEmbedded={true} onNavigate={handleMeetingNavigate} />
      }
    }

    switch (activeSection) {
      case 'organisation':
        return <OrganisationSection />
      case 'users':
        return <UsersSection />
      case 'meetings':
        return <ArchiveLibrary isEmbedded={true} onMeetingSelect={handleMeetingSelect} onNewMeeting={handleNewMeeting} />
      case 'upload':
        return <Upload isEmbedded={true} onNavigate={handleUploadNavigate} />
      case 'chatbot':
        return <AdminChatBotSection onBack={() => setActiveSection('meetings')} />
      default:
        return null
    }
  }
  return (
    <div className={`flex flex-col h-screen w-full font-sans admin-theme transition-colors duration-300 ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-background text-foreground'}`}>
      <GlobalNavbar hideSteps={true} currentStep={0} onLogoClick={handleLogoClick} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeSection={activeSection}
          setActiveSection={(section) => {
            // Reset meeting view when navigating via sidebar
            setActiveMeeting(null)
            setActiveMeetingView(null)
            setActiveSection(section)
          }}
        />
        <main className={`flex-1 overflow-y-auto relative transition-colors duration-300 ${darkMode ? 'bg-gray-950' : 'bg-muted/10'} ${(['meetings', 'upload', 'chatbot'].includes(activeSection) || activeMeetingView) ? 'p-0' : 'p-6 md:p-8'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeSection}-${activeMeetingView ?? 'none'}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <Toaster position="top-right" />
    </div>
  )
}

export default function AdminDashboard() {
  return (
    <AdminProvider>
      <AdminDashboardContent />
    </AdminProvider>
  )
}
