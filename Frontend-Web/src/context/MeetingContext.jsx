import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../services/api';

const MeetingContext = createContext();

const mockTranscript = [
    { id: 1, speaker: 'Speaker A', timeStart: '00:00', timeEnd: '00:45', text: "Good morning everyone. Thanks for joining our weekly sync. Today we're going to cover the Q4 product roadmap and look at some of the feedback we received from the beta users last week.", speakerColor: '#3B82F6' },
    { id: 2, speaker: 'Speaker B', timeStart: '18:42', timeEnd: '19:15', text: "Thanks, Sarah. I've looked at the analytics and it seems that the new onboarding flow has increased the completion rate by about 15%. However, there's still a significant drop-off at the \"Connect Calendar\" step which we might need to investigate further.", speakerColor: '#F59E0B' },
    { id: 3, speaker: 'Speaker C', timeStart: '19:15', timeEnd: '20:30', text: "We've actually been interviewing some of those users who dropped off. The common sentiment is that they are worried about privacy permissions. Maybe we can add a small info block explaining exactly what data we access.", speakerColor: '#10B981' },
    { id: 4, speaker: 'Speaker A', timeStart: '20:30', timeEnd: '21:05', text: "That sounds like a great idea, Alex. Can you coordinate with the UX team to get a mockup by Friday?", speakerColor: '#3B82F6' },
];

export const useMeeting = () => {
    const context = useContext(MeetingContext);
    if (!context) {
        throw new Error('useMeeting must be used within MeetingProvider');
    }
    return context;
};

