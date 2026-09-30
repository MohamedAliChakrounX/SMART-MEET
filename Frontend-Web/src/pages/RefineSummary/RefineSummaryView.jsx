import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import {
    CheckCircle2,
    ListTodo,
    Download,
    Save,
    FileText,
    Users,
    Share2,
    Calendar,
    MapPin,
    Hash,
    Clock,
    Plus,
    Trash2,
    Edit3,
    RefreshCw,
    ChevronRight,
    ChevronLeft,
    Globe,
    Sparkles,
    Check,
    X,
    BarChart2,
    AlignLeft
} from 'lucide-react';
import Button from '../../components/Button/Button';
import { useMeeting } from '../../context/MeetingContext';
import { useI18n } from '../../i18n/useI18n';
import Loader from '../../components/Loader/Loader';
import ExportSidebar from './components/ExportSidebar';
import useNavigationGuard from '../../hooks/useNavigationGuard';

const sections = [
    { id: 'meeting-info', label: 'Meeting Info', icon: Calendar },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'points', label: 'Key Points', icon: FileText },
    { id: 'distribution', label: 'Distribution', icon: Share2 },
    { id: 'actions', label: 'Actions', icon: ListTodo },
];

// Défini en dehors du composant pour avoir une référence stable (utilisé dans les comparaisons)
const DEFAULT_GEN_SETTINGS = {
    model: 'mistral:7b-instruct-q4_K_M',
    language: 'default',  // 'default' means: use the transcript language from backend
    format: 'standard',   // 'court' | 'standard' | 'detaille'
};

const SectionHeader = ({ icon: Icon, title, darkMode }) => (
    <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800 text-blue-400' : 'bg-blue-50 text-blue-900'}`}>
            <Icon size={20} />
        </div>
        <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
    </div>
);

const StatusBadge = ({ status }) => {
    let colorClass = "bg-gray-100 text-gray-600";
    if (status === 'Fait' || status === 'Terminé') colorClass = "bg-green-100 text-green-700";
    if (status === 'En cours') colorClass = "bg-blue-100 text-blue-700";
    if (status === 'Majeure' || status === 'Haute') colorClass = "bg-red-100 text-red-700";
    if (status === 'Moyenne') colorClass = "bg-orange-100 text-orange-700";
    if (status === 'Mineure' || status === 'Basse') colorClass = "bg-emerald-100 text-emerald-700";

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
            {status}
        </span>
    );
};

