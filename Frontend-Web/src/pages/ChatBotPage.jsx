import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, Plus, Trash2, Send, Loader2,
  Bot, ChevronLeft, ChevronRight, Sparkles,
  Search, SlidersHorizontal, Filter, Calendar, AlertCircle
} from 'lucide-react';
import ChatMessage from '../components/ChatBot/ChatMessage';
import DashboardRenderer from '../components/ChatBot/DashboardRenderer';
import VoiceInput from '../components/ChatBot/VoiceInput';
import Navbar from '../components/Navbar/Navbar';
import { useMeeting } from '../context/MeetingContext';
import {
  streamMessage, getHistory, getConversation, deleteConversation, getChatMeetings
} from '../services/chatbotService';

// Format helper for dates
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
};

export default function ChatBotPage() {
  const navigate = useNavigate();
  const { darkMode } = useMeeting();

  // ── State ─────────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [dashboardConfig, setDashboardConfig] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [meetings, setMeetings] = useState([]);
  const [selectedMeetingIds, setSelectedMeetingIds] = useState([]);
  const [meetingSearch, setMeetingSearch] = useState('');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Date and Organizational Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedProj, setSelectedProj] = useState('');
  
  const messagesEndRef = useRef(null);
  const abortRef = useRef(null);

  // Extract unique filter options dynamically from meetings
  const uniqueDepts = React.useMemo(() => {
    const depts = new Set();
    meetings.forEach(m => {
      m.departments?.forEach(d => {
        if (d?.name) depts.add(d.name);
      });
    });
    return Array.from(depts).sort();
  }, [meetings]);

  const uniqueTeams = React.useMemo(() => {
    const teams = new Set();
    meetings.forEach(m => {
      m.teams?.forEach(t => {
        if (t?.name) {
          if (selectedDept && t.department_name !== selectedDept) return;
          teams.add(t.name);
        }
      });
    });
    return Array.from(teams).sort();
  }, [meetings, selectedDept]);

  const uniqueProjects = React.useMemo(() => {
    const projs = new Set();
    meetings.forEach(m => {
      if (m.project?.name) {
        if (selectedDept && !m.departments?.some(d => d.name === selectedDept)) return;
        if (selectedTeam && !m.teams?.some(t => t.name === selectedTeam)) return;
        projs.add(m.project.name);
      }
    });
    return Array.from(projs).sort();
  }, [meetings, selectedDept, selectedTeam]);

  // Combined Filtering Logic
  const filteredMeetings = React.useMemo(() => {
    return meetings.filter(m => {
      // 1. Text Search
      const matchesSearch = !meetingSearch || 
        m.title?.toLowerCase().includes(meetingSearch.toLowerCase()) || 
        m.description?.toLowerCase().includes(meetingSearch.toLowerCase());
      
      // 2. Date filters
      let matchesDate = true;
      if (m.start_at) {
        const meetingDate = new Date(m.start_at).toISOString().split('T')[0];
        if (startDate && meetingDate < startDate) matchesDate = false;
        if (endDate && meetingDate > endDate) matchesDate = false;
      } else if (startDate || endDate) {
        matchesDate = false;
      }

      // 3. Department filter
      let matchesDept = true;
      if (selectedDept) {
        matchesDept = m.departments?.some(d => d.name === selectedDept) || false;
      }

      // 4. Team filter
      let matchesTeam = true;
      if (selectedTeam) {
        matchesTeam = m.teams?.some(t => t.name === selectedTeam) || false;
      }

      // 5. Project filter
      let matchesProj = true;
      if (selectedProj) {
        matchesProj = m.project?.name === selectedProj;
      }

      return matchesSearch && matchesDate && matchesDept && matchesTeam && matchesProj;
    });
  }, [meetings, meetingSearch, startDate, endDate, selectedDept, selectedTeam, selectedProj]);

  const hasActiveFilters = !!(meetingSearch || startDate || endDate || selectedDept || selectedTeam || selectedProj);


  // ── Load conversation list and meetings on mount ────────────────────────
  useEffect(() => {
    getHistory()
      .then(setConversations)
      .catch((err) => console.error('[ChatBot] History error:', err));

    getChatMeetings()
      .then((data) => {
        setMeetings(data);
        setSelectedMeetingIds(data.map((m) => m.id)); // Select all by default
      })
      .catch((err) => console.error('[ChatBot] Meetings error:', err));
  }, []);

  // ── Scroll to bottom on new message ─────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, dashboardConfig]);

  // ── Load a conversation's messages ──────────────────────────────────────
  const loadConversation = useCallback(async (convId) => {
    setActiveConvId(convId);
    setDashboardConfig(null);
    try {
      const msgs = await getConversation(convId);
      setMessages(msgs.map((m) => ({
        role: m.role,
        content: m.content,
        metadata: typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata,
      })));
      // Check last assistant message for dashboard
      const lastAssistant = [...msgs].reverse().find((m) => m.role === 'assistant');
      if (lastAssistant) {
        const meta = typeof lastAssistant.metadata === 'string'
          ? JSON.parse(lastAssistant.metadata)
          : lastAssistant.metadata;
        if (meta?.dashboard_config) setDashboardConfig(meta.dashboard_config);
      }
    } catch (err) {
      console.error('[ChatBot] Load conversation error:', err);
    }
  }, []);

  // ── New conversation ────────────────────────────────────────────────────
  const handleNew = () => {
    setActiveConvId(null);
    setMessages([]);
    setDashboardConfig(null);
    setInput('');
  };

  // ── Delete conversation ─────────────────────────────────────────────────
  const handleDelete = async (convId, e) => {
    e.stopPropagation();
    try {
      await deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConvId === convId) handleNew();
    } catch (err) {
      console.error('[ChatBot] Delete error:', err);
    }
  };

  // ── Send message ────────────────────────────────────────────────────────
  const handleSend = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || streaming) return;

    setInput('');
    setDashboardConfig(null);

    // Optimistic user bubble
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setStreaming(true);
    setLoading(true);

    let assistantText = '';
    let convId = activeConvId;

    // Add empty assistant bubble
    setMessages((prev) => [...prev, { role: 'assistant', content: '', metadata: {} }]);

    abortRef.current = streamMessage(msg, convId, {
      onMeta: (data) => {
        if (data.conversation_id) {
          convId = data.conversation_id;
          setActiveConvId(convId);
          // Add to sidebar if new
          setConversations((prev) => {
            if (prev.find((c) => c.id === convId)) return prev;
            return [{ id: convId, title: msg.slice(0, 60), updated_at: new Date().toISOString() }, ...prev];
          });
        }
        setLoading(false);
      },
      onToken: (token) => {
        assistantText += token;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: assistantText };
          }
          return updated;
        });
      },
      onDashboard: (config) => {
        setDashboardConfig(config);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              metadata: { ...last.metadata, dashboard_config: config },
            };
          }
          return updated;
        });
      },
      onSources: (sources) => {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              metadata: { ...last.metadata, sources },
            };
          }
          return updated;
        });
      },
      onDone: () => {
        setStreaming(false);
        setLoading(false);
        // Refresh conversation list
        getHistory().then(setConversations).catch(() => {});
      }
    });
  }, [input, streaming, activeConvId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col h-screen overflow-hidden transition-colors duration-300 ${
      darkMode ? 'bg-gray-950 text-gray-100' : 'bg-slate-50 text-slate-800'
    }`}>
      <Navbar currentStep={null} hideSteps={true} />
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* ── Left Sidebar (Chat History) ─────────────────────────────────── */}
        <aside
          className={`
            flex flex-col border-r transition-all duration-300 shrink-0
            ${sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'}
            ${darkMode ? 'border-gray-800 bg-gray-900/90' : 'border-slate-200 bg-white/90'}
          `}
        >
          {/* Sidebar Header */}
          <div className={`flex items-center justify-between p-4 border-b shrink-0 ${
            darkMode ? 'border-gray-800' : 'border-slate-200'
          }`}>
            <h2 className={`text-sm font-semibold flex items-center gap-2 ${
              darkMode ? 'text-gray-305' : 'text-slate-700'
            }`}>
              <MessageSquare size={16} className="text-indigo-500 dark:text-indigo-400 animate-pulse" />
              Conversations
            </h2>
            <button
              onClick={handleNew}
              className={`p-1.5 rounded-lg border transition-all duration-200 ${
                darkMode
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20 hover:text-white'
                  : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 hover:text-indigo-700'
              }`}
              title="Nouvelle conversation"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* List of past conversations */}
          <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 custom-scrollbar">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={`
                  group flex items-center gap-2.5 px-3 py-3 rounded-xl cursor-pointer
                  transition-all duration-200 text-sm truncate border
                  ${activeConvId === conv.id
                    ? darkMode
                      ? 'bg-indigo-500/15 border-indigo-500/20 text-white shadow-lg shadow-indigo-500/5'
                      : 'bg-indigo-50 border-indigo-100 text-indigo-700 shadow-md shadow-indigo-100/10 font-semibold'
                    : darkMode
                      ? 'bg-transparent border-transparent text-gray-400 hover:bg-white/[0.03] hover:text-gray-200'
                      : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-100/80 hover:text-slate-700'}
                `}
              >
                <MessageSquare size={14} className="flex-shrink-0 opacity-50 group-hover:opacity-85" />
                <span className="flex-1 truncate font-medium">{conv.title || 'Sans titre'}</span>
                <button
                  onClick={(e) => handleDelete(conv.id, e)}
                  className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all duration-200 animate-fadeIn ${
                    darkMode
                      ? 'hover:bg-red-500/20 text-gray-500 hover:text-red-405'
                      : 'hover:bg-red-50 text-slate-400 hover:text-red-600'
                  }`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {conversations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4 opacity-50">
                <MessageSquare size={24} className={`${darkMode ? 'text-gray-605' : 'text-slate-300'} mb-2`} />
                <p className={`text-xs text-center ${darkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                  Aucune conversation. Posez une question pour commencer !
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main Chat Area ───────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 relative">
          {/* Top bar */}
          <header className={`flex items-center gap-3 px-6 py-3.5 border-b backdrop-blur-sm shrink-0 ${
            darkMode ? 'border-gray-800 bg-gray-900/85' : 'border-slate-200 bg-white/85'
          }`}>
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className={`p-1.5 rounded-lg transition-all ${
                darkMode ? 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200'
              }`}
              title={sidebarOpen ? "Masquer l'historique" : "Afficher l'historique"}
            >
              {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600
                              flex items-center justify-center shadow-lg shadow-indigo-500/15">
                <Bot size={18} className="text-white animate-pulse" />
              </div>
              <div>
                <h1 className={`text-sm font-semibold ${darkMode ? 'text-gray-250' : 'text-slate-850'}`}>Assistant Réunions</h1>
                <p className="text-[9px] text-indigo-500 dark:text-indigo-400 font-semibold tracking-wider uppercase">RAG · SQL · Dashboard</p>
              </div>
            </div>

            {streaming && (
              <span className={`ml-6 flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border font-medium ${
                darkMode 
                  ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' 
                  : 'text-indigo-600 bg-indigo-50 border-indigo-200'
              }`}>
                <Loader2 size={10} className="animate-spin text-indigo-500 dark:text-indigo-300" />
                Réflexion…
              </span>
            )}

            {/* Right Panel Toggle Button */}
            <button
              onClick={() => setRightPanelOpen(v => !v)}
              className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                rightPanelOpen 
                  ? darkMode
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 shadow-lg shadow-indigo-500/5' 
                    : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100 shadow-md shadow-indigo-100/10'
                  : darkMode
                    ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                    : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Filter size={13} className={rightPanelOpen ? (darkMode ? "text-indigo-400" : "text-indigo-600") : (darkMode ? "text-gray-400" : "text-slate-400")} />
              <span>Filtres Réunions</span>
              <span className={`px-1.5 py-0.2 text-[9px] rounded-md font-bold ${
                selectedMeetingIds.length > 0 
                  ? 'bg-indigo-500 text-white' 
                  : darkMode
                    ? 'bg-white/10 text-gray-400'
                    : 'bg-slate-100 text-slate-500'
              }`}>
                {selectedMeetingIds.length}
              </span>
            </button>
          </header>

          {/* Floating back button — top-left corner */}
          <button
            onClick={() => navigate(-1)}
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

          {/* Messages */}
          <div className={`flex-1 overflow-y-auto px-6 py-8 space-y-6 custom-scrollbar ${
            darkMode 
              ? 'bg-gradient-to-b from-gray-950 to-gray-900' 
              : 'bg-gradient-to-b from-slate-50 to-white'
          }`}>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-6 max-w-4xl mx-auto w-full">
                <div className={`w-18 h-18 rounded-3xl border flex items-center justify-center shadow-xl ${
                  darkMode
                    ? 'bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border-indigo-500/10 shadow-indigo-500/5'
                    : 'bg-gradient-to-br from-indigo-500/5 to-purple-600/5 border-indigo-200 shadow-indigo-100/10'
                }`}>
                  <Sparkles size={32} className={darkMode ? 'text-indigo-400 animate-pulse' : 'text-indigo-500 animate-pulse'} />
                </div>
                <div className="space-y-2">
                  <h2 className={`text-xl font-bold tracking-tight ${darkMode ? 'text-gray-250' : 'text-slate-800'}`}>Assistant Réunions IA</h2>
                  <p className={`text-xs max-w-md mx-auto leading-relaxed ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                    Posez des questions sur vos réunions, demandez des statistiques ou générez des tableaux de bord interactifs instantanément.
                  </p>
                </div>
                
                {/* Premium Suggestion Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 w-full px-4">
                  {[
                    {
                      title: 'Décisions prises',
                      desc: 'Quelles décisions ont été prises la semaine dernière ?',
                      icon: <MessageSquare size={16} className="text-indigo-600 dark:text-indigo-400" />
                    },
                    {
                      title: 'Statistiques mensuelles',
                      desc: 'Combien de réunions avons-nous eu ce mois-ci ?',
                      icon: <Calendar size={16} className="text-purple-500 dark:text-purple-400" />
                    },
                    {
                      title: 'Rapports projets',
                      desc: 'Affiche un graphique des réunions par projet.',
                      icon: <Sparkles size={16} className="text-pink-500 dark:text-pink-400" />
                    }
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(item.desc); handleSend(item.desc); }}
                      className={`flex flex-col items-start text-left p-4.5 rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 group shadow-lg ${
                        darkMode
                          ? 'bg-white/[0.01] border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 shadow-black/10'
                          : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 shadow-slate-100/50'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl transition-colors mb-3.5 ${
                        darkMode 
                          ? 'bg-white/5 group-hover:bg-indigo-500/10' 
                          : 'bg-slate-50 group-hover:bg-indigo-50'
                      }`}>
                        {item.icon}
                      </div>
                      <span className={`text-xs font-semibold mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors ${
                        darkMode ? 'text-gray-305' : 'text-slate-700'
                      }`}>{item.title}</span>
                      <span className={`text-[10px] leading-relaxed font-medium ${
                        darkMode ? 'text-gray-500' : 'text-slate-400'
                      }`}>{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <React.Fragment key={i}>
                <ChatMessage
                  role={msg.role}
                  content={msg.content}
                  metadata={msg.metadata}
                  darkMode={darkMode}
                />
                {/* Show dashboard right after the assistant message that contains it */}
                {msg.role === 'assistant' && msg.metadata?.dashboard_config && (
                  <div className="ml-11">
                    <DashboardRenderer config={msg.metadata.dashboard_config} />
                  </div>
                )}
              </React.Fragment>
            ))}

            {/* Show standalone dashboard if not tied to a message */}
            {dashboardConfig && !messages.some((m) => m.metadata?.dashboard_config) && (
              <div className="ml-11">
                <DashboardRenderer config={dashboardConfig} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {selectedMeetingIds.length === 0 && (
            <div className={`mx-4 mb-2 p-3 border rounded-xl flex items-start gap-2.5 text-xs ${
              darkMode
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Aucune réunion sélectionnée</span>
                <p className={`mt-0.5 ${darkMode ? 'text-amber-400/80' : 'text-amber-700/80'}`}>
                  L'assistant n'aura accès à aucun document ou historique de réunion pour répondre à vos questions.
                </p>
              </div>
            </div>
          )}

          {/* ── Input bar ─────────────────────────────────────────────────── */}
          <div className={`border-t px-4 py-3 ${
            darkMode ? 'border-gray-800/80 bg-gray-900/80' : 'border-slate-200 bg-white'
          }`}>
            <div className="flex items-end gap-2 max-w-4xl mx-auto">
              <VoiceInput
                onTranscript={(text) => setInput(text)}
                disabled={streaming}
                darkMode={darkMode}
              />

              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Posez une question sur vos réunions…"
                  rows={1}
                  disabled={streaming}
                  className={`w-full border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 transition-all disabled:opacity-50 ${
                    darkMode
                      ? 'bg-white/5 border-white/10 text-gray-250 placeholder-gray-600 focus:ring-indigo-500/50 focus:border-indigo-500/30'
                      : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-indigo-500/50 focus:border-indigo-500/30'
                  }`}
                  style={{ minHeight: 44, maxHeight: 120 }}
                />
              </div>

              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || streaming}
                className={`
                  p-2.5 rounded-xl transition-all duration-200
                  ${input.trim() && !streaming
                    ? 'bg-indigo-500 text-white hover:bg-indigo-400 shadow-lg shadow-indigo-500/20'
                    : darkMode
                      ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed'}
                `}
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </div>
          </div>
        </main>

        {/* ── Right Sidebar (Meeting Selection & Filters) ────────────────────── */}
        <aside
          className={`
            flex flex-col border-l transition-all duration-300 shrink-0 h-full
            ${rightPanelOpen ? 'w-80' : 'w-0 overflow-hidden border-l-0'}
            ${darkMode ? 'border-gray-800 bg-gray-900/90' : 'border-slate-200 bg-white'}
          `}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b shrink-0 ${
            darkMode ? 'border-gray-800' : 'border-slate-200'
          }`}>
            <h2 className={`text-sm font-semibold flex items-center gap-2 ${
              darkMode ? 'text-gray-300' : 'text-slate-700'
            }`}>
              <Filter size={16} className={`${darkMode ? 'text-indigo-400' : 'text-indigo-600'} animate-pulse`} />
              Sélection Réunions
            </h2>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setMeetingSearch('');
                  setStartDate('');
                  setEndDate('');
                  setSelectedDept('');
                  setSelectedTeam('');
                  setSelectedProj('');
                }}
                className={`text-[10px] font-semibold transition-all ${
                  darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'
                }`}
              >
                Effacer
              </button>
            )}
          </div>

          {/* Content Container */}
          <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto custom-scrollbar">
            {/* Keyword Search */}
            <div className="relative">
              <Search size={14} className={`absolute left-3.5 top-3 ${darkMode ? 'text-gray-500' : 'text-slate-400'}`} />
              <input
                type="text"
                placeholder="Rechercher une réunion..."
                value={meetingSearch}
                onChange={(e) => setMeetingSearch(e.target.value)}
                className={`w-full border rounded-xl pl-9 pr-4 py-2.5 text-xs transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500/50 ${
                  darkMode
                    ? 'bg-white/5 border-white/10 text-gray-200 placeholder-gray-600'
                    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                }`}
              />
            </div>

            {/* Date range picker */}
            <div className={`grid grid-cols-2 gap-2 p-2 rounded-xl border shrink-0 ${
              darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50/50 border-slate-150'
            }`}>
              <div>
                <label className={`text-[9px] block mb-1 font-semibold uppercase tracking-wider ${
                  darkMode ? 'text-gray-500' : 'text-slate-400'
                }`}>Date début</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full border rounded-lg px-2 py-1.5 text-[10px] focus:outline-none ${
                    darkMode
                      ? 'bg-[#0d0d14] border-white/10 text-gray-350 [color-scheme:dark]'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                />
              </div>
              <div>
                <label className={`text-[9px] block mb-1 font-semibold uppercase tracking-wider ${
                  darkMode ? 'text-gray-500' : 'text-slate-400'
                }`}>Date fin</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full border rounded-lg px-2 py-1.5 text-[10px] focus:outline-none ${
                    darkMode
                      ? 'bg-[#0d0d14] border-white/10 text-gray-350 [color-scheme:dark]'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                />
              </div>
            </div>

            {/* Select dropdowns */}
            <div className={`grid grid-cols-3 gap-1.5 p-1.5 rounded-xl border shrink-0 ${
              darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50/50 border-slate-150'
            }`}>
              <select
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setSelectedTeam('');
                  setSelectedProj('');
                }}
                className={`w-full border rounded-lg px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all truncate border-gray-300 dark:border-gray-700 ${
                  darkMode
                    ? 'bg-[#0d0d14] text-gray-300'
                    : 'bg-white text-slate-700'
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
                  setSelectedTeam(e.target.value);
                  setSelectedProj('');
                }}
                className={`w-full border rounded-lg px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all truncate border-gray-300 dark:border-gray-700 ${
                  darkMode
                    ? 'bg-[#0d0d14] text-gray-300'
                    : 'bg-white text-slate-700'
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
                className={`w-full border rounded-lg px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all truncate border-gray-300 dark:border-gray-700 ${
                  darkMode
                    ? 'bg-[#0d0d14] text-gray-300'
                    : 'bg-white text-slate-700'
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
                  const filteredIds = filteredMeetings.map((m) => m.id);
                  setSelectedMeetingIds((prev) => {
                    const newSelection = new Set([...prev, ...filteredIds]);
                    return Array.from(newSelection);
                  });
                }}
                className={`flex-1 border rounded-xl py-2 text-[10px] font-semibold transition-all duration-200 ${
                  darkMode
                    ? 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border-indigo-500/20'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-200 shadow-sm'
                }`}
              >
                Tout cocher ({filteredMeetings.length})
              </button>
              <button
                onClick={() => {
                  const filteredIds = filteredMeetings.map((m) => m.id);
                  setSelectedMeetingIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
                }}
                className={`flex-1 border rounded-xl py-2 text-[10px] font-medium transition-all duration-200 ${
                  darkMode
                    ? 'bg-white/5 hover:bg-white/10 text-gray-350 border-white/10'
                    : 'bg-white hover:bg-slate-50 text-slate-500 border-slate-200 shadow-sm'
                }`}
              >
                Tout décocher
              </button>
            </div>

            {/* Meeting Selection Checklist */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {filteredMeetings.map((meeting) => {
                const isChecked = selectedMeetingIds.includes(meeting.id);
                return (
                  <label
                    key={meeting.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all border ${
                      isChecked
                        ? darkMode
                          ? 'bg-indigo-500/10 border-indigo-500/20 text-white'
                          : 'bg-indigo-50/50 border-indigo-200 text-indigo-900 shadow-sm'
                        : darkMode
                          ? 'bg-transparent border-transparent text-gray-400 hover:bg-white/[0.02]'
                          : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-100/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMeetingIds((prev) => [...prev, meeting.id]);
                        } else {
                          setSelectedMeetingIds((prev) => prev.filter((id) => id !== meeting.id));
                        }
                      }}
                      className={`mt-0.5 rounded focus:ring-0 focus:ring-offset-0 ${
                        darkMode
                          ? 'border-white/10 text-indigo-500 bg-[#0d0d14]'
                          : 'border-slate-300 text-indigo-600 bg-white'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${
                        isChecked 
                          ? darkMode ? 'text-indigo-300' : 'text-indigo-800' 
                          : darkMode ? 'text-gray-200' : 'text-slate-800'
                      }`}>
                        {meeting.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-gray-500">
                        <span className={`flex items-center gap-1 ${darkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                          <Calendar size={10} className="shrink-0" />
                          {formatDate(meeting.start_at)}
                        </span>
                        {meeting.status && (
                          <span className={`px-1.5 py-0.2 rounded-md text-[8px] uppercase tracking-wider font-bold ${
                            meeting.status === 'completed' || meeting.status === 'termine'
                              ? darkMode 
                                ? 'bg-emerald-500/10 text-emerald-400' 
                                : 'bg-emerald-50 text-emerald-705 border border-emerald-100'
                              : darkMode
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-amber-50 text-amber-705 border border-amber-100'
                          }`}>
                            {meeting.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
              {filteredMeetings.length === 0 && (
                <div className={`flex flex-col items-center justify-center py-8 text-center border border-dashed rounded-xl ${
                  darkMode ? 'text-gray-500 border-white/5' : 'text-slate-400 border-slate-200 bg-slate-50/20'
                }`}>
                  <AlertCircle size={16} className={`mb-1 ${darkMode ? 'text-gray-600' : 'text-slate-300'}`} />
                  <p className="text-[10px]">Aucune réunion trouvée.</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
