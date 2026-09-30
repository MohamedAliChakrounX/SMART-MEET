import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  MessageSquare,
  Plus,
  Trash2,
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Mic,
  Volume2,
  FileText,
  AlertCircle,
  HelpCircle,
  Filter,
  Calendar,
  Search,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMeeting } from '../../../../context/MeetingContext'
import { useI18n } from '../../../../i18n/useI18n'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import DashboardRenderer from '../../../../components/ChatBot/DashboardRenderer'
import {
  sendMessage,
  getHistory,
  getConversation,
  deleteConversation,
  sendAudio,
  getTTS,
  getChatMeetings,
} from '../../../../services/chatbotService'

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch (e) {
    return dateStr
  }
}

function parseInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return []

  const parts: React.ReactNode[] = []
  let remaining = text
  const regex = /(\*\*.*?\*\*|`.*?`)/

  while (remaining) {
    const match = remaining.match(regex)
    if (!match) {
      parts.push(remaining)
      break
    }

    const matchIndex = match.index ?? 0
    const matchText = match[0]

    if (matchIndex > 0) {
      parts.push(remaining.substring(0, matchIndex))
    }

    if (matchText.startsWith('**') && matchText.endsWith('**')) {
      const boldText = matchText.slice(2, -2)
      parts.push(<strong key={remaining.length} className="font-bold">{boldText}</strong>)
    } else if (matchText.startsWith('`') && matchText.endsWith('`')) {
      const codeText = matchText.slice(1, -1)
      parts.push(
        <code key={remaining.length} className="px-1.5 py-0.5 rounded bg-white/10 dark:bg-white/10 text-blue-600 dark:text-blue-300 font-mono text-[11px] border border-white/5">
          {codeText}
        </code>
      )
    } else {
      parts.push(matchText)
    }

    remaining = remaining.substring(matchIndex + matchText.length)
  }

  return parts
}