const VerticalProgressNav = ({ sections, activeSection, scrollToSection, darkMode }) => (
    <div className="relative flex flex-col gap-0 py-2">
        <div className={`absolute top-0 bottom-0 left-[15px] w-0.5 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} -z-0`}></div>
        {(() => {
            const currentIndex = sections.findIndex(s => s.id === activeSection);
            return (
                <div
                    className="absolute top-0 left-[15px] w-0.5 bg-blue-900 transition-all duration-500 ease-in-out z-0"
                    style={{ height: currentIndex >= 0 ? `${(currentIndex * (100 / (sections.length - 1)))}%` : '0%' }}
                ></div>
            );
        })()}

        {sections.map((section, idx) => {
            const isActive = activeSection === section.id;
            const sectionIndex = sections.findIndex(s => s.id === section.id);
            const activeIndex = sections.findIndex(s => s.id === activeSection);
            const isCompleted = sectionIndex < activeIndex;

            return (
                <div key={section.id} className="relative z-10 flex items-center gap-4 py-4 group cursor-pointer"
                    onClick={() => scrollToSection(section.id)}>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 ${isActive
                        ? 'bg-blue-900 border-blue-900 text-white scale-110 shadow-lg shadow-blue-900/20 rotate-[360deg]'
                        : isCompleted
                            ? 'bg-blue-100 border-blue-100 text-blue-900'
                            : (darkMode ? 'bg-gray-900 border-gray-700 text-gray-600' : 'bg-white border-gray-100 text-gray-300')
                        }`}>
                        {isCompleted ? <CheckCircle2 size={16} /> : <section.icon size={16} />}
                    </div>
                    <div className="flex flex-col">
                        <span className={`text-xs font-bold uppercase tracking-widest transition-colors duration-200 ${isActive ? 'text-blue-900' : (darkMode ? 'text-gray-500' : 'text-gray-400')
                            }`}>
                            {section.label}
                        </span>
                    </div>
                    {isActive && (
                        <div className="absolute -left-4 w-1 h-6 bg-blue-900 rounded-r-full shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
                    )}
                </div>
            );
        })}
    </div>
);

const RefineSummaryView = ({ meetingId, hideSidebar, isEmbedded = false, onNavigate }) => {
    const navigate = useNavigate();
    const { summary, fetchSummary, fetchSummaryStatus, updateSummary, setSummary, generateSummary, translateSummary, currentMeeting, fetchMeeting, darkMode, sidebarWidth, sidebarWidthReadonly, currentMeetingId, transcript, persistToDatabase, fetchAnalytics, analyticsData, audioFile } = useMeeting();

    const { t } = useI18n();

    const go = (target) => {
        if (isEmbedded && onNavigate) {
            onNavigate(target);
        } else {
            if (target === 'back') navigate('/archive');
            else if (target === 'analytics') navigate('/analytics');
            else if (target === 'transcription') navigate('/transcription');
        }
    };


    const effectiveMeetingId = meetingId || currentMeeting?.id || 1;
    const speakerRenameMap = React.useMemo(() => {
        if (!effectiveMeetingId) return {};
        try {
            const raw = localStorage.getItem(`meeting_speaker_rename_map_${effectiveMeetingId}`);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }, [effectiveMeetingId]);
    const applySpeakerRename = React.useCallback((name) => {
        if (!name) return name;
        return speakerRenameMap?.[name] || name;
    }, [speakerRenameMap]);
    const getMeetingDateForPersistence = React.useCallback(() => {
        const meetingDate =
            currentMeeting?.startAt ||
            currentMeeting?.date ||
            currentMeeting?.meetingDate ||
            currentMeeting?.scheduledAt ||
            currentMeeting?.recordedAt ||
            currentMeeting?.audioRecordedAt ||
            currentMeeting?.uploadedAt ||
            currentMeeting?.audioUploadedAt ||
            null;
        if (meetingDate) return meetingDate;

        const rawAudioDate =
            audioFile?.file?.lastModified ??
            audioFile?.lastModified ??
            audioFile?.audioCreatedAt ??
            audioFile?.uploadedAt ??
            null;
        if (!rawAudioDate) return new Date().toISOString();

        if (typeof rawAudioDate === 'number') {
            const parsed = new Date(rawAudioDate);
            return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
        }

        const parsed = new Date(rawAudioDate);
        return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
    }, [currentMeeting, audioFile]);

    // UI State
    const [activeSection, setActiveSection] = useState('meeting-info');
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const isScrollingRef = React.useRef(false);
    const mainContentRef = React.useRef(null);

    // Generation Settings State
    const [genSettings, setGenSettings] = useState(DEFAULT_GEN_SETTINGS);
    const [hasChanges, setHasChanges] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateError, setGenerateError] = useState(null);
    const [pvProgress, setPvProgress] = useState(0);
    const [pvStep, setPvStep] = useState('');
    
    // Translation State
    const [isTranslating, setIsTranslating] = useState(false);
    const [translateError, setTranslateError] = useState(null);

    // Validation State
    const [isValidated, setIsValidated] = useState(false);
    const [pvHasChanges, setPvHasChanges] = useState(false);
    const [initialPvData, setInitialPvData] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);

    const [searchParams, setSearchParams] = useSearchParams();
    const [isFirstLoadGeneration, setIsFirstLoadGeneration] = useState(false);
    const hasFetchedRef = React.useRef(false);
    const hasPersistedRef = React.useRef(false); // prevent double-persist

    // Guard: warn before leaving if user hasn't validated yet
    useNavigationGuard(
        () => !isValidated && !hideSidebar,
        t('pv.exitWarning')
    );

    // PV Data State
    const [pvData, setPvData] = useState({
        meta: {
            version: '01',
            date: new Date().toLocaleDateString('fr-FR'),
            code: 'FOR-01-SFM-2025'
        },
        type: 'Interne',
        date: '',
        location: '',
        title: '',
        summary: '',
        participants: [],
        points: [],
        distribution: [],
        actions: []
    });

    useEffect(() => {
        const isDirty = JSON.stringify(genSettings) !== JSON.stringify(DEFAULT_GEN_SETTINGS);
        setHasChanges(isDirty);
    }, [genSettings]);

    // Sync language selector to the transcript language when we receive it
    useEffect(() => {
        if (currentMeeting?.language) {
            setGenSettings(prev => ({
                ...prev,
                language: currentMeeting.language.toUpperCase()
            }));
        }
    }, [currentMeeting?.language]);

    useEffect(() => {
        if (initialPvData && isValidated) {
            const hasChanged = JSON.stringify(pvData) !== JSON.stringify(initialPvData);
            setPvHasChanges(hasChanged);
        }
    }, [pvData, initialPvData, isValidated]);

    useEffect(() => {
        if (effectiveMeetingId && !hasFetchedRef.current) {
            hasFetchedRef.current = true;
            fetchMeeting(effectiveMeetingId);
            fetchAnalytics(effectiveMeetingId); // Ensure analytics are loaded for persistence

            if (searchParams.get('autoGenerate') === 'true') {
                setIsFirstLoadGeneration(true);
                searchParams.delete('autoGenerate');
                setSearchParams(searchParams, { replace: true });

                // Use 'default' so the backend resolves the language from the transcript.
                // We do NOT wait for currentMeeting here because it may not be loaded yet.
                generateSummary(effectiveMeetingId, {
                    model: genSettings.model || DEFAULT_GEN_SETTINGS.model,
                    language: 'default',
                    format: genSettings.format || DEFAULT_GEN_SETTINGS.format,
                });
                setIsGenerating(true);
                setPvProgress(0);
                setPvStep('Initialisation...');
            } else {
                // Fetch the existing summary first.
                // If none exists (new AI meeting), auto-trigger generation.
                fetchSummary(effectiveMeetingId).then((result) => {
                    const isAiMeeting = Number(effectiveMeetingId) >= 100_000;
                    const isEmpty = !result || !result.success || !result.data;
                    if (isAiMeeting && isEmpty) {
                        setIsFirstLoadGeneration(true);
                        generateSummary(effectiveMeetingId, {
                            model: genSettings.model || DEFAULT_GEN_SETTINGS.model,
                            language: 'default',
                            format: genSettings.format || DEFAULT_GEN_SETTINGS.format,
                        });
                        setIsGenerating(true);
                        setPvProgress(0);
                        setPvStep('Initialisation...');
                    }
                });
            }
        }
    }, [effectiveMeetingId, searchParams, setSearchParams, generateSummary, genSettings, fetchMeeting, fetchSummary]);

    // Polling Effect for PV Generation Progress
    useEffect(() => {
        let intervalId;
        if (isGenerating) {
            intervalId = setInterval(async () => {
                const result = await fetchSummaryStatus(effectiveMeetingId);
                if (result.success && result.data) {
                    const data = result.data;
                    setPvProgress(data.progress || 0);
                    if (data.step) setPvStep(data.step);

                    if (data.status === 'done' && data.pv) {
                        clearInterval(intervalId);
                        localStorage.removeItem(`meeting_pv_data_${effectiveMeetingId}`);
                        const s = data.pv;
                        setSummary(s);
                        const builtPvData = {
                            title: s.title || '',
                            summary: s.content?.executiveOverview || '',
                            participants: (s.participants || []).map(p => ({
                                name: applySpeakerRename(typeof p === 'string' ? p : (p.name || '')),
                                function: p.function || p.role || 'Participant',
                                present: true,
                                signature: '',
                                comment: ''
                            })),
                            points: s.content?.keyDecisions || [],
                            distribution: (s.participants || []).map(p =>
                                applySpeakerRename(typeof p === 'string' ? p : (p.name || ''))
                            ),
                            actions: (s.content?.nextSteps || []).map(step => ({
                                action: step.task || '',
                                responsible: step.owner || 'TBD',
                                priority: 'Majeure',
                                dueDate: step.due || '',
                                efficiency: '',
                                status: step.completed ? 'Fait' : 'En cours'
                            })),
                            meta: {
                                ...pvData.meta,
                                date: new Date().toLocaleDateString('fr-FR')
                            }
                        };
                        setPvData(prev => ({ ...prev, ...builtPvData }));
                        setIsInitialized(true);
                        setIsGenerating(false);
                        setIsFirstLoadGeneration(false);

                        // Persist to PostgreSQL (once only)
                        if (!hasPersistedRef.current) {
                            hasPersistedRef.current = true;
                            const rawMap = localStorage.getItem('meeting_project_map');
                            const meetingProjectMap = rawMap ? JSON.parse(rawMap) : {};
                            const mappedProjectId = meetingProjectMap[String(effectiveMeetingId)]?.projectId || null;
                            persistToDatabase({
                                title: s.title || currentMeeting?.title || 'Réunion IA',
                                description: s.content?.executiveOverview || null,
                                date: getMeetingDateForPersistence(),
                                durationMinutes: currentMeeting?.durationMinutes || 0,
                                participants: (s.participants || []).map(p => applySpeakerRename(typeof p === 'string' ? p : (p.name || ''))),
                                transcript: Array.isArray(transcript) ? transcript : [],
                                summary: s,
                                decisions: s.content?.keyDecisions || [],
                                actionItems: (s.content?.nextSteps || []).map(step => ({
                                    action: step.task || '',
                                    responsible: step.owner || 'TBD',
                                    dueDate: step.due || '',
                                    status: step.completed ? 'Fait' : 'En cours'
                                })),
                                analytics: analyticsData,
                                projectId: mappedProjectId || localStorage.getItem('selected_project_id') || null
                            }).then(res => {
                                if (res.success) {
                                    console.log('[RefineSummary] ✅ Meeting saved to database:', res.data?.meetingId);
                                } else {
                                    console.warn('[RefineSummary] ⚠️ Could not persist to DB:', res.error);
                                }
                            });
                        }
                    } else if (data.status === 'error') {
                        clearInterval(intervalId);
                        setGenerateError(data.error);
                        setIsGenerating(false);
                        setIsFirstLoadGeneration(false);
                    }
                }
            }, 2500); // Verify every 2.5s
        }
        return () => clearInterval(intervalId);
    }, [isGenerating, effectiveMeetingId, fetchSummaryStatus, getMeetingDateForPersistence]);


    useEffect(() => {
        if (!mainContentRef.current) return;
        const observerOptions = {
            root: mainContentRef.current,
            rootMargin: '-10% 0px -70% 0px',
            threshold: 0
        };

        const observerCallback = (entries) => {
            if (isScrollingRef.current) return;
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id);
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);

        sections.forEach((section) => {
            const element = document.getElementById(section.id);
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, [sections]);

    useEffect(() => {
        setIsInitialized(false);
    }, [effectiveMeetingId]);

    useEffect(() => {
        if (isInitialized) return;
        // Don't initialize pvData with empty data while AI is generating
        if (isGenerating || isFirstLoadGeneration) return;

        const savedPvData = localStorage.getItem(`meeting_pv_data_${effectiveMeetingId}`);
        if (savedPvData) {
            setPvData(JSON.parse(savedPvData));
            setIsInitialized(true);
            return;
        }

        // Only initialize if summary has real content (not an empty {} from 404)
        const hasSummaryContent = summary && (summary.title || summary.content);
        if (hasSummaryContent && currentMeeting) {
            setPvData(prev => ({
                ...prev,
                meta: {
                    ...prev.meta,
                    date: new Date().toLocaleDateString('fr-FR')
                },
                date: currentMeeting.date || new Date().toLocaleDateString('fr-FR'),
                location: currentMeeting.location || 'SFM-RDC',
                title: summary.title || 'Sujet de la réunion',
                summary: summary.content?.executiveOverview || '',
                participants: currentMeeting.participants?.map(p => ({
                    name: applySpeakerRename(typeof p === 'string' ? p : p.name),
                    function: p.role || 'Participant',
                    present: true,
                    signature: '',
                    comment: ''
                })) || [],
                points: summary.content?.keyDecisions || [],
                distribution: currentMeeting.participants?.map(p => applySpeakerRename(typeof p === 'string' ? p : p.name)) || [],
                actions: summary.content?.nextSteps?.map(step => ({
                    action: step.task,
                    responsible: step.owner || 'TBD',
                    priority: 'Majeure',
                    dueDate: step.due || '',
                    efficiency: '',
                    status: step.completed ? 'Fait' : 'En cours'
                })) || []
            }));
            setIsInitialized(true);
        }
    }, [summary, currentMeeting, effectiveMeetingId, isInitialized, isGenerating, isFirstLoadGeneration, applySpeakerRename]);

    const handleValidate = async () => {
        await handleSave();
        setInitialPvData(JSON.parse(JSON.stringify(pvData)));
        setIsValidated(true);
        setPvHasChanges(false);
    };

    const handleSave = async () => {
        try {
            localStorage.setItem(`meeting_pv_data_${effectiveMeetingId}`, JSON.stringify(pvData));
            const updatedSummary = { ...summary, pvData };
            localStorage.setItem(`meeting_summary_${effectiveMeetingId}`, JSON.stringify(updatedSummary));
            setSummary(updatedSummary);

            // Persist the changes to the database
            const contentUpdate = {
                ...summary,
                content: {
                    ...(summary.content || {}),
                    pvData: pvData
                }
            };
            await updateSummary(effectiveMeetingId, contentUpdate);

            setShowSaveSuccess(true);
            setTimeout(() => setShowSaveSuccess(false), 3000);
        } catch (error) {
            console.error('Failed to save:', error);
        }
    };

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            isScrollingRef.current = true;
            setActiveSection(id);
            element.scrollIntoView({ behavior: 'smooth' });
            setTimeout(() => {
                isScrollingRef.current = false;
            }, 800);
        }
    };

    if (isFirstLoadGeneration) {
        return (
            <div className={`flex flex-col h-screen overflow-hidden ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
                {!isEmbedded && <Navbar currentStep={3} hideSteps={hideSidebar} />}
                <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                    <div className={`relative z-20 w-full max-w-sm mx-auto rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border backdrop-blur-xl p-8 transform -translate-y-24 transition-all duration-500 ${darkMode ? 'bg-gray-900/80 border-gray-800/80 shadow-black/40' : 'bg-white/80 border-white shadow-blue-900/5'}`}>
                        <div className="flex flex-col items-center text-center w-full">
                            {/* Spinner */}
                            <div className="relative w-14 h-14 mb-6 shrink-0">
                                <svg className="animate-spin w-full h-full dark:text-blue-500" style={{ color: !darkMode ? '#1e3a8a' : undefined }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-20 stroke-current dark:text-blue-500" cx="12" cy="12" r="10" strokeWidth="3" style={{ color: !darkMode ? '#1e3a8a' : undefined }}></circle>
                                    <path className="opacity-100 fill-current dark:text-blue-500" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" style={{ color: !darkMode ? '#1e3a8a' : undefined }}></path>
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center dark:text-blue-500" style={{ color: !darkMode ? '#1e3a8a' : undefined }}>
                                    <Sparkles size={18} />
                                </div>
                            </div>

                            <h3 className={`text-lg font-semibold tracking-tight mb-2 shrink-0 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                {t('pv.generating')}
                            </h3>

                            <p className={`text-xs font-medium mb-8 shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {pvStep || t('pv.aiAnalyzing')}
                            </p>

                            {/* Subtle Progress Bar */}
                            <div className="w-full shrink-0">
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-2 px-1">
                                    <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>Progress</span>
                                    <span className="dark:text-blue-400" style={{ color: !darkMode ? '#1e3a8a' : undefined }}>{pvProgress}%</span>
                                </div>
                                <div className={`h-1.5 w-full rounded-full overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                                    <div
                                        className="h-full rounded-full transition-all duration-700 ease-out dark:bg-blue-500"
                                        style={{ width: `${pvProgress}%`, backgroundColor: !darkMode ? '#1e3a8a' : undefined }}
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className={`mt-8 pt-4 w-full border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                <button
                                    onClick={async () => {
                                        try {
                                            await fetch(`http://localhost:5001/api/meetings/${effectiveMeetingId}`, { method: 'DELETE' });
                                        } catch (e) {
                                            console.error("Failed to cancel PV generation:", e);
                                        }
                                        setIsFirstLoadGeneration(false);
                                        go('transcription');
                                    }}
                                    className={`text-xs font-semibold hover:text-red-500 transition-colors w-full py-2 flex items-center justify-center gap-1.5 ${darkMode ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}
                                >
                                    <X size={14} />
                                    {t('pv.cancelGeneration')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Show loader if summary hasn't been fetched yet OR if it's an empty object (404, nothing generated yet)
    const hasSummaryContent = summary && (summary.title || summary.content);
    if (!hasSummaryContent || !pvData) return <div className="flex h-full items-center justify-center p-20"><Loader size="large" /></div>;

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            {/* Global Navbar */}
            {!isEmbedded && <Navbar currentStep={isValidated ? 4 : 3} hideSteps={hideSidebar} />}

            <div className="flex flex-1 overflow-hidden h-full">
                {/* Left Sidebar */}
                <aside
                    style={{ width: `${hideSidebar ? sidebarWidthReadonly : sidebarWidth}px` }}
                    className={`border-r flex flex-col hidden lg:flex transition-all duration-500 ease-in-out z-20 shadow-xl ${darkMode ? 'bg-gray-900 border-gray-800 shadow-black/20' : 'bg-white border-gray-100 shadow-gray-100/50'}`}
                >

                    <div className="p-8 pb-4 flex flex-col h-full">
                        <div className="mb-10">
                            <button
                                onClick={() => go('back')}
                                className={`flex items-center gap-1 px-2.5 py-1.5 w-full justify-center rounded-xl text-xs font-semibold border transition-all duration-300 transform active:scale-95 group ${
                                    darkMode
                                        ? 'bg-gray-800 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-750 hover:border-gray-650'
                                        : 'bg-white border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 hover:border-slate-350'
                                }`}
                                title={t('pv.backToDashboard')}
                            >
                                <ChevronLeft size={14} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
                                <span>{t('pv.backToDashboard')}</span>
                            </button>
                        </div>

                        <h2 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-10 pl-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            {t('pv.navigation')}
                        </h2>

                        <VerticalProgressNav
                            sections={sections}
                            activeSection={activeSection}
                            scrollToSection={scrollToSection}
                            darkMode={darkMode}
                        />

                        {/* Analytics shortcut */}
                        {!hideSidebar && (
                            <div className={`mt-6 pt-5 border-t ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                <div
                                    onClick={() => go('analytics')}
                                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer transition-all duration-200 group
                                        ${darkMode
                                            ? 'bg-blue-900/20 border border-blue-800/40 hover:bg-blue-900/40 hover:border-blue-700/60'
                                            : 'bg-blue-50 border border-blue-100 hover:bg-blue-100 hover:border-blue-200'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
                                        ${darkMode ? 'bg-blue-800/60 text-blue-300' : 'bg-blue-100 text-blue-900'}`}>
                                        <BarChart2 size={15} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className={`text-xs font-bold truncate leading-tight ${darkMode ? 'text-blue-300' : 'text-blue-900'}`}>
                                            {t('pv.behavioralAnalysis')}
                                        </span>
                                        <span className={`text-[10px] ${darkMode ? 'text-blue-500' : 'text-blue-400'}`}>
                                            {t('pv.viewInsights')}
                                        </span>
                                    </div>
                                    <ChevronRight size={14} className={`ml-auto flex-shrink-0 group-hover:translate-x-0.5 transition-transform ${darkMode ? 'text-blue-500' : 'text-blue-400'}`} />
                                </div>
                            </div>
                        )}

                        {hideSidebar && (
                            <div className="mt-auto pt-8 border-t border-gray-100/10">
                                <div className={`p-4 rounded-2xl ${darkMode ? 'bg-blue-900/10 border border-blue-500/10' : 'bg-blue-50/50 border border-blue-100'}`}>
                                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-900'}`}>{t('pv.readMode')}</p>
                                    <p className={`text-[11px] leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {t('pv.readModeDesc')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>
                {/* Main Content */}
                <main ref={mainContentRef} className={`flex-1 overflow-y-auto p-12 lg:p-20 scroll-smooth transition-colors duration-500 no-scrollbar ${darkMode ? 'bg-gray-950' : 'bg-gray-100/50'}`}>
                    <div className="max-w-4xl mx-auto space-y-12 pb-24">
                        {/* Main Content Area */}
                        <div className={`${hideSidebar ? (darkMode ? 'bg-gray-800/50 shadow-2xl' : 'bg-white shadow-3xl shadow-gray-200/50 ring-1 ring-gray-100') : 'space-y-12'} rounded-3xl overflow-hidden transition-all duration-700`}>

                            {/* HEADER SECTION */}
                            <div className={`p-10 ${hideSidebar ? 'border-b' : (darkMode ? 'bg-gray-800 border-gray-700 shadow-xl' : 'bg-white border-gray-100 shadow-xl')} ${!hideSidebar ? 'rounded-2xl border' : ''}`}>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-gray-100 pb-8">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-900'}`}>
                                                {t('pv.officialDocument')}
                                            </span>
                                            <span className="text-gray-300">|</span>
                                            <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                Réf: {pvData.meta.code}
                                            </span>
                                        </div>
                                        <h1 className={`text-3xl font-bold tracking-tight mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                            {t('pv.title')}
                                        </h1>
                                        <div className="flex gap-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={14} />
                                                <span>{pvData.meta.date}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={14} />
                                                <span>Version {pvData.meta.version}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className={`p-4 rounded-xl border flex flex-col items-center justify-center w-24 ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                                            <span className="text-2xl font-black text-blue-900">SFM</span>
                                        </div>
                                    </div>
                                </div>

                                <div id="meeting-info" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                    <div className={`p-4 rounded-xl border transition-all hover:shadow-md ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'}`}>
                                        <div className="flex items-center gap-2 mb-2 text-gray-400">
                                            <Hash size={14} />
                                            <span className="text-xs font-bold uppercase tracking-wider">Type</span>
                                        </div>
                                        <input value={pvData.type} onChange={e => setPvData({ ...pvData, type: e.target.value })} className="w-full bg-transparent font-semibold outline-none" />
                                    </div>
                                    <div className={`p-4 rounded-xl border transition-all hover:shadow-md ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'}`}>
                                        <div className="flex items-center gap-2 mb-2 text-gray-400">
                                            <Calendar size={14} />
                                            <span className="text-xs font-bold uppercase tracking-wider">Date</span>
                                        </div>
                                        <input value={pvData.date} onChange={e => setPvData({ ...pvData, date: e.target.value })} className="w-full bg-transparent font-semibold outline-none" />
                                    </div>
                                    <div className={`p-4 rounded-xl border transition-all hover:shadow-md col-span-2 ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'}`}>
                                        <div className="flex items-center gap-2 mb-2 text-gray-400">
                                            <MapPin size={14} />
                                            <span className="text-xs font-bold uppercase tracking-wider">Lieu</span>
                                        </div>
                                        <input value={pvData.location} onChange={e => setPvData({ ...pvData, location: e.target.value })} className="w-full bg-transparent font-semibold outline-none" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6 mb-6">
                                    <div className={`p-6 rounded-xl border ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                                        <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('pv.subject')}</h3>
                                        <input value={pvData.title} onChange={(e) => setPvData({ ...pvData, title: e.target.value })} className={`w-full bg-transparent text-xl font-bold outline-none leading-relaxed ${darkMode ? 'text-white' : 'text-gray-900'}`} placeholder="Titre..." />
                                    </div>
                                    <div className={`p-6 rounded-xl border ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                                        <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('pv.executiveOverview')}</h3>
                                        <textarea value={pvData.summary} onChange={(e) => setPvData({ ...pvData, summary: e.target.value })} ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }} className={`w-full bg-transparent text-base font-medium outline-none resize-none leading-relaxed overflow-hidden ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} rows={1} placeholder="Résumé..." />
                                    </div>
                                </div>
                            </div>

                            {/* CONTENT SECTIONS */}
                            <div className={`${hideSidebar ? 'space-y-12 p-10 pt-12' : 'space-y-12'}`}>
                                {/* PARTICIPANTS */}
                                <div id="participants" className={`rounded-2xl border p-8 transition-colors duration-300 ${hideSidebar ? (darkMode ? 'bg-gray-800/20 border-gray-700' : 'bg-gray-50/50 border-gray-100') : (darkMode ? 'bg-gray-800 border-gray-700 shadow-xl' : 'bg-white border-gray-100 shadow-xl')}`}>
                                    <SectionHeader icon={Users} title="Participants" darkMode={darkMode} />
                                    <div className={`overflow-hidden rounded-xl border ${darkMode ? 'border-gray-700 bg-gray-900/50' : 'border-gray-100 bg-white'}`}>
                                        <table className="w-full text-sm text-left">
                                            <thead className={`text-xs uppercase ${darkMode ? 'text-gray-400 bg-gray-900/80' : 'bg-gray-50/50 text-gray-500'}`}>
                                                <tr>
                                                    <th className="px-6 py-4 font-semibold">{t('pv.name')}</th>
                                                    <th className="px-6 py-4 font-semibold">{t('pv.function')}</th>
                                                    <th className="px-6 py-4 font-semibold text-center">{t('pv.presence')}</th>
                                                    <th className="px-6 py-4 font-semibold">{t('pv.comment')}</th>
                                                    <th className="px-4 py-4 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                                {(pvData.participants || []).map((p, idx) => (
                                                    <tr key={idx} className={`group transition-colors ${darkMode ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50/50'}`}>
                                                        <td className="px-6 py-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                                                    {p.name?.substring(0, 2).toUpperCase() || '??'}
                                                                </div>
                                                                <input value={p.name} onChange={(e) => {
                                                                    const newP = [...pvData.participants];
                                                                    newP[idx].name = e.target.value;
                                                                    setPvData({ ...pvData, participants: newP });
                                                                }} className={`bg-transparent font-medium outline-none w-full ${darkMode ? 'text-gray-200' : 'text-gray-800'}`} />
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <input value={p.function} onChange={(e) => {
                                                                const newP = [...pvData.participants];
                                                                newP[idx].function = e.target.value;
                                                                setPvData({ ...pvData, participants: newP });
                                                            }} className={`bg-transparent outline-none w-full ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                                        </td>
                                                        <td className="px-6 py-3 text-center">
                                                            <div 
                                                                onClick={() => {
                                                                    const newP = [...pvData.participants];
                                                                    newP[idx].present = !newP[idx].present;
                                                                    setPvData({ ...pvData, participants: newP });
                                                                }}
                                                                className={`w-6 h-6 rounded border-2 mx-auto cursor-pointer transition-all flex items-center justify-center ${
                                                                    p.present 
                                                                        ? 'bg-blue-900 border-blue-900 text-white shadow-sm' 
                                                                        : (darkMode ? 'border-gray-700 hover:border-blue-500 hover:bg-blue-900/20' : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50')
                                                                }`}
                                                            >
                                                                {p.present && <Check size={14} strokeWidth={3} />}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <input value={p.comment} onChange={(e) => {
                                                                const newP = [...pvData.participants];
                                                                newP[idx].comment = e.target.value;
                                                                setPvData({ ...pvData, participants: newP });
                                                            }} className={`bg-transparent outline-none w-full italic ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {!hideSidebar && (
                                        <button onClick={() => setPvData({ ...pvData, participants: [...pvData.participants, { name: '', function: 'Rôle', present: true, signature: '', comment: '' }] })} className="mt-4 flex items-center gap-2 text-sm text-blue-900 font-medium hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 w-fit">
                                            <Plus size={16} /> {t('pv.addParticipant')}
                                        </button>
                                    )}
                                </div>

                                {/* POINTS ABORDES */}
                                <div id="points" className={`rounded-2xl border p-8 transition-colors duration-300 ${hideSidebar ? (darkMode ? 'bg-gray-800/20 border-gray-700' : 'bg-gray-50/50 border-gray-100') : (darkMode ? 'bg-gray-800 border-gray-700 shadow-xl' : 'bg-white border-gray-100 shadow-xl')}`}>
                                    <SectionHeader icon={ListTodo} title="Points Abordés" darkMode={darkMode} />
                                    <div className="space-y-4">
                                        {(pvData.points || []).map((point, idx) => (
                                            <div key={idx} className={`flex items-start gap-4 p-4 rounded-xl border group hover:border-blue-200 transition-all shadow-sm ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'}`}>
                                                <div className={`mt-2 w-2 h-2 rounded-full flex-shrink-0 ${darkMode ? 'bg-blue-400' : 'bg-blue-900'}`}></div>
                                                <textarea value={point} onChange={(e) => {
                                                    const newPoints = [...pvData.points];
                                                    newPoints[idx] = e.target.value;
                                                    setPvData({ ...pvData, points: newPoints });
                                                    e.target.style.height = 'auto';
                                                    e.target.style.height = e.target.scrollHeight + 'px';
                                                }} ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }} className={`w-full bg-transparent outline-none resize-none text-sm leading-relaxed overflow-hidden ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} rows={1} />
                                                {!hideSidebar && <button onClick={() => setPvData({ ...pvData, points: pvData.points.filter((_, i) => i !== idx) })} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"><Trash2 size={14} /></button>}
                                            </div>
                                        ))}
                                        {!hideSidebar && (
                                            <button onClick={() => setPvData({ ...pvData, points: [...(pvData.points || []), ''] })} className="mt-2 flex items-center gap-2 text-sm text-blue-900 font-medium hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 w-fit">
                                                <Plus size={16} /> {t('pv.addPoint')}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* DIFFUSION */}
                                <div id="distribution" className={`rounded-2xl border p-8 transition-colors duration-300 ${hideSidebar ? (darkMode ? 'bg-gray-800/20 border-gray-700' : 'bg-gray-50/50 border-gray-100') : (darkMode ? 'bg-gray-800 border-gray-700 shadow-xl' : 'bg-white border-gray-100 shadow-xl')}`}>
                                    <SectionHeader icon={Share2} title={t('pv.distribution')} darkMode={darkMode} />
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {(pvData.distribution || []).map((name, idx) => (
                                            <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border group hover:border-blue-200 transition-all shadow-sm ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'}`}>
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${darkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-900'}`}>{name.substring(0, 1).toUpperCase()}</div>
                                                <input value={name} onChange={(e) => {
                                                    const newD = [...pvData.distribution];
                                                    newD[idx] = e.target.value;
                                                    setPvData({ ...pvData, distribution: newD });
                                                }} className={`bg-transparent font-medium outline-none w-full text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`} />
                                                {!hideSidebar && <button onClick={() => setPvData({ ...pvData, distribution: pvData.distribution.filter((_, i) => i !== idx) })} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"><Trash2 size={14} /></button>}
                                            </div>
                                        ))}
                                        {!hideSidebar && (
                                            <button onClick={() => setPvData({ ...pvData, distribution: [...(pvData.distribution || []), ''] })} className={`flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed text-sm font-medium transition-colors ${darkMode ? 'border-gray-700 text-gray-500 hover:border-blue-500 hover:text-blue-400' : 'border-gray-300 text-gray-400 hover:border-blue-500 hover:text-blue-900'}`}>
                                                <Plus size={16} /> {t('pv.addDistribution')}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* ACTIONS ET SUIVI */}
                                <div id="actions" className={`rounded-2xl border p-8 transition-colors duration-300 ${hideSidebar ? (darkMode ? 'bg-gray-800/20 border-gray-700' : 'bg-gray-50/50 border-gray-100') : (darkMode ? 'bg-gray-800 border-gray-700 shadow-xl' : 'bg-white border-gray-100 shadow-xl')}`}>
                                    <SectionHeader icon={CheckCircle2} title={t('pv.actions')} darkMode={darkMode} />
                                    <div className="space-y-4">
                                        {(pvData.actions || []).map((action, idx) => (
                                            <div key={idx} className={`rounded-xl border p-5 group transition-all hover:shadow-md ${darkMode ? 'bg-gray-900 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-blue-200'}`}>
                                                {/* Action title row */}
                                                <div className="mb-4">
                                                    <label className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 block ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('pv.actionItem')}</label>
                                                    <textarea value={action.action} onChange={(e) => {
                                                        const newA = [...pvData.actions];
                                                        newA[idx].action = e.target.value;
                                                        setPvData({ ...pvData, actions: newA });
                                                        e.target.style.height = 'auto';
                                                        e.target.style.height = e.target.scrollHeight + 'px';
                                                    }} ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }} rows={1} className={`w-full bg-transparent font-medium outline-none resize-none overflow-hidden text-sm leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-800'}`} />
                                                </div>
                                                {/* Details row */}
                                                <div className="grid grid-cols-4 gap-4">
                                                    <div>
                                                        <label className={`text-[10px] font-bold uppercase tracking-wider mb-1 block ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('pv.responsible')}</label>
                                                        <input value={action.responsible} onChange={(e) => {
                                                            const newA = [...pvData.actions];
                                                            newA[idx].responsible = e.target.value;
                                                            setPvData({ ...pvData, actions: newA });
                                                        }} className={`w-full bg-transparent outline-none text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} />
                                                    </div>
                                                    <div>
                                                        <label className={`text-[10px] font-bold uppercase tracking-wider mb-1 block ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('pv.priority')}</label>
                                                        <div className={`px-2 py-0.5 rounded-full inline-block ${
                                                            action.priority === 'Majeure' ? 'bg-red-100 text-red-700' :
                                                            action.priority === 'Moyenne' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-emerald-100 text-emerald-700'
                                                        }`}>
                                                            <select 
                                                                value={action.priority || 'Moyenne'} 
                                                                onChange={(e) => {
                                                                    const newA = [...pvData.actions];
                                                                    newA[idx].priority = e.target.value;
                                                                    setPvData({ ...pvData, actions: newA });
                                                                }}
                                                                className="bg-transparent outline-none text-[10px] font-bold cursor-pointer"
                                                            >
                                                                <option value="Majeure">{t('pv.priorityHigh')}</option>
                                                                <option value="Moyenne">{t('pv.priorityMedium')}</option>
                                                                <option value="Mineure">{t('pv.priorityLow')}</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className={`text-[10px] font-bold uppercase tracking-wider mb-1 block ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('pv.dueDate')}</label>
                                                        <input 
                                                            type="date"
                                                            value={action.dueDate || ''} 
                                                            onChange={(e) => {
                                                                const newA = [...pvData.actions];
                                                                newA[idx].dueDate = e.target.value;
                                                                setPvData({ ...pvData, actions: newA });
                                                            }} 
                                                            className={`w-full bg-transparent outline-none text-xs font-mono cursor-pointer ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className={`text-[10px] font-bold uppercase tracking-wider mb-1 block ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('pv.status')}</label>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${action.status === 'Fait' ? 'bg-green-500' : action.status === 'En cours' ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                                                            <select value={action.status || 'En cours'} onChange={(e) => {
                                                                const newA = [...pvData.actions];
                                                                newA[idx].status = e.target.value;
                                                                setPvData({ ...pvData, actions: newA });
                                                            }} className={`bg-transparent outline-none text-xs font-semibold cursor-pointer ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                                <option value="En cours">{t('pv.statusInProgress')}</option>
                                                                <option value="Fait">{t('pv.statusDone')}</option>
                                                                <option value="En attente">{t('pv.statusPending')}</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Delete button */}
                                                {!hideSidebar && (
                                                    <div className="flex justify-end mt-3 pt-3 border-t border-transparent group-hover:border-gray-100 dark:group-hover:border-gray-800 transition-colors">
                                                        <button onClick={() => setPvData({ ...pvData, actions: pvData.actions.filter((_, i) => i !== idx) })} className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 transition-all">
                                                            <Trash2 size={12} /> {t('common.delete')}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {!hideSidebar && (
                                            <button onClick={() => setPvData({ ...pvData, actions: [...(pvData.actions || []), { action: '', responsible: 'TBD', priority: 'Majeure', dueDate: '', status: 'En cours' }] })} className="mt-2 flex items-center gap-2 text-sm text-blue-900 font-medium hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 w-fit">
                                                <Plus size={16} /> {t('pv.addAction')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Save Success Notification */}
                {showSaveSuccess && (
                    <div className="fixed bottom-6 right-6 bg-gray-900/90 backdrop-blur text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-50 animate-in fade-in slide-in-from-bottom-4">
                        <CheckCircle2 size={16} className="text-green-500" />
                        <span className="text-sm font-medium">{t('pv.savedSuccess')}</span>
                    </div>
                )}

                {/* Right Sidebar (AI Generation) */}
                {!hideSidebar && (
                    <aside className={`w-72 border-l flex flex-col transition-all duration-300 z-20 flex-shrink-0 ${darkMode ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-200'}`}>
                        {/* AI content omitted for brevity, should remain as is if possible or replaced if broken */}
                        <div className={`p-4 border-b flex items-center justify-between ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                            <div className="flex items-center gap-2">
                                <Sparkles size={16} className="text-blue-900" />
                                <h2 className={`font-bold text-xs uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('pv.aiGeneration')}</h2>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar">
                            {/* Validate button */}
                            <div className="space-y-2">
                                <button
                                    onClick={handleValidate}
                                    disabled={isValidated && !pvHasChanges}
                                    className={`w-full py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide transition-all shadow-md ${(isValidated && !pvHasChanges) ? (darkMode ? 'bg-gray-800 text-gray-600' : 'bg-gray-100 text-gray-400') : 'bg-blue-900 hover:bg-blue-800 text-white shadow-blue-900/20'}`}>
                                    <CheckCircle2 size={14} /> {t('pv.validate')}
                                </button>
                                <button
                                    disabled={isGenerating}
                                    onClick={async () => {
                                        const id = effectiveMeetingId || currentMeetingId;
                                        if (!id || id < 100_000) return;
                                        setIsGenerating(true);
                                        setPvProgress(0);
                                        setPvStep(t('pv.initializing'));
                                        setGenerateError(null);
                                        const result = await generateSummary(id, {
                                            model: genSettings.model,
                                            language: genSettings.language,
                                            format: genSettings.format,
                                        });
                                        if (!result.success) {
                                            setGenerateError(result.error || t('pv.generationError'));
                                            setIsGenerating(false);
                                        }
                                    }}
                                    className={`w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide transition-all border ${isGenerating
                                        ? (darkMode ? 'border-blue-500 text-blue-400 animate-pulse' : 'border-blue-200 text-blue-900 animate-pulse')
                                        : hasChanges
                                            ? (darkMode ? 'border-blue-500 text-blue-400' : 'border-blue-200 text-blue-900')
                                            : (darkMode ? 'border-gray-700 text-gray-600' : 'border-gray-100 text-gray-400')
                                        }`}>
                                    <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} />
                                    {isGenerating ? t('pv.generating') : t('pv.regenerate')}
                                </button>
                                {generateError && (
                                    <p className="text-xs text-red-500 mt-1">{generateError}</p>
                                )}
                            </div>

                            {/* Language */}
                            <div className="space-y-2">
                                <label className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <Globe size={12} /> {t('pv.generationLanguage')}
                                </label>
                                <div className="grid grid-cols-3 gap-1">
                                    {['FR', 'EN', 'AR'].map(lang => (
                                        <button key={lang} onClick={() => setGenSettings({ ...genSettings, language: lang })} className={`py-1.5 text-xs font-bold rounded-md transition-all ${genSettings.language === lang || (genSettings.language === 'default' && lang === (currentMeeting?.language || 'fr').toUpperCase()) ? (darkMode ? 'bg-blue-900/40 text-blue-400 border border-blue-500/50' : 'bg-blue-50 text-blue-700 border border-blue-200') : (darkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-50 text-gray-500')}`}>
                                            {lang}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Format */}
                            <div className="space-y-2">
                                <label className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <AlignLeft size={12} /> {t('pv.generationFormat')}
                                </label>
                                <div className="grid grid-cols-3 gap-1">
                                    {[
                                        { key: 'court', label: t('pv.formatShort') },
                                        { key: 'standard', label: t('pv.formatStandard') },
                                        { key: 'detaille', label: t('pv.formatDetailed') },
                                    ].map(f => (
                                        <button key={f.key} onClick={() => setGenSettings({ ...genSettings, format: f.key })}
                                            className={`py-1.5 text-xs font-bold rounded-md transition-all ${genSettings.format === f.key ? (darkMode ? 'bg-blue-900/40 text-blue-400 border border-blue-500/50' : 'bg-blue-50 text-blue-700 border border-blue-200') : (darkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-50 text-gray-500')}`}>
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Model */}
                            <div className="space-y-2">
                                <label className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('pv.aiModel')}</label>
                                <select
                                    value={genSettings.model}
                                    onChange={(e) => setGenSettings({ ...genSettings, model: e.target.value })}
                                    className={`w-full p-2 rounded-lg border text-xs focus:ring-2 focus:ring-blue-500 transition-all ${darkMode ? 'bg-gray-950 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                                    <option value="mistral:7b-instruct-q4_K_M">Mistral 7B Instruct (défaut)</option>
                                    <option value="llama3">Llama 3</option>
                                    <option value="mixtral">Mixtral</option>
                                    <option value="vicuna:13b">Vicuna 13B (lent)</option>
                                </select>
                            </div>


                        </div>
                    </aside>
                )}

                {/* Export Sidebar (Readonly Mode Only) */}
                {hideSidebar && <ExportSidebar darkMode={darkMode} />}
            </div>

        </div>
    );
};

export default RefineSummaryView;