export const MeetingProvider = ({ children }) => {
    const [meetings, setMeetings] = useState([]);
    const [currentMeeting, setCurrentMeeting] = useState(null);
    const [currentMeetingId, setCurrentMeetingId] = useState(() => {
        const saved = localStorage.getItem('current_meeting_id');
        return saved ? String(saved) : null;
    });

    React.useEffect(() => {
        if (currentMeetingId) {
            localStorage.setItem('current_meeting_id', String(currentMeetingId));
        }
    }, [currentMeetingId]);

    // ── Dark Mode ──────────────────────────────────────────────────────────────
    // Persisted in localStorage; the `dark` class is applied to <html> so that
    // Tailwind's .dark variants activate across the entire application.
    const [darkMode, setDarkModeRaw] = useState(() => {
        const saved = localStorage.getItem('dark_mode');
        return saved !== null ? saved === 'true' : false;
    });

    const setDarkMode = useCallback((value) => {
        setDarkModeRaw((prev) => {
            const next = typeof value === 'function' ? value(prev) : value;
            localStorage.setItem('dark_mode', String(next));
            if (next) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            return next;
        });
    }, []);

    // Apply the saved preference immediately on first render (handles page refresh)
    React.useEffect(() => {
        const saved = localStorage.getItem('dark_mode');
        if (saved === 'true') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const [language, setLanguageRaw] = useState(() => {
        const saved = localStorage.getItem('app_language');
        return saved === 'FR' ? 'FR' : 'EN';
    });

    const setLanguage = useCallback((value) => {
        setLanguageRaw((prev) => {
            const nextRaw = typeof value === 'function' ? value(prev) : value;
            const next = String(nextRaw || '').toUpperCase() === 'FR' ? 'FR' : 'EN';
            localStorage.setItem('app_language', next);
            document.documentElement.setAttribute('lang', next === 'FR' ? 'fr' : 'en');
            return next;
        });
    }, []);

    React.useEffect(() => {
        document.documentElement.setAttribute('lang', language === 'FR' ? 'fr' : 'en');
    }, [language]);

    // ── Sidebar & Navbar Layout ────────────────────────────────────────────────
    const [sidebarWidth, setSidebarWidth] = useState(300);
    const [sidebarWidthReadonly, setSidebarWidthReadonly] = useState(300);
    const [navbarWidth, setNavbarWidth] = useState(1500);
    const [navbarWidthReadonly, setNavbarWidthReadonly] = useState(1448);
    const [navbarHeight, setNavbarHeight] = useState(64);
    const [navbarHeightReadonly, setNavbarHeightReadonly] = useState(64);

    // ── Transcript ────────────────────────────────────────────────────────────
    // DEPRECATED: mockTranscript removed (FR-005 requirement)
    // Transcript is now loaded from Symfony API only
    const [transcript, setTranscript] = useState(() => {
        const saved = localStorage.getItem('meeting_transcript');
        return saved ? JSON.parse(saved) : [];
    });

    // History for Undo/Redo
    const [history, setHistory] = useState({ past: [], future: [] });
    const [lastSaved, setLastSaved] = useState(Date.now());

    const addToHistory = (currentTranscript) => {
        setHistory(prev => ({
            past: [...prev.past, currentTranscript],
            future: []
        }));
    };

    const undo = () => {
        if (history.past.length === 0) return;
        const previous = history.past[history.past.length - 1];
        const newPast = history.past.slice(0, -1);
        setHistory({ past: newPast, future: [transcript, ...history.future] });
        setTranscript(previous);
    };

    const redo = () => {
        if (history.future.length === 0) return;
        const next = history.future[0];
        const newFuture = history.future.slice(1);
        setHistory({ past: [...history.past, transcript], future: newFuture });
        setTranscript(next);
    };

    const [summary, setSummary] = useState(() => {
        const saved = localStorage.getItem('meeting_summary');
        return saved ? JSON.parse(saved) : null;
    });
    const [loading, setLoading] = useState(false);
    const [interpretation, setInterpretation] = useState(null);
    const [error, setError] = useState(null);

    // Load audio file metadata from localStorage
    const [audioFile, setAudioFile] = useState(() => {
        const saved = localStorage.getItem('meeting_audio_meta');
        return saved ? JSON.parse(saved) : null;
    });

    // Persist transcript changes
    React.useEffect(() => {
        localStorage.setItem('meeting_transcript', JSON.stringify(transcript));
        setLastSaved(Date.now());
    }, [transcript]);

    // Persist audio file metadata (File object itself cannot be serialized)
    React.useEffect(() => {
        if (audioFile) {
            localStorage.setItem('meeting_audio_meta', JSON.stringify({
                name: audioFile.file?.name || audioFile.name,
                size: audioFile.file?.size || audioFile.size,
                type: audioFile.file?.type || audioFile.type,
                lastModified: audioFile.file?.lastModified || audioFile.lastModified || null,
                audioCreatedAt: audioFile.audioCreatedAt || null,
                uploadedAt: audioFile.uploadedAt || null,
            }));
        }
    }, [audioFile]);

    // ── API calls ─────────────────────────────────────────────────────────────

    const fetchMeetings = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/meetings');
            setMeetings(response.data.data ?? []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchMeeting = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/meetings/${id}`);
            setCurrentMeeting(response.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchTranscript = async (id) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/meetings/${id}/transcript`);
            setTranscript(response.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/summaries/${id}`);
            setSummary(response.data);
            return { success: true, data: response.data };
        } catch (err) {
            if (err?.response?.status === 404) {
                setSummary({});
            } else {
                setError(err.message);
            }
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchSummaryStatus = useCallback(async (id) => {
        try {
            const response = await api.get(`/meetings/${id}/summary-status`);
            return { success: true, data: response.data };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, []);

    const updateSummary = async (id, updatedData) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.put(`/summaries/${id}`, updatedData);
            setSummary(updatedData);
            return { success: true, data: response.data };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    // ── Behavioral Analytics ──────────────────────────────────────────────────
    const [analyticsData, setAnalyticsData] = useState(null);
    const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);

    React.useEffect(() => {
        setAnalyticsData(null);
        setInterpretation(null);
    }, [currentMeetingId]);

    const fetchAnalytics = useCallback(async (id) => {
        setIsAnalyticsLoading(true);
        setError(null);
        try {
            const response = await api.get(`/meetings/${id}/analytics`);
            setAnalyticsData(response.data);
            return { success: true, data: response.data };
        } catch (err) {
            if (err?.response?.status !== 404 && err?.response?.status !== 202) {
                setError(err.message);
            }
            return { success: false, error: err.message };
        } finally {
            setIsAnalyticsLoading(false);
        }
    }, []);

    const addDecision = async (meetingId, decision) => {
        try {
            await api.put(`/meetings/${meetingId}/decisions`, decision);
        } catch (err) {
            setError(err.message);
        }
    };

    const addActionItem = async (meetingId, actionItem) => {
        try {
            await api.post(`/meetings/${meetingId}/action-items`, actionItem);
        } catch (err) {
            setError(err.message);
        }
    };

    const updateSegment = (id, newText) => {
        addToHistory(transcript);
        setTranscript(prev => prev.map(seg => seg.id === id ? { ...seg, text: newText } : seg));
    };

    const deleteSegment = (id) => {
        addToHistory(transcript);
        setTranscript(prev => prev.filter(seg => seg.id !== id));
    };

    const saveTranscript = async (meetingId, segments) => {
        setLoading(true);
        setError(null);
        try {
            await api.put(`/meetings/${meetingId}/transcript`, segments);
            return { success: true };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const generateSummary = useCallback(async (meetingId, settings = {}) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.post(`/meetings/${meetingId}/generate-summary`, settings);
            return { success: true, data: response.data };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    // Persist AI meeting results to PostgreSQL via Symfony
    const persistToDatabase = useCallback(async ({ title, description, date, durationMinutes, participants, transcript: transcriptData, summary: summaryData, decisions, actionItems, analytics, projectId }) => {
        try {
            const finalAnalytics = analytics || {};
            if (interpretation && !finalAnalytics.ai_interpretation) {
                finalAnalytics.ai_interpretation = interpretation;
            }

            const audioCreatedAtFallback = (() => {
                const raw =
                    audioFile?.file?.lastModified ??
                    audioFile?.lastModified ??
                    audioFile?.audioCreatedAt ??
                    audioFile?.uploadedAt ??
                    null;
                if (!raw) return null;
                if (typeof raw === 'number') {
                    const parsed = new Date(raw);
                    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
                }
                const parsed = new Date(raw);
                return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
            })();

            const response = await api.post('/meetings/persist-ai-result', {
                title: title || 'Réunion IA',
                description: description || null,
                date: date || audioCreatedAtFallback || new Date().toISOString(),
                durationMinutes: durationMinutes || 0,
                participants: participants || [],
                transcript: transcriptData || [],
                summary: summaryData || null,
                decisions: decisions || [],
                actionItems: actionItems || [],
                analytics: finalAnalytics,
                projectId: projectId || null,
            });
            console.log('[MeetingContext] AI meeting persisted to DB:', response.data?.meetingId);
            return { success: true, data: response.data };
        } catch (err) {
            console.error('[MeetingContext] Failed to persist AI meeting to DB:', err);
            return { success: false, error: err.message };
        }
    }, [interpretation, audioFile]);

    const saveAnalyticsInterpretation = useCallback(async (meetingId, interpretation) => {
        try {
            const response = await api.put(`/meetings/${meetingId}/analytics/interpretation`, {
                interpretation
            });
            return { success: true, data: response.data };
        } catch (err) {
            console.error('[MeetingContext] Failed to save interpretation:', err);
            return { success: false, error: err.message };
        }
    }, []);

    const translateSummary = useCallback(async (meetingId, targetLanguage, pvData = null) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.post(`/meetings/${meetingId}/summary/translate`, {
                target_language: targetLanguage,
                pv_data: pvData
            });
            return { success: true, data: response.data };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteMeeting = async (id) => {
        setLoading(true);
        setError(null);
        try {
            await api.delete(`/meetings/${id}`);
            setMeetings(prev => prev.filter(m => m.id !== id));
            return { success: true };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const value = {
        meetings,
        currentMeeting,
        setCurrentMeeting,
        currentMeetingId,
        setCurrentMeetingId,
        interpretation,
        setInterpretation,
        transcript,
        setTranscript,
        summary,
        setSummary,
        loading,
        error,
        audioFile,
        setAudioFile,
        fetchMeetings,
        fetchMeeting,
        fetchTranscript,
        fetchSummary,
        fetchSummaryStatus,
        fetchAnalytics,
        updateSummary,
        addDecision,
        addActionItem,
        updateSegment,
        deleteSegment,
        deleteMeeting,
        saveTranscript,
        generateSummary,
        translateSummary,
        persistToDatabase,
        saveAnalyticsInterpretation,
        undo,
        redo,
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0,
        lastSaved,
        darkMode,
        setDarkMode,
        language,
        setLanguage,
        sidebarWidth,
        setSidebarWidth,
        sidebarWidthReadonly,
        setSidebarWidthReadonly,
        navbarWidth,
        setNavbarWidth,
        navbarWidthReadonly,
        setNavbarWidthReadonly,
        navbarHeight,
        setNavbarHeight,
        navbarHeightReadonly,
        setNavbarHeightReadonly,
        analyticsData,
        setAnalyticsData,
        isAnalyticsLoading
    };

    return <MeetingContext.Provider value={value}>{children}</MeetingContext.Provider>;
};