function renderMarkdown(text: string): React.ReactNode[] {
  if (!text) return []

  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null

  const flushList = (key: string) => {
    if (currentList) {
      const Tag = currentList.type
      elements.push(
        <Tag key={key} className={currentList.type === 'ul' ? "list-disc pl-5 my-2 space-y-1.5" : "list-decimal pl-5 my-2 space-y-1.5"}>
          {currentList.items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {parseInlineMarkdown(item)}
            </li>
          ))}
        </Tag>
      )
      currentList = null
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Markdown Table
    if (trimmed.startsWith('|')) {
      flushList(`list-${i}`)
      let j = i
      const tableLines: string[] = []
      while (j < lines.length && lines[j].trim().startsWith('|')) {
        tableLines.push(lines[j])
        j++
      }
      if (tableLines.length >= 2) {
        const splitRow = (rowText: string): string[] => {
          let cleaned = rowText.trim()
          if (cleaned.startsWith('|')) cleaned = cleaned.slice(1)
          if (cleaned.endsWith('|')) cleaned = cleaned.slice(0, -1)
          return cleaned.split('|').map(s => s.trim())
        }
        const headers = splitRow(tableLines[0])
        const separators = splitRow(tableLines[1])
        const isSeparator = separators.length > 0 && separators.every(col => /^:?-+:?$/.test(col))
        if (isSeparator) {
          const rows = tableLines.slice(2).map((rLine: string) => {
            const cells = splitRow(rLine)
            return headers.map((_, colIdx) => cells[colIdx] || '')
          })

          elements.push(
            <div key={`table-wrapper-${i}`} className="overflow-x-auto my-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-50/80 dark:bg-slate-950/40 backdrop-blur-sm">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs text-left">
                <thead className="bg-slate-100/90 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 font-semibold uppercase tracking-wider">
                  <tr>
                    {headers.map((h, hIdx) => (
                      <th key={hIdx} className="px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800/60 text-[10px] tracking-wider uppercase">
                        {parseInlineMarkdown(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50 text-slate-800 dark:text-slate-200">
                  {rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-100/60 dark:hover:bg-slate-900/30 transition-colors odd:bg-slate-50/40 dark:odd:bg-transparent">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                          {parseInlineMarkdown(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
          i = j - 1
          continue
        }
      }
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      flushList(`list-${i}`)
      elements.push(
        <h4 key={`h4-${i}`} className="text-sm font-bold mt-3 mb-1.5">
          {parseInlineMarkdown(trimmed.slice(4))}
        </h4>
      )
    } else if (trimmed.startsWith('## ')) {
      flushList(`list-${i}`)
      elements.push(
        <h3 key={`h3-${i}`} className="text-base font-bold mt-4 mb-2">
          {parseInlineMarkdown(trimmed.slice(3))}
        </h3>
      )
    } else if (trimmed.startsWith('# ')) {
      flushList(`list-${i}`)
      elements.push(
        <h2 key={`h1-${i}`} className="text-lg font-bold mt-4 mb-2">
          {parseInlineMarkdown(trimmed.slice(2))}
        </h2>
      )
    }
    // Unordered List Items
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.slice(2)
      if (currentList && currentList.type === 'ul') {
        currentList.items.push(content)
      } else {
        flushList(`list-${i}`)
        currentList = { type: 'ul', items: [content] }
      }
    }
    // Ordered List Items
    else if (/^\d+\.\s+/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s+/)
      const content = trimmed.slice(match ? match[0].length : 3)
      if (currentList && currentList.type === 'ol') {
        currentList.items.push(content)
      } else {
        flushList(`list-${i}`)
        currentList = { type: 'ol', items: [content] }
      }
    }
    // Empty line
    else if (!trimmed) {
      if (!currentList) {
        elements.push(<div key={`spacer-${i}`} className="h-2" />)
      }
    }
    // Standard paragraph
    else {
      flushList(`list-${i}`)
      elements.push(
        <p key={`p-${i}`} className="mb-1.5 last:mb-0 leading-relaxed">
          {parseInlineMarkdown(line)}
        </p>
      )
    }
  }

  flushList(`list-end`)
  return elements;
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  metadata?: {
    sources?: Array<{ meeting_title?: string; meeting_id?: string }>
    dashboard_config?: any
  }
  audio_b64?: string | null
}

interface ConversationItem {
  id: string
  title: string
  updated_at?: string
}

export function AdminChatBotSection({ onBack }: { onBack?: () => void }) {
  const { darkMode } = useMeeting()
  const { t } = useI18n()

  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  
  // Voice Recording State
  const [recording, setRecording] = useState(false)
  const [sttProcessing, setSttProcessing] = useState(false)
  
  // TTS Playing State
  const [playingId, setPlayingId] = useState<number | null>(null)

  // Meeting Selection State
  const [meetings, setMeetings] = useState<any[]>([])
  const [selectedMeetingIds, setSelectedMeetingIds] = useState<string[]>([])
  const [meetingSearch, setMeetingSearch] = useState('')
  const [meetingsExpanded, setMeetingsExpanded] = useState(true)

  // Date and Organizational Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedTeam, setSelectedTeam] = useState('')
  const [selectedProj, setSelectedProj] = useState('')

  // Extract unique filter options dynamically from meetings
  const uniqueDepts = React.useMemo(() => {
    const depts = new Set<string>()
    meetings.forEach((m: any) => {
      m.departments?.forEach((d: any) => {
        if (d?.name) depts.add(d.name)
      })
    })
    return Array.from(depts).sort()
  }, [meetings])

  const uniqueTeams = React.useMemo(() => {
    const teams = new Set<string>()
    meetings.forEach((m: any) => {
      m.teams?.forEach((t: any) => {
        if (t?.name) {
          if (selectedDept && t.department_name !== selectedDept) return
          teams.add(t.name)
        }
      })
    })
    return Array.from(teams).sort()
  }, [meetings, selectedDept])

  const uniqueProjects = React.useMemo(() => {
    const projs = new Set<string>()
    meetings.forEach((m: any) => {
      if (m.project?.name) {
        if (selectedDept && !m.departments?.some((d: any) => d.name === selectedDept)) return
        if (selectedTeam && !m.teams?.some((t: any) => t.name === selectedTeam)) return
        projs.add(m.project.name)
      }
    })
    return Array.from(projs).sort()
  }, [meetings, selectedDept, selectedTeam])

  // Combined Filtering Logic
  const filteredMeetings = React.useMemo(() => {
    return meetings.filter((m: any) => {
      // 1. Text Search
      const matchesSearch = !meetingSearch || 
        m.title?.toLowerCase().includes(meetingSearch.toLowerCase()) || 
        m.description?.toLowerCase().includes(meetingSearch.toLowerCase())
      
      // 2. Date filters
      let matchesDate = true
      if (m.start_at) {
        const meetingDate = new Date(m.start_at).toISOString().split('T')[0]
        if (startDate && meetingDate < startDate) matchesDate = false
        if (endDate && meetingDate > endDate) matchesDate = false
      } else if (startDate || endDate) {
        matchesDate = false
      }

      // 3. Department filter
      let matchesDept = true
      if (selectedDept) {
        matchesDept = m.departments?.some((d: any) => d.name === selectedDept) || false
      }

      // 4. Team filter
      let matchesTeam = true
      if (selectedTeam) {
        matchesTeam = m.teams?.some((t: any) => t.name === selectedTeam) || false
      }

      // 5. Project filter
      let matchesProj = true
      if (selectedProj) {
        matchesProj = m.project?.name === selectedProj
      }

      return matchesSearch && matchesDate && matchesDept && matchesTeam && matchesProj
    })
  }, [meetings, meetingSearch, startDate, endDate, selectedDept, selectedTeam, selectedProj])

  const hasActiveFilters = !!(meetingSearch || startDate || endDate || selectedDept || selectedTeam || selectedProj)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null)

  // ── Load Conversation History on Mount ───────────────────────────────
  const fetchHistory = useCallback(async () => {
    try {
      const rawHistory = await getHistory()
      if (Array.isArray(rawHistory)) {
        const mapped = rawHistory.map((c: any) => ({
          id: c.conversation_id || c.session_id,
          title: c.last_message ? (c.last_message.length > 50 ? c.last_message.slice(0, 50) + '...' : c.last_message) : 'Sans titre',
          updated_at: c.last_activity,
        }))
        setConversations(mapped)
      }
    } catch (err) {
      console.error('[AdminChatBot] Error loading history:', err)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // ── Load Allowed Meetings on Mount ───────────────────────────────────
  useEffect(() => {
    getChatMeetings()
      .then((data) => {
        setMeetings(data)
        setSelectedMeetingIds(data.map((m: any) => m.id)) // Select all by default
      })
      .catch((err) => console.error('[AdminChatBot] Error loading meetings:', err))
  }, [])

  // ── Scroll to bottom on new message ─────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Load specific conversation ──────────────────────────────────────────
  const loadConversationDetails = async (convId: string) => {
    setActiveConvId(convId)
    setMessages([])
    setLoading(true)
    try {
      const details = await getConversation(convId)
      if (details && Array.isArray(details.messages)) {
        const mappedMsgs: Message[] = details.messages.map((m: any) => {
          let meta = {}
          try {
            meta = typeof m.metadata === 'string' ? JSON.parse(m.metadata) : (m.metadata || {})
          } catch (e) {
            meta = {}
          }
          return {
            role: m.role,
            content: m.content,
            metadata: meta,
            audio_b64: m.audio_b64,
          }
        })
        setMessages(mappedMsgs)
      } else if (Array.isArray(details)) {
        // Fallback for direct array response
        const mappedMsgs: Message[] = details.map((m: any) => {
          let meta = {}
          try {
            meta = typeof m.metadata === 'string' ? JSON.parse(m.metadata) : (m.metadata || {})
          } catch (e) {
            meta = {}
          }
          return {
            role: m.role,
            content: m.content,
            metadata: meta,
            audio_b64: m.audio_b64,
          }
        })
        setMessages(mappedMsgs)
      }
    } catch (err) {
      console.error('[AdminChatBot] Error loading conversation details:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Start New Conversation ──────────────────────────────────────────────
  const handleNewConversation = () => {
    setActiveConvId(null)
    setMessages([])
    setInput('')
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.pause()
      setPlayingId(null)
    }
  }

  // ── Delete Conversation ─────────────────────────────────────────────────
  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Voulez-vous supprimer cette conversation ?')) return

    try {
      await deleteConversation(convId)
      setConversations((prev) => prev.filter((c) => c.id !== convId))
      if (activeConvId === convId) {
        handleNewConversation()
      }
    } catch (err) {
      console.error('[AdminChatBot] Error deleting conversation:', err)
    }
  }

  // ── Send Message ────────────────────────────────────────────────────────
  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || input).trim()
    if (!messageContent || loading) return

    setInput('')
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.pause()
      setPlayingId(null)
    }

    // Optimistically add user bubble
    const userMsg: Message = { role: 'user', content: messageContent }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const response = await sendMessage(messageContent, activeConvId, selectedMeetingIds)
      
      const assistantMsg: Message = {
        role: 'assistant',
        content: response.response_text || response.response || '',
        metadata: {
          sources: response.sources || [],
          dashboard_config: response.dashboard_spec || response.dashboard_config || null,
        },
        audio_b64: response.audio_b64 || null,
      }

      setMessages((prev) => [...prev, assistantMsg])

      // If this was a new conversation, set active ID and refresh history list
      if (!activeConvId && response.conversation_id) {
        setActiveConvId(response.conversation_id)
      }
      fetchHistory()
    } catch (err: any) {
      console.error('[AdminChatBot] Send error:', err)
      const errorMsg: Message = {
        role: 'assistant',
        content: `Désolé, une erreur est survenue lors du traitement de votre demande : ${err.message || err}`,
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // ── Voice Speech-To-Text (Whisper) ──────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      let options: any = {}
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options = { mimeType: 'audio/webm;codecs=opus' }
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          options = { mimeType: 'audio/webm' }
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          options = { mimeType: 'audio/ogg;codecs=opus' }
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options = { mimeType: 'audio/mp4' }
        }
      }

      const recorder = new MediaRecorder(stream, options)
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        const mimeType = recorder.mimeType || 'audio/webm'
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        setSttProcessing(true)

        try {
          const result = await sendAudio(audioBlob)
          if (result && result.text && result.text.trim()) {
            setInput(result.text.trim())
          }
        } catch (err) {
          console.error('[AdminChatBot] STT Transcription failed:', err)
        } finally {
          setSttProcessing(false)
        }
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
    } catch (err) {
      console.error('[AdminChatBot] Microphone access denied or recording config error:', err)
      alert('Impossible d\'accéder au microphone. Veuillez vérifier vos permissions de navigateur.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  const handleMicClick = () => {
    if (recording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  // ── Text-To-Speech playback ─────────────────────────────────────────────
  const handlePlayTTS = async (message: Message, index: number) => {
    if (playingId === index && audioPlaybackRef.current) {
      audioPlaybackRef.current.pause()
      setPlayingId(null)
      return
    }

    try {
      let audioUrl = ''
      if (message.audio_b64) {
        // Use existing pre-synthesized audio if present
        const binaryString = window.atob(message.audio_b64)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: 'audio/wav' })
        audioUrl = URL.createObjectURL(blob)
      } else {
        const blob = await getTTS(message.content)
        audioUrl = URL.createObjectURL(blob)
      }

      if (audioUrl) {
        const audio = new Audio(audioUrl)
        audioPlaybackRef.current = audio
        setPlayingId(index)

        audio.onended = () => {
          setPlayingId(null)
          URL.revokeObjectURL(audioUrl)
        }

        await audio.play()
      }
    } catch (err) {
      console.error('[AdminChatBot] Play TTS failed:', err)
      setPlayingId(null)
    }
  }

  return (
    <div className={`flex w-full h-[calc(100vh-115px)] overflow-hidden rounded-2xl border ${
      darkMode ? 'bg-gray-950 text-gray-100 border-gray-800' : 'bg-slate-50 text-slate-800 border-slate-200'
    }`}>
      {/* ── Sub Sidebar for Conversations History ───────────────────────── */}
      <aside className={`
        flex flex-col border-r shrink-0 transition-all duration-300 relative h-full
        ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'}
        ${sidebarOpen ? 'w-72' : 'w-0 overflow-hidden border-r-0'}
      `}>
        {/* Sidebar Header */}
        <div className={`flex items-center justify-between p-4 border-b shrink-0 ${
          darkMode ? 'border-gray-800' : 'border-slate-100'
        }`}>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare size={16} className="text-blue-500" />
            Conversations
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewConversation}
            className="flex items-center gap-1 h-8 text-xs font-semibold px-2 border-blue-500/30 text-blue-600 dark:text-blue-400"
            title="Nouvelle conversation"
          >
            <Plus size={14} />
            Nouveau
          </Button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {conversations.map((conv) => {
            const isActive = activeConvId === conv.id
            return (
              <div
                key={conv.id}
                onClick={() => loadConversationDetails(conv.id)}
                className={`
                  group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer
                  transition-all text-xs truncate font-medium border
                  ${isActive
                    ? darkMode
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-lg shadow-blue-500/5'
                      : 'bg-blue-600/10 text-blue-700 border-blue-200/50 shadow-sm'
                    : darkMode
                      ? 'text-gray-400 hover:bg-white/5 hover:text-gray-250 border-transparent bg-transparent'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 border-transparent bg-transparent'}
                `}
              >
                <MessageSquare size={14} className="flex-shrink-0 opacity-60" />
                <span className="flex-1 truncate">{conv.title}</span>
                <button
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/15
                             text-gray-400 hover:text-red-500 transition-all ml-auto flex-shrink-0"
                  title="Supprimer la conversation"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}
          {conversations.length === 0 && (
            <div className="text-center py-12 px-4 opacity-50">
              <MessageSquare size={24} className="text-slate-400 mb-2 mx-auto" />
              <p className="text-xs text-slate-450 dark:text-gray-500">
                Aucun historique disponible.
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Chat Area ──────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Toggle Sidebar Button & Header */}
        <header className={`flex items-center gap-3 px-4 py-3.5 border-b shadow-sm ${
          darkMode ? 'bg-gray-900/60 border-gray-800/80' : 'bg-white border-slate-200'
        }`}>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className={`p-1.5 rounded-lg border transition-all ${
              darkMode 
                ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-750' 
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
            }`}
            title={sidebarOpen ? 'Masquer l\'historique' : 'Afficher l\'historique'}
          >
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600
                            flex items-center justify-center text-white">
              <Bot size={18} />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">Assistant Réunions IA</h1>
              <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1">
                Base de connaissances RAG &amp; Renseignements Statistiques
              </p>
            </div>
          </div>

          {/* Right Panel Toggle Button */}
          <button
            onClick={() => setRightPanelOpen(v => !v)}
            className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-205 ${
              rightPanelOpen
                ? darkMode
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 shadow-lg shadow-blue-500/5'
                  : 'bg-blue-50/85 border-blue-200 text-blue-700 hover:bg-blue-100 shadow-sm'
                : darkMode
                  ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-750'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Filter size={13} className={rightPanelOpen ? (darkMode ? "text-blue-450" : "text-blue-600") : (darkMode ? "text-gray-500" : "text-slate-400")} />
            <span>Filtres Réunions</span>
            <span className={`px-1.5 py-0.2 text-[9px] rounded-md font-bold transition-all ${
              selectedMeetingIds.length > 0
                ? 'bg-blue-600 text-white'
                : darkMode ? 'bg-gray-700 text-gray-400' : 'bg-slate-200 text-slate-600'
            }`}>
              {selectedMeetingIds.length}
            </span>
          </button>
        </header>

        {/* Floating back button — top-left corner */}
        {onBack && (
          <button
            onClick={onBack}
            className={`absolute top-16 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border backdrop-blur-md transition-all duration-300 transform active:scale-95 group shadow-lg ${
              darkMode
                ? 'bg-gray-800/90 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700/90 hover:border-gray-600 shadow-black/20'
                : 'bg-white/90 border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-white hover:border-slate-300 shadow-slate-200/40'
            }`}
            title="Retour à la page précédente"
          >
            <ChevronLeft size={14} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
            <span>Retour</span>
          </button>
        )}

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-5 max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10
                              flex items-center justify-center">
                <Sparkles size={28} className="text-blue-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-gray-200">
                  Assistant Réunions IA
                </h2>
                <p className="text-sm text-slate-500 dark:text-gray-400 mt-2">
                  Posez des questions sur vos réunions passées, demandez des statistiques consolidées
                  ou générez des widgets analytiques à la volée.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full mt-4">
                {[
                  'Combien de réunions ont eu lieu ce mois-ci ?',
                  'Quelles sont les décisions importantes de la semaine dernière ?',
                  'Graphique des réunions par projet',
                  'Résumé de la dernière réunion RH',
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(suggestion)
                      handleSendMessage(suggestion)
                    }}
                    className={`
                      text-left text-xs p-3 rounded-xl border transition-all duration-200 flex items-start gap-2
                      ${darkMode
                        ? 'bg-gray-900 border-gray-800 text-gray-300 hover:bg-gray-800 hover:border-gray-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'}
                    `}
                  >
                    <HelpCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
                    <span>{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            const isUser = msg.role === 'user'
            const sources = msg.metadata?.sources || []
            const dashboardConfig = msg.metadata?.dashboard_config

            return (
              <div key={i} className="space-y-4">
                <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} group`}>
                  {/* Avatar */}
                  <div className={`
                    flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm
                    ${isUser
                      ? 'bg-blue-500 text-white'
                      : darkMode ? 'bg-gray-800 text-blue-400 border border-gray-700' : 'bg-white text-blue-600 border border-slate-200'}
                  `}>
                    {isUser ? <User size={15} /> : <Bot size={15} />}
                  </div>

                  {/* Message bubble */}
                  <div className="max-w-[75%] flex flex-col gap-1.5">
                    <div className={`
                      px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm
                      ${isUser
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : darkMode
                          ? 'bg-gray-900 border border-gray-800 text-gray-200 rounded-tl-none'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}
                    `}>
                      {renderMarkdown(msg.content)}
                    </div>

                    {/* Sources reference if bot */}
                    {!isUser && sources.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sources.map((src, srcIdx) => (
                          <span
                            key={srcIdx}
                            className={`
                              inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border
                              ${darkMode
                                ? 'bg-gray-900 border-gray-800 text-gray-400'
                                : 'bg-slate-100 border-slate-200 text-slate-600'}
                            `}
                          >
                            <FileText size={10} className="text-blue-500" />
                            {src.meeting_title || 'Meeting Reference'}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Play TTS button if bot */}
                    {!isUser && msg.content && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 self-start">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePlayTTS(msg, i)}
                          className={`h-7 w-7 rounded-md ${
                            playingId === i
                              ? 'bg-blue-500/10 text-blue-500'
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-gray-200'
                          }`}
                          title={playingId === i ? 'Arrêter la lecture' : 'Écouter la réponse'}
                        >
                          {playingId === i ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Volume2 size={12} />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dashboard Widget below message if available */}
                {!isUser && dashboardConfig && (
                  <div className={`ml-11 max-w-4xl transition-all duration-300`}>
                    <DashboardRenderer config={dashboardConfig} />
                  </div>
                )}
              </div>
            )
          })}

          {/* Assistant is thinking indicator */}
          {loading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
            <div className="flex gap-3">
              <div className={`
                flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm
                ${darkMode ? 'bg-gray-900 text-blue-400 border border-gray-800' : 'bg-white text-blue-600 border border-slate-200'}
              `}>
                <Bot size={15} />
              </div>
              <div className={`
                px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2 text-xs font-semibold
                ${darkMode ? 'bg-gray-900 border border-gray-800 text-blue-400' : 'bg-white border border-slate-200 text-blue-600'}
              `}>
                <Loader2 size={14} className="animate-spin text-blue-500" />
                <span>Réflexion en cours…</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>


        {/* Input panel */}
        <div className={`p-4 border-t ${
          darkMode ? 'bg-gray-900/60 border-gray-800/80' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            {/* Mic button for voice recording (STT) */}
            <button
              type="button"
              onClick={handleMicClick}
              disabled={loading || sttProcessing}
              title={recording ? 'Arrêter l\'enregistrement' : 'Poser votre question vocalement'}
              className={`
                relative p-3 rounded-xl transition-all duration-200 border shrink-0
                ${recording
                  ? 'bg-red-500/10 text-red-500 border-red-500/35 ring-2 ring-red-500/20 animate-pulse'
                  : darkMode
                    ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-750'
                    : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-200'}
                ${(loading || sttProcessing) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {sttProcessing ? (
                <Loader2 size={18} className="animate-spin text-blue-500" />
              ) : (
                <Mic size={18} />
              )}
              {recording && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              )}
            </button>

            {/* Input field */}
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question sur les réunions ou demandez un rapport statistique..."
                rows={1}
                disabled={loading || sttProcessing}
                className={`
                  w-full border rounded-xl px-4 py-3 text-xs leading-5 resize-none transition-all
                  focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-blue-500/40
                  ${darkMode
                    ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500'
                    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'}
                  disabled:opacity-50
                `}
                style={{ minHeight: 44, maxHeight: 120 }}
              />
            </div>

            {/* Send button */}
            <button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || loading || sttProcessing}
              className={`
                p-3 rounded-xl transition-all duration-200 shrink-0
                ${input.trim() && !loading && !sttProcessing
                  ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-500/10'
                  : darkMode
                    ? 'bg-gray-800 border border-gray-700 text-gray-600 cursor-not-allowed'
                    : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'}
              `}
              title="Envoyer le message"
            >
              {loading && messages.length > 0 && messages[messages.length - 1].role === 'user' ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </div>
      </main>

      {/* ── Right Sidebar (Meeting Selection & Filters) ────────────────────── */}
      <aside
        className={`
          flex flex-col border-l transition-all duration-300 shrink-0 h-full
          ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'}
          ${rightPanelOpen ? 'w-80' : 'w-0 overflow-hidden border-l-0'}
        `}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b shrink-0 ${
          darkMode ? 'border-gray-800' : 'border-slate-100'
        }`}>
          <h2 className={`text-sm font-semibold flex items-center gap-2 ${darkMode ? 'text-gray-200' : 'text-slate-800'}`}>
            <Filter size={16} className="text-blue-500 animate-pulse" />
            Sélection Réunions
          </h2>
          {hasActiveFilters && (
            <button
              onClick={() => {
                setMeetingSearch('')
                setStartDate('')
                setEndDate('')
                setSelectedDept('')
                setSelectedTeam('')
                setSelectedProj('')
              }}
              className="text-[10px] text-blue-500 hover:text-blue-400 font-semibold transition-all"
            >
              Effacer
            </button>
          )}
        </div>

        {/* Content Container */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto custom-scrollbar">
          {/* Keyword Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-3 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher une réunion..."
              value={meetingSearch}
              onChange={(e) => setMeetingSearch(e.target.value)}
              className={`w-full border rounded-xl pl-9 pr-4 py-2.5 text-xs transition-all outline-none focus:ring-1 focus:ring-blue-500/50 ${
                darkMode
                  ? 'bg-gray-950 border-gray-800 text-gray-200 placeholder-gray-600'
                  : 'bg-slate-100 border-slate-200 text-slate-800 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Date range picker */}
          <div className={`grid grid-cols-2 gap-2 p-2.5 rounded-xl border shrink-0 ${
            darkMode ? 'bg-gray-950/40 border-gray-800/80' : 'bg-slate-50/50 border-slate-200'
          }`}>
            <div>
              <label className="text-[9px] block mb-1 font-semibold uppercase tracking-wider text-gray-500">Date début</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full border rounded-lg px-2 py-1.5 text-[10px] focus:outline-none ${
                  darkMode
                    ? 'bg-gray-950 border-gray-800 text-gray-300 [color-scheme:dark]'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              />
            </div>
            <div>
              <label className="text-[9px] block mb-1 font-semibold uppercase tracking-wider text-gray-500">Date fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full border rounded-lg px-2 py-1.5 text-[10px] focus:outline-none ${
                  darkMode
                    ? 'bg-gray-950 border-gray-800 text-gray-300 [color-scheme:dark]'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              />
            </div>
          </div>

          {/* Select dropdowns */}
          <div className={`grid grid-cols-3 gap-1.5 p-1.5 rounded-xl border shrink-0 ${
            darkMode ? 'bg-gray-950/40 border-gray-800/80' : 'bg-slate-50/50 border-slate-200'
          }`}>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value)
                setSelectedTeam('')
                setSelectedProj('')
              }}
              className={`w-full border rounded-lg px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all truncate ${
                darkMode
                  ? 'bg-gray-950 border-gray-700 text-gray-300'
                  : 'bg-white border-slate-300 text-slate-700'
              }`}
            >
              <option value="">Département</option>
              {uniqueDepts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={selectedTeam}
              onChange={(e) => {
                setSelectedTeam(e.target.value)
                setSelectedProj('')
              }}
              className={`w-full border rounded-lg px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all truncate ${
                darkMode
                  ? 'bg-gray-950 border-gray-700 text-gray-300'
                  : 'bg-white border-slate-300 text-slate-700'
              }`}
            >
              <option value="">Équipe</option>
              {uniqueTeams.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              value={selectedProj}
              onChange={(e) => setSelectedProj(e.target.value)}
              className={`w-full border rounded-lg px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all truncate ${
                darkMode
                  ? 'bg-gray-950 border-gray-700 text-gray-300'
                  : 'bg-white border-slate-300 text-slate-700'
              }`}
            >
              <option value="">Projet</option>
              {uniqueProjects.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => {
                const filteredIds = filteredMeetings.map((m) => m.id)
                setSelectedMeetingIds((prev) => {
                  const newSelection = new Set([...prev, ...filteredIds])
                  return Array.from(newSelection)
                })
              }}
              className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-xl py-2 text-[10px] font-semibold transition-all duration-200"
            >
              Tout cocher ({filteredMeetings.length})
            </button>
            <button
              onClick={() => {
                const filteredIds = filteredMeetings.map((m) => m.id)
                setSelectedMeetingIds((prev) => prev.filter((id) => !filteredIds.includes(id)))
              }}
              className={`flex-1 border rounded-xl py-2 text-[10px] font-medium transition-all duration-200 ${
                darkMode
                  ? 'bg-gray-800 hover:bg-gray-750 text-gray-300 border-gray-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
              }`}
            >
              Tout décocher
            </button>
          </div>

          {/* Meeting Selection Checklist */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {filteredMeetings.map((meeting) => {
              const isChecked = selectedMeetingIds.includes(meeting.id)
              return (
                <label
                  key={meeting.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all border ${
                    isChecked
                      ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
                      : 'bg-transparent border-transparent text-gray-400 hover:bg-black/5 dark:hover:bg-white/[0.02]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMeetingIds((prev) => [...prev, meeting.id])
                      } else {
                        setSelectedMeetingIds((prev) => prev.filter((id) => id !== meeting.id))
                      }
                    }}
                    className="mt-0.5 rounded border-gray-300 dark:border-white/10 text-blue-500 focus:ring-0 focus:ring-offset-0 bg-transparent"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${
                      isChecked 
                        ? 'text-blue-600 dark:text-blue-300' 
                        : darkMode ? 'text-gray-200' : 'text-slate-800'
                    }`}>
                      {meeting.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-400 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} className="shrink-0" />
                        {formatDate(meeting.start_at)}
                      </span>
                      {meeting.status && (
                        <span className={`px-1.5 py-0.2 rounded-md text-[8px] uppercase tracking-wider font-bold ${
                          meeting.status === 'completed' || meeting.status === 'termine'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {meeting.status}
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              )
            })}
            {filteredMeetings.length === 0 && (
              <div className={`flex flex-col items-center justify-center py-8 text-center border border-dashed rounded-xl ${
                darkMode ? 'border-gray-800 text-gray-500' : 'border-slate-200 text-slate-400'
              }`}>
                <AlertCircle size={16} className="mb-1 text-gray-500" />
                <p className="text-[10px]">Aucune réunion trouvée.</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
