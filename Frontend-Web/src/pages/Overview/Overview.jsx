import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    Calendar,
    Clock,
    Users,
    MapPin,
    ArrowRight,
    BarChart3,
    Activity,
    Scale,
    MessageSquare,
    AlertTriangle,
    VolumeX,
    Timer,
    Lightbulb,
    Mic,
    Play,
    ChevronLeft,
    LayoutDashboard,
    FileText,
    CheckCircle2,
    Loader2,
    AlertCircle
} from 'lucide-react'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import Navbar from '../../components/Navbar/Navbar'
import { useMeeting } from '../../context/MeetingContext'

const sections = [
    { id: 'meeting-info', label: "Vue d'ensemble", icon: LayoutDashboard },
    { id: 'behavioral-analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'transcription', label: 'Transcription', icon: FileText },
];

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
        {sections.map((section) => {
            const isActive = activeSection === section.id;
            const sectionIndex = sections.findIndex(s => s.id === section.id);
            const activeIndex = sections.findIndex(s => s.id === activeSection);
            const isCompleted = sectionIndex < activeIndex;
            return (
                <div key={section.id} className="relative z-10 flex items-center gap-4 py-4 group cursor-pointer"
                    onClick={() => scrollToSection(section.id)}>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 ${
                        isActive ? 'bg-blue-900 border-blue-900 text-white scale-110 shadow-lg shadow-blue-900/20'
                        : isCompleted ? 'bg-blue-100 border-blue-100 text-blue-900'
                        : (darkMode ? 'bg-gray-900 border-gray-700 text-gray-600' : 'bg-white border-gray-100 text-gray-300')
                    }`}>
                        {isCompleted ? <CheckCircle2 size={16} /> : <section.icon size={16} />}
                    </div>
                    <div className="flex flex-col">
                        <span className={`text-xs font-bold uppercase tracking-widest transition-colors duration-200 ${isActive ? 'text-blue-900' : (darkMode ? 'text-gray-500' : 'text-gray-400')}`}>
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

export function Overview({ isEmbedded = false, onNavigate }) {
    const navigate = useNavigate()
    const { id: paramId } = useParams()
    const {
        darkMode, sidebarWidth,
        currentMeeting, fetchMeeting, currentMeetingId, setCurrentMeetingId,
        transcript, fetchTranscript,
        analyticsData, fetchAnalytics, isAnalyticsLoading,
        loading
    } = useMeeting()

    const go = (target) => {
        const mid = currentMeetingId || currentMeeting?.id;
        if (isEmbedded && onNavigate) {
            onNavigate(target, mid);
        } else {
            const qs = mid ? `?meetingId=${mid}` : '';
            if (target === 'back') navigate('/archive');
            else if (target === 'analytics') navigate(`/analytics${qs}`);
            else if (target === 'transcription') navigate(`/transcription${qs}`);
            else if (target === 'pv') navigate(`/summary${qs}`);
        }
    };

    const [activeSection, setActiveSection] = React.useState('meeting-info')
    const isScrollingRef = React.useRef(false)
    const mainContentRef = React.useRef(null)
    const hasFetchedRef = React.useRef(false)

    // Fetch real data on load
    React.useEffect(() => {
        const id = paramId || currentMeetingId || currentMeeting?.id;
        if (!id || hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        // Ensure context has the right meetingId
        if (id !== currentMeetingId) setCurrentMeetingId(id);
        if (!currentMeeting || currentMeeting.id !== id) fetchMeeting(id);
        fetchTranscript(id);
        if (!analyticsData) fetchAnalytics(id);
    }, [paramId, currentMeetingId, currentMeeting?.id]);

    React.useEffect(() => {
        if (!mainContentRef.current) return;
        const observerOptions = {
            root: mainContentRef.current,
            rootMargin: '-10% 0px -70% 0px',
            threshold: 0
        };
        const observerCallback = (entries) => {
            if (isScrollingRef.current) return;
            entries.forEach((entry) => {
                if (entry.isIntersecting) setActiveSection(entry.target.id);
            });
        };
        const observer = new IntersectionObserver(observerCallback, observerOptions);
        sections.forEach((section) => {
            const element = document.getElementById(section.id);
            if (element) observer.observe(element);
        });
        return () => observer.disconnect();
    }, []);

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            isScrollingRef.current = true;
            setActiveSection(id);
            element.scrollIntoView({ behavior: 'smooth' });
            setTimeout(() => { isScrollingRef.current = false; }, 800);
        }
    };

    const safeTranscript = Array.isArray(transcript) ? transcript : [];
    const previewSegments = safeTranscript.slice(0, 3);
    const participants = currentMeeting?.participants || [];
    const talkTimeData = analyticsData?.talkTime
        || analyticsData?.speakers?.map(s => ({ name: s.name || s.id, value: s.metrics?.talkTime ?? 0 }))
        || [];
    const summaryMetrics = analyticsData?.summaryMetrics || analyticsData?.metrics || null;
    const noMeeting = !currentMeetingId && !currentMeeting;

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            {!isEmbedded && <Navbar currentStep={3} hideSteps={true} />}
            <div className="flex flex-1 overflow-hidden h-full">
                <aside
                    style={{ width: `${sidebarWidth}px` }}
                    className={`border-r hidden lg:flex flex-col transition-all duration-500 ease-in-out z-20 shadow-xl ${darkMode ? 'bg-gray-900 border-gray-800 shadow-black/20' : 'bg-white border-gray-100 shadow-gray-100/50'}`}
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
                                title="Tableau de bord"
                            >
                                <ChevronLeft size={14} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
                                <span>Tableau de bord</span>
                            </button>
                        </div>
                        <h2 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-10 pl-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            Navigation
                        </h2>
                        <VerticalProgressNav
                            sections={sections}
                            activeSection={activeSection}
                            scrollToSection={scrollToSection}
                            darkMode={darkMode}
                        />
                    </div>
                </aside>

                <main ref={mainContentRef} className={`flex-1 overflow-y-auto p-12 lg:p-20 scroll-smooth transition-colors duration-500 no-scrollbar ${darkMode ? 'bg-gray-950 text-gray-200' : 'bg-gray-100/50 text-gray-800'}`}>
                    {noMeeting ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                            <AlertCircle size={40} className="text-gray-400" />
                            <p className={`text-lg font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Aucune réunion sélectionnée</p>
                            <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Sélectionnez une réunion depuis l'archive pour voir son aperçu.</p>
                            <Button onClick={() => go('back')} variant="outline" className="mt-2">
                                Retour à l'archive <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto space-y-12 pb-24">

                            {/* Section 1: Meeting Info */}
                            <Card id="meeting-info" className={darkMode ? 'bg-gray-900 border-gray-800' : ''}>
                                <CardContent className="p-6">
                                    {loading && !currentMeeting ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 className="animate-spin text-blue-900" size={32} />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-6">
                                            <div className="flex flex-wrap items-center gap-3 text-sm">
                                                {currentMeeting?.category && (
                                                    <Badge variant="secondary" className={darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-0' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}>
                                                        {currentMeeting.category}
                                                    </Badge>
                                                )}
                                            </div>

                                            <div>
                                                <h1 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                                    {currentMeeting?.title || 'Réunion sans titre'}
                                                </h1>
                                                {currentMeeting?.description && (
                                                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} max-w-3xl`}>
                                                        {currentMeeting.description}
                                                    </p>
                                                )}
                                            </div>

                                            <div className={`flex flex-wrap gap-6 text-sm border-b pb-6 ${darkMode ? 'text-gray-400 border-gray-800' : 'text-gray-600 border-gray-100'}`}>
                                                {currentMeeting?.date && (
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className={`h-4 w-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                                                        <span>{currentMeeting.date}</span>
                                                    </div>
                                                )}
                                                {currentMeeting?.duration && (
                                                    <div className="flex items-center gap-2">
                                                        <Clock className={`h-4 w-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                                                        <span>{currentMeeting.duration}</span>
                                                    </div>
                                                )}
                                                {participants.length > 0 && (
                                                    <div className="flex items-center gap-2">
                                                        <Users className={`h-4 w-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                                                        <span>{participants.length} participant{participants.length > 1 ? 's' : ''}</span>
                                                    </div>
                                                )}
                                                {currentMeeting?.location && (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className={`h-4 w-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                                                        <span>{currentMeeting.location}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {participants.length > 0 && (
                                                <div>
                                                    <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                                        Participants
                                                    </h3>
                                                    <div className="flex flex-wrap gap-4">
                                                        {participants.slice(0, 6).map((p, i) => {
                                                            const name = typeof p === 'string' ? p : p.name;
                                                            const role = typeof p === 'object' ? (p.role || p.function || '') : '';
                                                            const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
                                                            return (
                                                                <div key={i} className="flex items-center gap-3">
                                                                    <Avatar fallback={initials} className={darkMode ? 'bg-gray-800 text-gray-300' : 'bg-slate-100 text-slate-700'} />
                                                                    <div className="flex flex-col">
                                                                        <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{name}</span>
                                                                        {role && <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{role}</span>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            <Button
                                                variant="outline"
                                                className={`w-full justify-center h-12 ${darkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-white' : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-900'}`}
                                                onClick={() => go('pv')}
                                            >
                                                Voir le PV détaillé <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Section 2: Behavioral Analytics */}
                            <Card id="behavioral-analytics" className={darkMode ? 'bg-gray-900 border-gray-800' : ''}>
                                <CardHeader className="flex flex-row items-start justify-between pb-2">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-slate-100 rounded-lg">
                                            <BarChart3 className="h-6 w-6 text-slate-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">Analyse Comportementale</CardTitle>
                                            <CardDescription>Métriques et dynamiques de la réunion</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {isAnalyticsLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="animate-spin text-blue-900" size={28} />
                                        </div>
                                    ) : !analyticsData ? (
                                        <div className={`text-center py-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                            <Activity size={32} className="mx-auto mb-3 opacity-40" />
                                            <p className="text-sm font-medium mb-1">Analytics non disponibles</p>
                                            <p className="text-xs">Consultez la page Analytics pour déclencher l'analyse.</p>
                                        </div>
                                    ) : (
                                        <>
                                            {Array.isArray(summaryMetrics) && summaryMetrics.length > 0 && (
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                                    {summaryMetrics.map((metric, i) => (
                                                        <StatBox key={i} icon={Activity} label={metric.label} value={metric.value}
                                                            color={metric.color || 'text-slate-500'} bgColor={metric.bgColor || 'bg-slate-50'} darkMode={darkMode} />
                                                    ))}
                                                </div>
                                            )}
                                            {analyticsData?.meetingDynamics?.text && (
                                                <div className={`border rounded-xl p-4 flex gap-4 ${darkMode ? 'bg-emerald-900/10 border-emerald-900/30' : 'bg-emerald-50/40 border-emerald-50'}`}>
                                                    <div className={`p-2 rounded-xl h-fit ${darkMode ? 'bg-emerald-900/40' : 'bg-emerald-50'}`}>
                                                        <Lightbulb className="h-5 w-5 text-emerald-500" />
                                                    </div>
                                                    <div>
                                                        <h4 className={`text-xs font-bold mb-1 uppercase ${darkMode ? 'text-emerald-400' : 'text-gray-900'}`}>Dynamiques</h4>
                                                        <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{analyticsData.meetingDynamics.text}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {talkTimeData.length > 0 && (
                                                <div className="space-y-3 pt-2">
                                                    <h4 className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>RÉPARTITION DU TEMPS DE PAROLE</h4>
                                                    {talkTimeData.slice(0, 5).map((item, i) => (
                                                        <ProgressBar key={i} label={item.name} value={item.value} color="bg-slate-500" darkMode={darkMode} />
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <Button variant="outline"
                                        className={`w-full justify-center h-12 mt-4 ${darkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-white' : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-900'}`}
                                        onClick={() => go('analytics')}>
                                        Voir les Analytics détaillées <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Section 3: Transcription */}
                            <Card id="transcription" className={darkMode ? 'bg-gray-900 border-gray-800' : ''}>
                                <CardHeader className="flex flex-row items-start justify-between pb-2">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-purple-50 rounded-lg">
                                            <Mic className="h-6 w-6 text-purple-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">Transcription</CardTitle>
                                            <CardDescription>Enregistrement audio et transcription par locuteur</CardDescription>
                                        </div>
                                    </div>
                                    {safeTranscript.length > 0 && (
                                        <Badge variant="success" className="bg-green-50 text-green-700 border-green-200">
                                            {safeTranscript.length} segments
                                        </Badge>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {loading && safeTranscript.length === 0 ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="animate-spin text-blue-900" size={28} />
                                        </div>
                                    ) : safeTranscript.length === 0 ? (
                                        <div className={`text-center py-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                            <FileText size={32} className="mx-auto mb-3 opacity-40" />
                                            <p className="text-sm">Transcription non disponible pour cette réunion.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 pt-2">
                                            <h4 className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>APERÇU</h4>
                                            <div className="space-y-6">
                                                {previewSegments.map((seg, i) => (
                                                    <TranscriptItem key={seg.id || i}
                                                        speaker={seg.speaker || `Locuteur ${i + 1}`}
                                                        time={`${seg.timeStart || ''} - ${seg.timeEnd || ''}`}
                                                        text={seg.text} darkMode={darkMode} />
                                                ))}
                                                {safeTranscript.length > 3 && (
                                                    <div className={`text-center text-sm py-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                                        ... et {safeTranscript.length - 3} intervention{safeTranscript.length - 3 > 1 ? 's' : ''} de plus
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <Button variant="outline"
                                        className={`w-full justify-center h-12 mt-4 ${darkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-white' : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-900'}`}
                                        onClick={() => go('transcription')}>
                                        Voir la Transcription complète <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}

function StatBox({ icon: Icon, label, value, color, bgColor, darkMode }) {
    const darkBgColor = bgColor.replace('50', '900/40').replace('100', '800/60');
    return (
        <div className={`flex flex-col items-start p-4 rounded-xl border shadow-sm transition-colors ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-100'}`}>
            <div className={`p-2 rounded-lg mb-4 ${darkMode ? darkBgColor : bgColor}`}>
                <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{label}</span>
            <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</span>
        </div>
    )
}

function ProgressBar({ label, value, color, darkMode }) {
    return (
        <div className="flex items-center gap-4 text-sm">
            <span className={`w-24 font-medium truncate ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{label}</span>
            <div className={`flex-1 h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(value, 100)}%` }} />
            </div>
            <span className={`w-8 text-right text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{value}%</span>
        </div>
    )
}

function TranscriptItem({ speaker, time, text, darkMode }) {
    return (
        <div className="flex gap-4 group">
            <div className="flex flex-col items-end w-28 shrink-0 gap-1">
                <span className={`text-xs font-bold px-2 py-1 rounded truncate max-w-full ${darkMode ? 'text-gray-300 bg-gray-800' : 'text-gray-700 bg-gray-100'}`}>
                    {speaker}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">{time}</span>
            </div>
            <div className={`flex-1 text-sm leading-relaxed border-l-2 border-transparent pl-4 transition-colors ${darkMode ? 'text-gray-400 group-hover:border-gray-700' : 'text-gray-600 group-hover:border-slate-200'}`}>
                {text}
            </div>
        </div>
    )
}
