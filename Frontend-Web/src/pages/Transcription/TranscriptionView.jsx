import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Undo, Redo, Play, Pause, RotateCcw, RotateCw, Volume2, Settings, ChevronLeft, Cloud, Check, X, Edit2, Trash2, FileText, MoreVertical, Mic2, Brain, CheckCircle2, AlertCircle, RefreshCw, Sparkles, Globe, Languages, Users, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';
import Button from '../../components/Button/Button';
import { useMeeting } from '../../context/MeetingContext';
import { useI18n } from '../../i18n/useI18n';
import Loader from '../../components/Loader/Loader';
import ErrorState from '../../components/ErrorState/ErrorState';

const POLL_INTERVAL = 3000;

const getSteps = (t) => [
    { label: t('transcription.audioUploaded'), icon: Mic2, minProgress: 0 },
    { label: t('transcription.aiTranscribing'), icon: Brain, minProgress: 30 },
    { label: t('transcription.speakerDiarization'), icon: RefreshCw, minProgress: 60 },
    { label: t('transcription.writingTranscript'), icon: FileText, minProgress: 80 },
    { label: t('transcription.transcriptionComplete'), icon: CheckCircle2, minProgress: 100 },
];

const TranscriptionView = ({ showBackLink = true, meetingId, hideActions = false, onSaveAndContinue, isEmbedded = false, onNavigate }) => {
    const navigate = useNavigate();
    const { t } = useI18n();
    const STEPS = getSteps(t);
    const { transcript, setTranscript, fetchTranscript, audioFile, updateSegment, deleteSegment, loading, error, undo, redo, canUndo, canRedo, lastSaved, currentMeeting, fetchMeeting, sidebarWidth, sidebarWidthReadonly, currentMeetingId, saveTranscript, generateSummary, darkMode } = useMeeting();

    const go = (target) => {
        if (isEmbedded && onNavigate) {
            onNavigate(target);
        } else {
            if (target === 'back') navigate('/');
            else if (target === 'pv') navigate('/summary');
        }
    };
    const [showSpeakerStats, setShowSpeakerStats] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [currentTimeSec, setCurrentTimeSec] = useState(0);
    const [durationSec, setDurationSec] = useState(0);
    const [speed, setSpeed] = useState('1.0x');
    const [volume, setVolume] = useState(100);

    // --- Translation State ---
    const [translateLang, setTranslateLang] = useState('en');
    const [isTranslating, setIsTranslating] = useState(false);
    const [translateError, setTranslateError] = useState(null);
    const [translateDone, setTranslateDone] = useState(false);
    // -------------------------

    // --- AI Polling State ---
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [progress, setProgress] = useState(5);
    const [stepLabel, setStepLabel] = useState('');
    const [pollingStatus, setPollingStatus] = useState('pending');
    const [dots, setDots] = useState('');
    const [aiError, setAiError] = useState(null);
    const intervalRef = useRef(null);
    const dotIntervalRef = useRef(null);
    // -------------------------


    // Editing State
    const [editingSegmentId, setEditingSegmentId] = useState(null);
    const [editedText, setEditedText] = useState('');
    const [cursorPosition, setCursorPosition] = useState(null);
    const [inlineSpeakerEdit, setInlineSpeakerEdit] = useState({ segmentId: null, draft: '', originalSpeaker: '' });

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [speakerDrafts, setSpeakerDrafts] = useState({});
    const editTextAreaRef = useRef(null);
    const activeMeetingId = meetingId || currentMeetingId || currentMeeting?.id;
    const speakerRenameStorageKey = activeMeetingId ? `meeting_speaker_rename_map_${activeMeetingId}` : null;
    const persistSpeakerRenameMap = (updates) => {
        if (!speakerRenameStorageKey || !updates || Object.keys(updates).length === 0) return;
        const raw = localStorage.getItem(speakerRenameStorageKey);
        const existing = raw ? JSON.parse(raw) : {};
        const merged = { ...existing, ...updates };
        Object.keys(merged).forEach((k) => {
            let v = merged[k];
            const seen = new Set([k]);
            while (merged[v] && !seen.has(v)) {
                seen.add(v);
                v = merged[v];
            }
            merged[k] = v;
        });
        localStorage.setItem(speakerRenameStorageKey, JSON.stringify(merged));
    };

    // Filtered transcript based on search
    const safeTranscript = Array.isArray(transcript) ? transcript : [];
    const uniqueSpeakers = useMemo(() => {
        const seen = new Set();
        const ordered = [];
        for (const segment of safeTranscript) {
            const name = (segment?.speaker || 'Unknown').trim();
            if (!seen.has(name)) {
                seen.add(name);
                ordered.push(name);
            }
        }
        return ordered;
    }, [safeTranscript]);



    const parseTimeToSeconds = (timeValue) => {
        if (timeValue === null || timeValue === undefined) return 0;
        // Already a number (e.g. integer seconds from the backend DB)
        if (typeof timeValue === 'number') return isNaN(timeValue) ? 0 : timeValue;
        // String-based timestamp "MM:SS" or "HH:MM:SS"
        const timeString = String(timeValue);
        const parts = timeString.split(':');
        let totalSeconds = 0;
        if (parts.length === 2) {
            totalSeconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        } else if (parts.length === 3) {
            totalSeconds = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
        } else {
            totalSeconds = parseFloat(timeString);
        }
        return isNaN(totalSeconds) ? 0 : totalSeconds;
    };

    // Map speaker name → their color (from speakerColor on segments)
    const speakerColorMap = useMemo(() => {
        const map = {};
        for (const segment of safeTranscript) {
            const name = (segment?.speaker || 'Unknown').trim();
            if (segment?.speakerColor && !map[name]) {
                map[name] = segment.speakerColor;
            }
        }
        return map;
    }, [safeTranscript]);

    // Per-speaker stats: words + speaking duration
    const speakerStats = useMemo(() => {
        const stats = {};
        for (const segment of safeTranscript) {
            const name = (segment?.speaker || 'Unknown').trim();
            if (!stats[name]) stats[name] = { words: 0, duration: 0 };
            stats[name].words += segment?.text ? segment.text.trim().split(/\s+/).filter(Boolean).length : 0;
            const start = parseTimeToSeconds(segment?.timeStart);
            const end = parseTimeToSeconds(segment?.timeEnd);
            if (end > start) stats[name].duration += end - start;
        }
        return stats;
    }, [safeTranscript]);

    const totalWords = useMemo(() => Object.values(speakerStats).reduce((a, s) => a + s.words, 0), [speakerStats]);
    const totalDuration = useMemo(() => Object.values(speakerStats).reduce((a, s) => a + s.duration, 0), [speakerStats]);
    const filteredTranscript = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return safeTranscript;
        return safeTranscript.filter((segment) => {
            const speaker = String(segment?.speaker || '').toLowerCase();
            const text = String(segment?.text || '').toLowerCase();
            return speaker.includes(query) || text.includes(query);
        });
    }, [safeTranscript, searchQuery]);
    const hasPendingSpeakerChanges = useMemo(
        () => uniqueSpeakers.some((speaker) => {
            const draft = (speakerDrafts[speaker] ?? '').trim();
            return draft !== '' && draft !== speaker;
        }),
        [uniqueSpeakers, speakerDrafts]
    );

    // Helper: AI meetings have pure numeric IDs (from Flask JobStore)
    const isAiMeeting = (id) => id !== null && id !== undefined && /^\d+$/.test(String(id));

    useEffect(() => {
        const id = meetingId || currentMeeting?.id || currentMeetingId;
        if (!id) return; // No meeting active

        if (isAiMeeting(id) && !aiError) {
            // Clear stale transcript so we always show the AI processing screen
            // for fresh uploads — don't reuse data from a previous meeting
            setIsAiProcessing(true);
        } else {
            setIsAiProcessing(false);
            fetchTranscript(id);
        }

        if (!currentMeeting || String(currentMeeting.id) !== String(id)) {
            fetchMeeting(id);
        }
    }, [meetingId, currentMeeting?.id, currentMeetingId]);

    // Animated dots for loader
    useEffect(() => {
        if (!isAiProcessing) return;
        dotIntervalRef.current = setInterval(() => {
            setDots(d => d.length >= 3 ? '' : d + '.');
        }, 500);
        return () => clearInterval(dotIntervalRef.current);
    }, [isAiProcessing]);

    // Poll the status endpoint if AI is processing
    // IMPORTANT: Always poll Flask (port 5001) directly for AI jobs — Symfony has no such route.
    useEffect(() => {
        const id = meetingId || currentMeeting?.id || currentMeetingId;
        if (!isAiProcessing || !id) return;

        const poll = async () => {
            try {
                const res = await fetch(`http://localhost:5001/api/meetings/${id}/status`);
                if (!res.ok) {
                    if (res.status === 404) {
                        clearInterval(intervalRef.current);
                        clearInterval(dotIntervalRef.current);
                        setAiError(t('transcription.sessionLost'));
                        setIsAiProcessing(false);
                    }
                    return;
                }
                const data = await res.json();

                setProgress(data.progress ?? 5);
                setStepLabel(data.step ?? '');
                setPollingStatus(data.status);

                if (data.status === 'done') {
                    clearInterval(intervalRef.current);
                    clearInterval(dotIntervalRef.current);
                    setTimeout(() => {
                        setIsAiProcessing(false);
                        if (data.segments?.length > 0) {
                            setTranscript(data.segments);
                        } else {
                            fetchTranscript(id);
                        }
                    }, 800);
                } else if (data.status === 'error') {
                    clearInterval(intervalRef.current);
                    clearInterval(dotIntervalRef.current);
                    setAiError(data.errorMessage ?? t('transcription.errorProcessing'));
                    setIsAiProcessing(false);
                }
            } catch (err) {
                console.error('Status poll failed (Flask unreachable?):', err);
            }
        };

        poll();
        intervalRef.current = setInterval(poll, POLL_INTERVAL);
        return () => clearInterval(intervalRef.current);
    }, [isAiProcessing, meetingId, currentMeeting?.id, currentMeetingId]);

    const handleCancelAiProcessing = async () => {
        try {
            // Demande au backend de s'arrêter de force
            await fetch(`http://localhost:5001/api/meetings/${meetingId}`, {
                method: 'DELETE'
            });
        } catch (e) {
            console.error("Failed to cancel server transcription:", e);
        }

        clearInterval(intervalRef.current);
        clearInterval(dotIntervalRef.current);
        setIsAiProcessing(false);
        go('back'); // Retour à la page d'upload (ou archive en embedded)
    };

    const togglePlay = async () => {
        if (audioRef.current) {
            try {
                if (playing) {
                    audioRef.current.pause();
                    setPlaying(false);
                } else {
                    await audioRef.current.play();
                    setPlaying(true);
                }
            } catch (err) {
                console.error("Playback failed:", err);
                setPlaying(false);
            }
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTimeSec(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDurationSec(audioRef.current.duration);
        }
    };

    const skip = (seconds) => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime;
            const duration = audioRef.current.duration || 1000000;
            let newTime = current + seconds;
            if (newTime < 0) newTime = 0;
            if (newTime > duration) newTime = duration;
            audioRef.current.currentTime = newTime;
        }
    };

    const handleSeek = (e) => {
        if (audioRef.current) {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            audioRef.current.currentTime = percent * durationSec;
        }
    };

    const handleSpeedChange = () => {
        const speeds = ['0.5x', '1.0x', '1.5x', '2.0x'];
        const currentIdx = speeds.indexOf(speed);
        const nextIdx = (currentIdx + 1) % speeds.length;
        const newSpeed = speeds[nextIdx];
        setSpeed(newSpeed);
        if (audioRef.current) {
            audioRef.current.playbackRate = parseFloat(newSpeed.replace('x', ''));
        }
    };

    const handleVolumeChange = (e) => {
        const newVolume = e.target.value;
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume / 100;
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const highlightText = (text, query) => {
        if (!query?.trim()) return text;
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const parts = String(text || '').split(new RegExp(`(${escaped})`, 'gi'));
        return parts.map((part, idx) => (
            part.toLowerCase() === query.toLowerCase()
                ? <mark key={`${part}-${idx}`} className="px-0.5 rounded bg-yellow-200/70 text-inherit">{part}</mark>
                : <React.Fragment key={`${part}-${idx}`}>{part}</React.Fragment>
        ));
    };

    const handleSegmentClick = (segment) => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = parseTimeToSeconds(segment?.timeStart);
        setCurrentTimeSec(audioRef.current.currentTime);
    };

    const autoResize = (e) => {
        setEditedText(e.target.value);
        setCursorPosition(e.target.selectionStart);
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    const handleEditStart = (segment, e) => {
        setEditingSegmentId(segment.id);
        setEditedText(segment.text || '');
        setCursorPosition(e?.target?.selectionStart ?? null);
    };

    const handleEditCancel = () => {
        setEditingSegmentId(null);
        setEditedText('');
        setCursorPosition(null);
    };

    const handleEditSave = () => {
        if (editingSegmentId === null) return;
        updateSegment(editingSegmentId, editedText);
        handleEditCancel();
    };

    useEffect(() => {
        if (editingSegmentId !== null && editTextAreaRef.current) {
            const ta = editTextAreaRef.current;
            ta.style.height = 'auto';
            ta.style.height = `${ta.scrollHeight}px`;
            if (cursorPosition !== null) ta.setSelectionRange(cursorPosition, cursorPosition);
        }
    }, [editingSegmentId, cursorPosition]);

    const handleDelete = (segmentId) => {
        deleteSegment(segmentId);
    };

    const saveSpeakerDrafts = () => {
        if (!hasPendingSpeakerChanges) return;
        const renameMap = {};
        for (const speaker of uniqueSpeakers) {
            const draft = (speakerDrafts[speaker] ?? '').trim();
            if (draft && draft !== speaker) renameMap[speaker] = draft;
        }
        if (Object.keys(renameMap).length === 0) return;
        setTranscript((prev) => prev.map((seg) => (
            renameMap[seg?.speaker] ? { ...seg, speaker: renameMap[seg.speaker] } : seg
        )));
        persistSpeakerRenameMap(renameMap);
        setSpeakerDrafts({});
    };

    const startInlineSpeakerEdit = (segment) => {
        setInlineSpeakerEdit({
            segmentId: segment.id,
            draft: segment.speaker || 'Unknown',
            originalSpeaker: segment.speaker || 'Unknown'
        });
    };

    const handleInlineSpeakerChange = (value) => {
        setInlineSpeakerEdit((prev) => ({ ...prev, draft: value }));
    };

    const cancelInlineSpeakerEdit = () => {
        setInlineSpeakerEdit({ segmentId: null, draft: '', originalSpeaker: '' });
    };

    const commitInlineSpeakerEdit = () => {
        const newName = inlineSpeakerEdit.draft.trim();
        const oldName = inlineSpeakerEdit.originalSpeaker;
        if (!newName || !oldName || newName === oldName) {
            cancelInlineSpeakerEdit();
            return;
        }
        setTranscript((prev) => prev.map((seg) => (
            seg?.speaker === oldName ? { ...seg, speaker: newName } : seg
        )));
        persistSpeakerRenameMap({ [oldName]: newName });
        cancelInlineSpeakerEdit();
    };

    const handleTranslate = async () => {
        if (!activeMeetingId || isTranslating) return;
        setIsTranslating(true);
        setTranslateDone(false);
        setTranslateError(null);
        try {
            const response = await fetch(`http://localhost:5001/api/meetings/${activeMeetingId}/transcript/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_language: translateLang })
            });
            if (!response.ok) throw new Error('Translation failed');
            const data = await response.json();
            if (Array.isArray(data?.segments)) setTranscript(data.segments);
            setTranslateDone(true);
        } catch (err) {
            setTranslateError(err.message || 'Translation failed');
        } finally {
            setIsTranslating(false);
        }
    };

    return (
        <div className="flex flex-1 overflow-hidden h-full w-full">
            {/* Left Sidebar */}
            <aside
                style={{ width: `${hideActions ? sidebarWidthReadonly : sidebarWidth}px` }}
                className={`border-r flex flex-col p-6 overflow-y-auto transition-colors duration-300 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}
            >

                {showBackLink && (
                    <div className="mb-6">
                        <button
                            onClick={() => go('back')}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-300 transform active:scale-95 group ${
                                darkMode
                                    ? 'bg-gray-800 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-750 hover:border-gray-650'
                                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 hover:border-slate-350'
                            }`}
                            title={t('transcription.backToDashboard')}
                        >
                            <ChevronLeft size={14} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
                            <span>{t('transcription.backToDashboard')}</span>
                        </button>
                    </div>
                )}

                <div className="mb-6">
                    <h2 className={`text-xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'} truncate`}>
                        {currentMeeting?.title || audioFile?.file?.name || "Weekly Product Sync"}
                    </h2>
                    <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {currentMeeting?.date || new Date().toLocaleDateString()} • {formatTime(durationSec)}
                    </p>
                </div>

                {/* Audio Player Card */}
                <div className={`rounded-xl p-4 mb-4 border transition-colors duration-300 ${darkMode ? 'bg-gray-800 border-gray-700 shadow-none' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="bg-black rounded-lg aspect-video mb-4 flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 flex items-center justify-center gap-[2px] opacity-70">
                            {[...Array(40)].map((_, i) => (
                                <div
                                    key={i}
                                    className="w-1 bg-blue-500 rounded-full animate-pulse"
                                    style={{
                                        height: `${Math.random() * 80 + 20}%`,
                                        animationDelay: `${i * 0.05}s`
                                    }}
                                ></div>
                            ))}
                        </div>
                        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/80 to-transparent"></div>
                        <audio
                            ref={audioRef}
                            src={audioFile?.url}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onEnded={() => setPlaying(false)}
                            className="hidden"
                        />
                    </div>

                    <div
                        className="relative h-1 bg-gray-200 dark:bg-gray-700 rounded-full mb-2 cursor-pointer group"
                        onClick={handleSeek}
                    >
                        <div
                            className="absolute top-0 left-0 h-full bg-blue-900 rounded-full pointer-events-none"
                            style={{ width: durationSec ? `${(currentTimeSec / durationSec) * 100}%` : '0%' }}
                        ></div>
                        <div
                            className="absolute top-1/2 w-3 h-3 bg-blue-900 rounded-full border-2 border-white dark:border-gray-800 transform -translate-y-1/2 shadow-sm scale-0 group-hover:scale-100 transition-transform pointer-events-none"
                            style={{ left: durationSec ? `${(currentTimeSec / durationSec) * 100}%` : '0%' }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mb-4 font-mono">
                        <span>{formatTime(currentTimeSec)}</span>
                        <span>{formatTime(durationSec)}</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-center gap-6">
                            <button className={`text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors`} onClick={() => skip(-10)}>
                                <div className="relative pointer-events-none">
                                    <RotateCcw size={20} />
                                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[8px] font-bold">10</span>
                                </div>
                            </button>
                            <button onClick={togglePlay} className="w-12 h-12 bg-blue-900 hover:bg-blue-800 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-900/40 transition-transform active:scale-95">
                                {playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                            </button>
                            <button className={`text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors`} onClick={() => skip(10)}>
                                <div className="relative pointer-events-none">
                                    <RotateCw size={20} />
                                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[8px] font-bold">10</span>
                                </div>
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Volume2 size={16} className="text-gray-400" />
                                <input type="range" min="0" max="100" value={volume} onChange={handleVolumeChange} className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-900" />
                            </div>
                            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 dark:text-gray-300 cursor-pointer select-none active:scale-95 transition-transform`} onClick={handleSpeedChange}>
                                <span>{speed}</span>
                                <Settings size={12} className="opacity-50" />
                            </div>
                        </div>
                    </div>
                </div>
                {/* Speaker Management Card */}
                <div className={`mt-auto rounded-2xl border overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    {/* Header */}
                    <div className={`px-4 pt-4 pb-3 flex items-center justify-between ${darkMode ? '' : ''}`}>
                        <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${darkMode ? 'bg-blue-900/40' : 'bg-blue-50'}`}>
                                <Users size={13} className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
                            </div>
                            <div>
                                <p className={`text-xs font-semibold leading-none ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{t('transcription.intervenants')}</p>
                                <p className={`text-[10px] mt-0.5 leading-none ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{uniqueSpeakers.length} détecté{uniqueSpeakers.length > 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        <button
                            onClick={saveSpeakerDrafts}
                            disabled={!hasPendingSpeakerChanges}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition-all duration-200 ${
                                hasPendingSpeakerChanges
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25'
                                    : (darkMode ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed')
                            }`}
                        >
                            <Check size={11} strokeWidth={3} />
                            {t('transcription.saveSpeakers')}
                        </button>
                    </div>

                    {/* Divider */}
                    <div className={`h-px mx-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`} />

                    {/* Speaker list - fixed height so sidebar never resizes */}
                    <div className="p-3 flex flex-col gap-1.5 h-[200px] overflow-y-auto">
                        {uniqueSpeakers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
                                <Users size={20} className={darkMode ? 'text-gray-600' : 'text-gray-300'} />
                                <span className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('transcription.noSpeakers')}</span>
                            </div>
                        ) : uniqueSpeakers.map((speaker) => {
                            const color = speakerColorMap[speaker] || '#3B82F6';
                            const isDirty = (speakerDrafts[speaker] ?? speaker) !== speaker && (speakerDrafts[speaker] ?? '').trim() !== '';
                            return (
                                <div
                                    key={speaker}
                                    className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all duration-150 ${
                                        darkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                                    }`}
                                    style={isDirty ? { backgroundColor: color + '12' } : {}}
                                >
                                    {/* Avatar — mirrors the transcript tag color */}
                                    <div
                                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold select-none"
                                        style={{ backgroundColor: color + '22', color }}
                                    >
                                        {speaker.substring(0, 2).toUpperCase()}
                                    </div>

                                    {/* Input */}
                                    <div className={`flex-1 min-w-0 flex items-center gap-1.5 rounded-lg px-2 py-1 transition-all ${
                                        darkMode
                                            ? 'bg-gray-800/60 focus-within:bg-gray-800 focus-within:ring-1 focus-within:ring-blue-500/40'
                                            : 'bg-transparent focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-400/30 focus-within:shadow-sm'
                                    }`}>
                                        <input
                                            type="text"
                                            value={speakerDrafts[speaker] ?? speaker}
                                            onChange={(e) => setSpeakerDrafts((prev) => ({ ...prev, [speaker]: e.target.value }))}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') { e.preventDefault(); saveSpeakerDrafts(); }
                                            }}
                                            placeholder={speaker}
                                            className={`w-full bg-transparent border-none p-0 text-[11px] font-semibold focus:ring-0 focus:outline-none transition-colors ${
                                                darkMode ? 'text-gray-200' : 'text-gray-700'
                                            } placeholder:font-normal ${darkMode ? 'placeholder:text-gray-600' : 'placeholder:text-gray-400'}`}
                                        />
                                        {isDirty && (
                                            <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer — always rendered, height reserved */}
                    <div className={`px-3 pb-3`}>
                        <div className={`flex items-center gap-2 text-[10px] font-medium px-2.5 py-2 rounded-lg transition-all duration-300 ${
                            hasPendingSpeakerChanges
                                ? (darkMode ? 'bg-blue-900/25 text-blue-300 border border-blue-800/40 opacity-100' : 'bg-blue-50 text-blue-600 border border-blue-100 opacity-100')
                                : 'opacity-0 pointer-events-none border border-transparent'
                        } ${darkMode ? '' : ''}`}>
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${darkMode ? 'bg-blue-400' : 'bg-blue-500'} animate-pulse`} />
                            {t('transcription.unsavedChanges')}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Transcript Content */}
            <div className={`flex-1 flex flex-col overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
                {/* Toolbar - cacher pendant le chargement initial de l'IA */}
                {!isAiProcessing && (
                    <div className={`flex items-center justify-between px-8 py-4 border-b transition-colors duration-300 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                        <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border w-64 focus-within:ring-2 focus-within:ring-blue-500/20 transition-colors ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-gray-50 border-gray-200'}`}>
                            <Search size={16} className="text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('transcription.searchTranscript')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`bg-transparent border-none text-sm w-full focus:outline-none placeholder-gray-400 ${darkMode ? 'text-white' : 'text-gray-900'}`}
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Translation Panel */}
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                        }`}>
                            <Languages size={15} className={darkMode ? 'text-blue-400' : 'text-blue-900'} />
                            <select
                                value={translateLang}
                                onChange={(e) => { setTranslateLang(e.target.value); setTranslateDone(false); }}
                                disabled={isTranslating}
                                title="Target language for translation"
                                className={`bg-transparent border-none text-xs font-medium focus:outline-none cursor-pointer pr-1 ${
                                    darkMode ? 'text-gray-200' : 'text-gray-800'
                                } disabled:opacity-50`}
                            >
                                <option value="en">🇬🇧 English</option>
                                <option value="fr">🇫🇷 Français</option>
                                <option value="ar">🇲🇦 العربية</option>
                                <option value="es">🇪🇸 Español</option>
                                <option value="de">🇩🇪 Deutsch</option>
                                <option value="it">🇮🇹 Italiano</option>
                                <option value="pt">🇧🇷 Português</option>
                            </select>
                            <div className={`w-px h-4 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
                            <button
                                onClick={handleTranslate}
                                disabled={isTranslating || !activeMeetingId}
                                title="Translate transcript with TowerInstruct (LM Studio)"
                                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${
                                    translateDone
                                        ? 'bg-emerald-500/15 text-emerald-500'
                                        : translateError
                                            ? 'bg-red-500/10 text-red-500'
                                            : isTranslating
                                                ? (darkMode ? 'text-blue-400' : 'text-blue-900')
                                                : (darkMode ? 'hover:bg-blue-900/30 text-blue-400' : 'hover:bg-blue-50 text-blue-900')
                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                                {isTranslating ? (
                                    <><svg className="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-20 stroke-current" cx="12" cy="12" r="10" strokeWidth="3"/><path className="opacity-100 fill-current" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>{t('transcription.translating')}</>
                                ) : translateDone ? (
                                    <><Check size={12} className="text-emerald-500" />{t('transcription.translated')}</>
                                ) : translateError ? (
                                    <><AlertCircle size={12} />Error</>
                                ) : (
                                    <><Globe size={12} />{t('transcription.translate')}</>
                                )}
                            </button>
                            {translateError && (
                                <span className="text-red-400 text-[10px] max-w-[120px] truncate" title={translateError}>{translateError}</span>
                            )}
                        </div>

                        {!hideActions && (
                            <div className="flex items-center gap-6">
                                <div className={`flex items-center gap-2 text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                                    <Cloud size={14} />
                                    {lastSaved ? t('transcription.saved') : t('transcription.notSaved')}
                                </div>
                                <div className="h-4 w-px bg-gray-300 dark:bg-gray-700"></div>
                                <div className="flex gap-2">
                                    <button className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${!canUndo ? 'opacity-30 cursor-not-allowed' : ''} ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`} onClick={undo} disabled={!canUndo}>
                                        <Undo size={16} />
                                    </button>
                                    <button className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${!canRedo ? 'opacity-30 cursor-not-allowed' : ''} ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`} onClick={redo} disabled={!canRedo}>
                                        <Redo size={16} />
                                    </button>
                                </div>
                                <Button
                                    id="save-continue-btn"
                                    disabled={saving}
                                    onClick={async () => {
                                        const activeMeetingId = meetingId || currentMeetingId;
                                        if (!activeMeetingId) {
                                            const ok = window.confirm(
                                                '💾 Aucune réunion active. Voulez-vous continuer quand même ?'
                                            );
                                            if (ok) { onSaveAndContinue?.(); navigate('/summary'); }
                                            return;
                                        }
                                        setSaving(true);
                                        setSaveError(null);
                                        try {
                                            // 1. Save edited segments
                                            const saveResult = await saveTranscript(activeMeetingId, transcript);
                                            if (!saveResult.success) throw new Error(saveResult.error);
                                            // 2. Navigation immédiate pour faire le loader du PV sur la page suivante
                                            onSaveAndContinue?.();
                                            go('pv');
                                        } catch (err) {
                                            setSaveError(err.message || 'Erreur lors de la sauvegarde');
                                        } finally {
                                            setSaving(false);
                                        }
                                    }}
                                    className={`shadow-lg border-none px-6 ${saving
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-blue-900 hover:bg-blue-800 shadow-blue-900/30'
                                        } text-white`}
                                >
                                    {saving ? t('transcription.translating') : <>{t('transcription.saveAndContinue')} <span className="ml-1">→</span></>}
                                </Button>
                                {saveError && (
                                    <span className="text-red-500 text-xs ml-2">{saveError}</span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Segments or Processing Screen */}
                <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full relative">
                    {isAiProcessing ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10 w-full h-full">
                            {/* Faded Skeleton Background showing "Writing..." */}
                            <div className="absolute inset-0 overflow-hidden opacity-[0.15] dark:opacity-20 pointer-events-none p-8 flex flex-col gap-8 w-full max-w-5xl mx-auto filter blur-[2px]">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex md:flex-row flex-col gap-6 w-full">
                                        <div className="w-32 flex-shrink-0 pt-1">
                                            <div className={`h-5 w-16 rounded-md mb-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                                            <div className={`h-2.5 w-24 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                                        </div>
                                        <div className={`flex-1 rounded-2xl p-5 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                                            <div className={`h-3 w-full rounded mb-3 ${darkMode ? 'bg-gray-600' : 'bg-gray-400'}`}></div>
                                            <div className={`h-3 w-[85%] rounded mb-3 ${darkMode ? 'bg-gray-600' : 'bg-gray-400'}`}></div>
                                            <div className={`h-3 w-[60%] rounded ${darkMode ? 'bg-gray-600' : 'bg-gray-400'}`}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Elegant Loader Card */}
                            <div className={`relative z-20 w-full max-w-sm mx-auto rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border backdrop-blur-xl p-8 mb-12 transform -translate-y-4 transition-all duration-500 ${darkMode ? 'bg-gray-900/80 border-gray-800/80 shadow-black/40' : 'bg-white/80 border-white shadow-blue-900/5'}`}>
                                <div className="flex flex-col items-center text-center">
                                    {/* Spinner */}
                                    <div className="relative w-14 h-14 mb-6">
                                        <svg className="animate-spin w-full h-full dark:text-blue-500" style={{ color: !darkMode ? '#1e3a8a' : undefined }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-20 stroke-current dark:text-blue-500" cx="12" cy="12" r="10" strokeWidth="3" style={{ color: !darkMode ? '#1e3a8a' : undefined }}></circle>
                                            <path className="opacity-100 fill-current dark:text-blue-500" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" style={{ color: !darkMode ? '#1e3a8a' : undefined }}></path>
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center dark:text-blue-500" style={{ color: !darkMode ? '#1e3a8a' : undefined }}>
                                            <Sparkles size={18} />
                                        </div>
                                    </div>

                                    <h3 className={`text-lg font-semibold tracking-tight mb-2 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                        {t('transcription.transcribingMeeting')}{dots}
                                    </h3>

                                    <p className={`text-xs font-medium mb-8 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {stepLabel}
                                    </p>

                                    {/* Subtle Progress Bar */}
                                    <div className="w-full">
                                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-2 px-1">
                                            <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>Progress</span>
                                            <span className="dark:text-blue-400" style={{ color: !darkMode ? '#1e3a8a' : undefined }}>{progress}%</span>
                                        </div>
                                        <div className={`h-1.5 w-full rounded-full overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                                            <div
                                                className="h-full rounded-full transition-all duration-700 ease-out dark:bg-blue-500"
                                                style={{ width: `${progress}%`, backgroundColor: !darkMode ? '#1e3a8a' : undefined }}
                                            />
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className={`mt-8 pt-4 w-full border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                        <button
                                            onClick={handleCancelAiProcessing}
                                            className={`text-xs font-semibold hover:text-red-500 transition-colors w-full py-2 flex items-center justify-center gap-1.5 ${darkMode ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}
                                        >
                                            <X size={14} />
                                            {t('transcription.cancelTranscription')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : aiError ? (
                        <div className="absolute inset-0 flex items-center justify-center p-8">
                            <div className={`rounded-2xl border p-10 max-w-md w-full text-center shadow-lg ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                                <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
                                <h2 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('transcription.processingFailed')}</h2>
                                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{aiError}</p>
                            </div>
                        </div>
                    ) : loading ? (
                        <div className="h-full flex flex-col gap-8 w-full animate-pulse p-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex md:flex-row flex-col gap-6 w-full">
                                    <div className="w-32 flex-shrink-0 pt-1">
                                        <div className={`h-6 w-16 rounded-md mb-2 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                                        <div className={`h-3 w-24 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                                    </div>
                                    <div className={`flex-1 rounded-2xl p-5 ${darkMode ? 'bg-gray-800/50' : 'bg-gray-100'}`}>
                                        <div className={`h-4 w-full rounded mb-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                                        <div className={`h-4 w-[90%] rounded mb-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                                        <div className={`h-4 w-[75%] rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="h-full flex items-center justify-center min-h-[400px]">
                            <ErrorState message={error} onRetry={() => window.location.reload()} />
                        </div>
                    ) : safeTranscript.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            {t('transcription.noTranscript')}
                        </div>
                    ) : (
                        filteredTranscript.map((segment, index) => {
                            const startSec = parseTimeToSeconds(segment.timeStart);
                            const endSec = parseTimeToSeconds(segment.timeEnd);
                            const isActive = currentTimeSec >= startSec && currentTimeSec < endSec;
                            
                            return (
                            <div key={segment.id || `seg-${index}`} className={`group relative mb-8 pl-4 transition-all duration-300 ${isActive ? 'border-l-4 border-blue-500' : 'border-l-4 border-transparent hover:border-gray-200 dark:hover:border-gray-700'}`}>
                                <div className="flex md:flex-row flex-col gap-6">
                                    <div 
                                        className="w-32 flex-shrink-0 pt-1 cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => handleSegmentClick(segment)}
                                        title="Click to jump to this moment in audio"
                                    >
                                        {inlineSpeakerEdit.segmentId === segment.id ? (
                                            <input
                                                type="text"
                                                value={inlineSpeakerEdit.draft}
                                                autoFocus
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => handleInlineSpeakerChange(e.target.value)}
                                                onBlur={commitInlineSpeakerEdit}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        commitInlineSpeakerEdit();
                                                    }
                                                    if (e.key === 'Escape') {
                                                        e.preventDefault();
                                                        cancelInlineSpeakerEdit();
                                                    }
                                                }}
                                                className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wide inline-block mb-1.5 border min-w-[110px] ${darkMode ? 'border-blue-500/60 bg-gray-900 text-blue-200 shadow-[0_0_0_2px_rgba(59,130,246,0.15)]' : 'border-blue-300 bg-white text-blue-900 shadow-[0_0_0_2px_rgba(59,130,246,0.12)]'} focus:outline-none focus:ring-2 focus:ring-blue-500/30`}
                                            />
                                        ) : (
                                            <span
                                                className="px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wide inline-block mb-1.5 cursor-text"
                                                style={{ backgroundColor: (segment.speakerColor || '#3B82F6') + '15', color: segment.speakerColor || '#3B82F6' }}
                                                title="Click to rename speaker"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    startInlineSpeakerEdit(segment);
                                                }}
                                            >
                                                {segment.speaker || 'Unknown'}
                                            </span>
                                        )}
                                        <p className={`text-[10px] font-mono ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                            {formatTime(parseTimeToSeconds(segment.timeStart))} - {formatTime(parseTimeToSeconds(segment.timeEnd))}
                                        </p>
                                    </div>
                                    <div className={`flex-1 rounded-2xl p-5 relative transition-all duration-300 ${isActive ? (darkMode ? 'bg-blue-900/20 border border-blue-500/50' : 'bg-blue-50 border border-blue-300') : (darkMode ? 'hover:bg-gray-800 border border-transparent' : 'hover:bg-white hover:shadow-md border border-transparent')}`}>
                                        {editingSegmentId === segment.id ? (
                                            <div className="pt-2">
                                                <textarea 
                                                    ref={editTextAreaRef} 
                                                    value={editedText} 
                                                    onChange={autoResize} 
                                                    className={`w-full p-4 rounded-xl resize-none outline-none focus:outline-none focus:ring-2 focus:border-transparent text-[15px] leading-7 transition-all ${darkMode ? 'bg-gray-800/40 text-gray-200 border border-gray-700/50 focus:ring-blue-900/40' : 'bg-white text-gray-800 shadow-sm border border-gray-100 focus:ring-blue-100/50'}`} 
                                                    autoFocus 
                                                />
                                                <div className="flex justify-end gap-2 mt-4">
                                                    <button onClick={handleEditCancel} className="text-xs font-medium px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">{t('common.cancel')}</button>
                                                    <button onClick={handleEditSave} className="bg-blue-900 text-white px-4 py-1.5 rounded-md text-xs font-bold hover:bg-blue-800 transition-colors shadow-sm">{t('common.save')}</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <p 
                                                    className={`text-[15px] leading-7 cursor-text ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
                                                    onClick={(e) => handleEditStart(segment, e)}
                                                    title="Click text to edit"
                                                >
                                                    {highlightText(segment.text, searchQuery)}
                                                </p>
                                                {!hideActions && (
                                                    <div className="mt-3 flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                        <button 
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'}`}
                                                            onClick={() => handleDelete(segment.id)}
                                                            title="Delete segment"
                                                        >
                                                            <Trash2 size={14} /> {t('common.delete')}
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                        })
                    )}
                </div>

                {/* Stats footer */}
                {!isAiProcessing && safeTranscript.length > 0 && (
                    <div className={`border-t transition-colors duration-300 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>

                        {/* ── Global totals bar ── */}
                        <div className={`px-8 py-3 flex items-center justify-between`}>
                            {/* Left: stats */}
                            <div className="flex items-center gap-6">
                                {/* words */}
                                <div className="flex items-center gap-2">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                                        <FileText size={13} className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
                                    </div>
                                    <div>
                                        <p className={`text-sm font-bold leading-none ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{totalWords.toLocaleString()}</p>
                                        <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('transcription.words')}</p>
                                    </div>
                                </div>
                                {/* duration */}
                                <div className="flex items-center gap-2">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                                        <Mic2 size={13} className={darkMode ? 'text-purple-400' : 'text-purple-600'} />
                                    </div>
                                    <div>
                                        <p className={`text-sm font-bold leading-none ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{formatTime(totalDuration)}</p>
                                        <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>durée</p>
                                    </div>
                                </div>
                                {/* speakers */}
                                <div className="flex items-center gap-2">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${darkMode ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
                                        <Users size={13} className={darkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                                    </div>
                                    <div>
                                        <p className={`text-sm font-bold leading-none ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{uniqueSpeakers.length}</p>
                                        <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('transcription.intervenants')}</p>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className={`w-px h-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

                                {/* Toggle per-speaker */}
                                <button
                                    onClick={() => setShowSpeakerStats(v => !v)}
                                    className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all ${
                                        showSpeakerStats
                                            ? (darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-700')
                                            : (darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-50 text-gray-500')
                                    }`}
                                    title="Voir la répartition par intervenant"
                                >
                                    <Users size={12} />
                                    {t('transcription.perSpeaker')}
                                    {showSpeakerStats
                                        ? <ChevronUp size={13} className="ml-0.5" />
                                        : <ChevronDown size={13} className="ml-0.5" />}
                                </button>
                            </div>

                            {/* Right: deep-analysis link */}
                            <button
                                onClick={() => navigate('/analytics')}
                                className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                                    darkMode
                                        ? 'border-blue-800/60 bg-blue-900/20 text-blue-400 hover:bg-blue-900/40'
                                        : 'border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100'
                                }`}
                                title="Analyse comportementale approfondie"
                            >
                                <BarChart2 size={13} />
                                {t('transcription.deepAnalysis')}
                            </button>
                        </div>

                        {/* ── Per-speaker collapsible grid ── */}
                        {showSpeakerStats && (
                            <div className={`px-8 pb-4 border-t ${darkMode ? 'border-gray-800/60' : 'border-gray-100'}`}>
                                <p className={`text-[10px] font-semibold uppercase tracking-wider mt-3 mb-2.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('transcription.participationPerSpeaker')}</p>
                                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(uniqueSpeakers.length, 3)}, 1fr)` }}>
                                    {uniqueSpeakers.map((speaker) => {
                                        const color = speakerColorMap[speaker] || '#3B82F6';
                                        const stats = speakerStats[speaker] || { words: 0, duration: 0 };
                                        const wordPct = totalWords > 0 ? Math.round((stats.words / totalWords) * 100) : 0;
                                        const durPct = totalDuration > 0 ? Math.round((stats.duration / totalDuration) * 100) : 0;
                                        return (
                                            <div
                                                key={speaker}
                                                className={`rounded-xl border px-4 py-3 transition-colors ${
                                                    darkMode ? 'border-gray-800 bg-gray-800/30 hover:bg-gray-800/60' : 'border-gray-100 bg-gray-50/80 hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 mb-3">
                                                    <div
                                                        className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 select-none"
                                                        style={{ backgroundColor: color + '20', color }}
                                                    >
                                                        {speaker.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className={`text-xs font-bold truncate ${darkMode ? 'text-gray-200' : 'text-gray-700'}`} title={speaker}>
                                                        {speaker}
                                                    </span>
                                                </div>
                                                {/* Words bar */}
                                                <div className="mb-2">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('transcription.words')}</span>
                                                        <span className={`text-[10px] font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                            {stats.words.toLocaleString()} <span style={{ color }}>({wordPct}%)</span>
                                                        </span>
                                                    </div>
                                                    <div className={`h-1.5 w-full rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${wordPct}%`, backgroundColor: color }} />
                                                    </div>
                                                </div>
                                                {/* Duration bar */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('transcription.duration')}</span>
                                                        <span className={`text-[10px] font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                            {formatTime(stats.duration)} <span style={{ color }}>({durPct}%)</span>
                                                        </span>
                                                    </div>
                                                    <div className={`h-1.5 w-full rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${durPct}%`, backgroundColor: color, opacity: 0.7 }} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TranscriptionView;
