import React from 'react';
import {
    BarChart3, Calendar, Clock, Users, Activity, Scale, MessageSquare,
    AlertTriangle, VolumeX, Timer, Lightbulb, Zap, User, CheckCircle2,
    AlertCircle, Quote, ChevronLeft, Sparkles, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, RadarChart as ReRadarChart, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';
import { useMeeting } from '../../context/MeetingContext';
import { useI18n } from '../../i18n/useI18n';

/* ─── Icon map for summary metrics ─────────────────────────── */
const iconMap = { ENGAGEMENT: Activity, BALANCE: Scale, INTERVENTIONS: MessageSquare, INTERRUPTIONS: AlertTriangle, SILENCE: VolumeX, 'AVG TURN': Timer };

/* ─── UI: Card ─────────────────────────────────────────────── */
const Card = ({ children, className = '' }) => (
    <div className={`rounded-xl border shadow-sm transition-colors duration-300 ${className}`}>{children}</div>
);

/* ─── UI: Badge ────────────────────────────────────────────── */
const Badge = ({ children, className = '' }) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>{children}</span>
);

/* ─── UI: ProgressBar ──────────────────────────────────────── */
const ProgressBar = ({ value, max = 100, colorClass = 'bg-blue-900', heightClass = 'h-2', className = '' }) => {
    const pct = Math.min(Math.max((value / max) * 100, 0), 100);
    return (
        <div className={`w-full bg-slate-100 dark:bg-gray-800 rounded-full overflow-hidden ${heightClass} ${className}`}>
            <div className={`${colorClass} h-full rounded-full transition-all duration-500 ease-out`} style={{ width: `${pct}%` }} />
        </div>
    );
};

/* ─── Speaker Profile Card ─────────────────────────────────── */
const SpeakerProfileCard = ({ speaker, darkMode, isInterpreting, hasInterpretation, loadingMessage, t }) => (
    <Card className={`overflow-hidden flex flex-col h-full ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
        {/* Header */}
        <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-slate-100'}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full ${speaker.initialsBg} flex items-center justify-center font-bold text-lg shadow-sm`}>
                        {speaker.initials}
                    </div>
                    <div>
                        <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>{speaker.name}</h3>
                        <p className="text-xs text-slate-500 font-mono">{speaker.id}</p>
                    </div>
                </div>
                <Badge className={speaker.roleColor}>{speaker.role}</Badge>
            </div>
        </div>

        <div className="p-6 flex-1 flex flex-col gap-6">
            {/* Primary Metrics */}
            <div className="grid grid-cols-2 gap-8">
                <div>
                    <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            <Clock className="w-3 h-3" /> {t('analytics.talkTime')}
                        </div>
                    </div>
                    <div className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{speaker.metrics.talkTime}%</div>
                    <ProgressBar value={speaker.metrics.talkTime} colorClass="bg-slate-500" />
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            <Zap className="w-3 h-3" /> {t('analytics.monopolization')}
                        </div>
                    </div>
                    <div className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{speaker.metrics.monopolization}%</div>
                    <ProgressBar value={speaker.metrics.monopolization} colorClass="bg-amber-500" />
                </div>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-2 gap-8">
                <div>
                    <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            <Activity className="w-3 h-3" /> {t('analytics.stress')}
                        </div>
                        <span className="text-xs font-medium text-slate-600">{speaker.metrics.stress}%</span>
                    </div>
                    <ProgressBar value={speaker.metrics.stress} colorClass="bg-rose-400" heightClass="h-1.5" />
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            <MessageSquare className="w-3 h-3" /> {t('analytics.fragmentation')}
                        </div>
                        <span className="text-xs font-medium text-slate-600">{speaker.metrics.fragmentation}%</span>
                    </div>
                    <ProgressBar value={speaker.metrics.fragmentation} colorClass="bg-slate-300" heightClass="h-1.5" />
                </div>
            </div>

            <div className={`h-px w-full ${darkMode ? 'bg-gray-700' : 'bg-slate-100'}`} />

            {/* Detailed Stats */}
            <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                        <MessageSquare className="w-4 h-4" />
                        <span>{t('analytics.interventions')}</span>
                    </div>
                    <span className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-slate-900'}`}>{speaker.metrics.interventions} turns</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{t('analytics.interruptions')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-24 h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-slate-100'}`}>
                            <div className="h-full bg-slate-400" style={{ width: `${(speaker.metrics.interruptionsGiven / (speaker.metrics.interruptionsGiven + speaker.metrics.interruptionsReceived + 1)) * 100}%` }} />
                        </div>
                        <span className={`font-semibold text-xs ${darkMode ? 'text-gray-200' : 'text-slate-900'}`}>
                            {speaker.metrics.interruptionsGiven} <span className="text-slate-400">/</span> {speaker.metrics.interruptionsReceived}
                        </span>
                    </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span>{t('analytics.avgDuration')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-24 h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-slate-100'}`}>
                            <div className="h-full bg-slate-400" style={{ width: `${Math.min(speaker.metrics.avgDuration, 100)}%` }} />
                        </div>
                        <span className={`font-semibold text-xs ${darkMode ? 'text-gray-200' : 'text-slate-900'}`}>{speaker.metrics.avgDuration}s</span>
                    </div>
                </div>
            </div>

            <div className={`h-px w-full ${darkMode ? 'bg-gray-700' : 'bg-slate-100'}`} />

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
                {speaker.tags.map((tag, i) => (
                    <Badge key={i} className={tag.color}>{tag.label}</Badge>
                ))}
            </div>

            {/* Radar & Analysis */}
            <div className={`grid grid-cols-2 gap-4 rounded-lg p-3 ${darkMode ? 'bg-gray-900/50' : 'bg-slate-50'}`}>
                <div className="h-[120px] w-full relative">
                    <div className="absolute top-0 left-0 text-[10px] text-slate-400 font-medium">{t('analytics.profileShape')}</div>
                    <ResponsiveContainer width="100%" height="100%">
                        <ReRadarChart cx="50%" cy="55%" outerRadius="65%" data={speaker.radar}>
                            <PolarGrid stroke={darkMode ? '#334155' : '#e2e8f0'} />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 8, fill: '#64748b' }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar name="Profile" dataKey="value" stroke="#64748b" strokeWidth={1.5} fill="#64748b" fillOpacity={darkMode ? 0.3 : 0.15} />
                        </ReRadarChart>
                    </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                    {!isInterpreting && speaker.strengths && speaker.strengths.length > 0 && (
                        <div>
                            <div className="flex items-center gap-1 text-[10px] font-bold uppercase mb-1 text-[#43a886]">
                                <CheckCircle2 className="w-3 h-3" /> {t('analytics.strengths')}
                            </div>
                            <ul className="space-y-1">
                                {speaker.strengths.map((s, i) => (
                                    <li key={i} className="text-[10px] text-slate-400 leading-tight flex items-start gap-1">
                                        <span className="block w-1 h-1 rounded-full bg-slate-400 mt-1 flex-shrink-0" />{s}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {!isInterpreting && speaker.areasToWatch && speaker.areasToWatch.length > 0 && (
                        <div>
                            <div className="flex items-center gap-1 text-[10px] font-bold uppercase mb-1 text-[#fb7185]">
                                <AlertCircle className="w-3 h-3" /> {t('analytics.areasToWatch')}
                            </div>
                            <ul className="space-y-1">
                                {speaker.areasToWatch.map((s, i) => (
                                    <li key={i} className="text-[10px] text-slate-400 leading-tight flex items-start gap-1">
                                        <span className="block w-1 h-1 rounded-full bg-slate-400 mt-1 flex-shrink-0" />{s}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Communication Style */}
            <div className={`rounded-lg p-4 border mt-auto ${darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-slate-50 border-slate-200'}`}>
                {!hasInterpretation && isInterpreting ? (
                    <div className="animate-pulse space-y-4 py-3">
                        <div className="flex justify-center mb-6">
                            <div className="flex flex-col items-center gap-3">
                                <div className="relative relative w-8 h-8">
                                    <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500 animate-spin"></div>
                                    <Sparkles className="absolute inset-0 m-auto w-4 h-4 text-emerald-400 animate-pulse" />
                                </div>
                                <span className={`text-xs font-medium tracking-wide ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                    {loadingMessage || t("analytics.analyzing")}
                                </span>
                            </div>
                        </div>
                        <div className={`h-2 w-full rounded ${darkMode ? 'bg-gray-700' : 'bg-slate-200'}`}></div>
                        <div className={`h-2 w-5/6 rounded ${darkMode ? 'bg-gray-700' : 'bg-slate-200'}`}></div>
                        <div className={`h-2 w-4/6 rounded ${darkMode ? 'bg-gray-700' : 'bg-slate-200'}`}></div>
                    </div>
                ) : (
                    <>
                        {speaker.profileSummary || speaker.psychologicalAnalysis ? (
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles className="w-4 h-4 text-emerald-500" />
                                        <span className={`text-xs font-bold uppercase ${darkMode ? 'text-gray-300' : 'text-slate-900'}`}>{t('analytics.aiProfile')}</span>
                                    </div>
                                    {speaker.profileSummary && (
                                        <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-100' : 'text-slate-800'}`}>{speaker.profileSummary}</p>
                                    )}
                                    {speaker.psychologicalAnalysis && (
                                        <p className={`text-[13px] leading-relaxed text-justify mb-3 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                                            {speaker.psychologicalAnalysis}
                                        </p>
                                    )}
                                </div>
                                
                                {speaker.vocalSignature && (
                                    <div className={`p-3 rounded-md border ${darkMode ? 'bg-gray-800/80 border-gray-600' : 'bg-white shadow-sm border-slate-200'}`}>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <Activity className="w-3.5 h-3.5 text-indigo-400" />
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-slate-600'}`}>{t('analytics.vocalSignature')}</span>
                                        </div>
                                        <p className={`text-[13px] leading-relaxed ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                                            {speaker.vocalSignature}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : null}
                        
                        <div className="flex items-center gap-2 mb-2 mt-4">
                            <Quote className="w-4 h-4 text-slate-400" />
                            <span className={`text-xs font-bold uppercase ${darkMode ? 'text-gray-300' : 'text-slate-900'}`}>{t('analytics.communicationStyle')}</span>
                        </div>
                        <p className={`text-sm font-semibold italic mb-2 ${darkMode ? 'text-gray-100' : 'text-slate-900'}`}>"{speaker.style.quote}"</p>
                        {speaker.style.description && !speaker.psychologicalAnalysis && (
                            <p className="text-xs text-slate-400 leading-relaxed">{speaker.style.description}</p>
                        )}

                        {speaker.recommendation ? (
                            <div className={`mt-4 pt-3 border-t ${darkMode ? 'border-gray-700' : 'border-slate-200'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <Lightbulb className="w-4 h-4 text-amber-500" />
                                    <span className={`text-xs font-bold uppercase ${darkMode ? 'text-gray-300' : 'text-slate-900'}`}>{t('analytics.aiRecommendation')}</span>
                                </div>
                                <p className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'} leading-relaxed`}>{speaker.recommendation}</p>
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    </Card>
);


/* ─── DYNAMIC ANALYTICS COMPUTATION (ADAPTER) ──────────────── */
const formatAnalyticsData = (backendData, currentMeeting = null, interpretation = null, speakerRenameMap = {}) => {
    // Basic meeting info fallback
    const meetingInfo = currentMeeting ? {
        title: currentMeeting.title || 'Meeting Analytics',
        date: currentMeeting.date || new Date().toLocaleDateString(),
        duration: currentMeeting.duration || '0m',
        participants: currentMeeting.participants?.length || 0,
    } : {
        title: 'Meeting Analytics', date: new Date().toLocaleDateString(), duration: '0m', participants: 0
    };

    if (!backendData || Object.keys(backendData).length === 0) {
        return {
            meetingInfo,
            summaryMetrics: [],
            meetingDynamics: { text: "No analytics data available yet." },
            talkTimeData: [],
            radarData: [],
            speakers: [],
            metricDefinitions: []
        };
    }

    // Adapter: Symfony returns structured JSON with 'otherMetrics', Flask returns flat speaker dict
    const effectiveData = backendData.otherMetrics || backendData;

    const speakersList = Object.keys(effectiveData).map((name, index) => {
        // Skip non-speaker keys from Symfony structure if not using otherMetrics
        if (['meetingId', 'summaryMetrics', 'talkTimeData', 'radarData', 'speakers', 'interpretation', 'ai_interpretation'].includes(name)) return null;

        const metrics = effectiveData[name];
        if (!metrics) return null;
        const displayName = speakerRenameMap?.[name] || name;
        // Very light gray with subtle color tints (low saturation)
        const bgColors = [
            'bg-[#d9e2e8] text-slate-700', // Gris-Bleu Clair
            'bg-[#d9e8df] text-slate-700', // Gris-Vert Clair
            'bg-[#e3d9e8] text-slate-700', // Gris-Violet Clair
            'bg-[#e8e1d9] text-slate-700', // Gris-Chaud Clair
            'bg-[#d9e8e6] text-slate-700'  // Gris-Cyan Clair
        ];
        const percentage = metrics.temps_de_parole_pct || 0;

        // Pull AI interpretation for this speaker if available
        const ai = interpretation?.speakers?.[name] || null;

        return {
            id: `usr-${index + 1}`,
            name: displayName,
            talkTime: `${percentage}%`,
            initials: displayName.substring(0, 2).toUpperCase(),
            initialsBg: bgColors[index % bgColors.length],
            metrics: {
                talkTime: percentage,
                monopolization: metrics.monopolisation || 0,
                stress: metrics.stress_jitter_shimmer || 0,
                fragmentation: metrics.fragmentation || 0,
                interventions: metrics.nombre_interventions || 0,
                interruptionsGiven: metrics.interruptions_faites || 0,
                interruptionsReceived: metrics.interruptions_subies || 0,
                avgDuration: metrics.duree_moyenne_intervention || 0
            },
            voice: {
                pitch: metrics.pitch_variance > 0.2 ? 'High Var' : metrics.pitch_variance < 0.1 ? 'Monotone' : 'Normal',
                energy: metrics.energy_variance > 0.3 ? 'Dynamic' : metrics.energy_variance < 0.1 ? 'Flat' : 'Normal',
                tone: metrics.stress_jitter_shimmer > 50 ? 'Stressed' : 'Calm'
            },
            tags: [
                { label: percentage > 30 ? 'High Energy' : 'Calm', color: 'bg-slate-100 text-slate-700' },
                { label: metrics.nombre_interventions > 10 ? 'Frequent Speaker' : 'Listener', color: 'bg-gray-100 text-gray-700' }
            ],
            // Derived for Radar
            radar: [
                { subject: 'Clarity', value: Math.max(0, 100 - (metrics.fragmentation || 0)) },
                { subject: 'Empathy', value: Math.max(0, 100 - (metrics.interruptions_faites || 0) * 5) },
                { subject: 'Dir', value: metrics.monopolisation || 0 },
                { subject: 'Eng', value: Math.min(100, (metrics.nombre_interventions || 0) * 5) },
                { subject: 'Resp', value: Math.max(0, 100 - (metrics.monopolisation || 0)) }
            ],
            // AI-enriched fields (fallback to rule-based if no interpretation provided)
            strengths: ai?.strengths?.length > 0
                ? ai.strengths
                : [percentage > 30 ? 'Strong presence' : 'Good listener', metrics.nombre_interventions > 10 ? 'Active contributor' : 'Deliberate responses'].filter(Boolean),
            areasToWatch: ai?.areas_to_watch?.length > 0
                ? ai.areas_to_watch
                : [
                    metrics.monopolisation > 60 ? 'High monopolization tendency' : null,
                    metrics.stress_jitter_shimmer > 60 ? 'Noticeable stress indicators' : null,
                  ].filter(Boolean),
            style: {
                quote: ai?.style_quote || (percentage > 30 ? 'Let\'s focus on the action items.' : 'I agree with the previous point.'),
                description: ai?.style_description || `Shows ${metrics.pitch_variance > 0.15 ? 'high' : 'standard'} vocal variation with ${metrics.energy_variance > 0.2 ? 'dynamic' : 'steady'} energy.`
            },
            role: ai?.role_label || (percentage > 40 ? 'Leader / Driver' : percentage > 20 ? 'Active Contributor' : 'Observer'),
            roleColor: percentage > 40 ? 'bg-slate-200 text-slate-800 font-medium' : 'bg-slate-100 text-slate-700',
            profileSummary: ai?.profile_summary || null,
            psychologicalAnalysis: ai?.psychological_analysis || null,
            vocalSignature: ai?.vocal_signature || null,
            recommendation: ai?.recommendation || null,
        };
    }).filter(Boolean);

    meetingInfo.participants = speakersList.length || meetingInfo.participants;

    const talkTimeData = speakersList.map(s => ({
        name: s.name,
        value: parseInt(s.talkTime)
    }));

    const radarCategories = ['Clarity', 'Empathy', 'Assertiveness', 'Engagement', 'Listening'];
    const radarData = radarCategories.map((cat, i) => {
        const pt = { subject: cat };
        speakersList.forEach((s) => {
            pt[s.id] = s.radar[i].value;
        });
        return pt;
    });

    const totalInterventions = speakersList.reduce((acc, s) => acc + s.metrics.interventions, 0);

    // Global dynamics text: prefer AI, fallback to rule-based
    const dynamicsText = interpretation?.meeting_dynamics
        || `This meeting featured ${speakersList.length} distinct speakers. The discussion was primarily driven by ${[...speakersList].sort((a, b) => parseInt(b.talkTime) - parseInt(a.talkTime))[0]?.name || 'the team'}.`;

    return {
        meetingInfo,
        summaryMetrics: [
            { label: 'ENGAGEMENT', value: totalInterventions > 20 ? 'High' : 'Normal', color: 'text-slate-900 dark:text-slate-100', bgColor: 'bg-transparent' },
            { label: 'BALANCE', value: talkTimeData.every(d => d.value < 60) ? 'Fair' : 'Skewed', color: 'text-slate-900 dark:text-slate-100', bgColor: 'bg-transparent' },
            { label: 'INTERVENTIONS', value: totalInterventions, color: 'text-slate-900 dark:text-slate-100', bgColor: 'bg-transparent' },
            { label: 'AVG TURN', value: 'varies', color: 'text-slate-900 dark:text-slate-100', bgColor: 'bg-transparent' },
            { label: 'INTERRUPTIONS', value: speakersList.reduce((acc, s) => acc + s.metrics.interruptionsGiven, 0), color: 'text-slate-900 dark:text-slate-100', bgColor: 'bg-transparent' },
            { label: 'SILENCE', value: 'Low', color: 'text-slate-900 dark:text-slate-100', bgColor: 'bg-transparent' }
        ],
        meetingDynamics: { text: dynamicsText },
        talkTimeData,
        radarData,
        speakers: speakersList,
        metricDefinitions: [
            { title: 'Clarity', description: 'Inverse of speech fragmentation.' },
            { title: 'Empathy', description: 'Inverse of interruptions made.' },
            { title: 'Assertiveness', description: 'Based on monopolization score.' },
            { title: 'Engagement', description: 'Based on number of interventions.' },
            { title: 'Listening', description: 'Inverse of monopolization.' }
        ]
    };
};

const LOADING_MESSAGES = [
    "Processing OpenSMILE acoustics...",
    "Extracting individual traits...",
    "Building behavioral profiles...",
    "Generating psychological analysis...",
    "Finalizing AI interpretation (this takes a moment)..."
];

/** Returns true when the ID is a Symfony UUID (e.g. '550e8400-e29b-41d4-a716-446655440000').
 *  Flask jobs use plain numeric IDs (e.g. 123456789).
 *  When coming from the Overview / archive, we must NOT call the Flask AI server. */
const isSymfonyUUID = (id) => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));

const hasStoredInterpretation = (value) => {
    if (!value) return false;
    if (typeof value !== 'object') return true;
    return Object.keys(value).length > 0;
};

const normalizeInterpretation = (value) => {
    if (!hasStoredInterpretation(value)) return null;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return hasStoredInterpretation(parsed) ? parsed : null;
        } catch {
            return null;
        }
    }
    return value;
};

const getStoredInterpretation = (analyticsData) => {
    if (!analyticsData || typeof analyticsData !== 'object') return null;

    const direct = normalizeInterpretation(analyticsData.interpretation);
    if (direct) return direct;

    const legacy = normalizeInterpretation(analyticsData?.otherMetrics?.ai_interpretation);
    if (legacy) return legacy;

    return null;
};

const BehavioralAnalyticsView = ({ isEmbedded = false, onNavigate }) => {
    const navigate = useNavigate();
    const { 
        darkMode, 
        currentMeetingId, 
        currentMeeting, 
        fetchMeeting, 
        analyticsData, 
        fetchAnalytics, 
        isAnalyticsLoading, 
        saveAnalyticsInterpretation,
        interpretation,
        setInterpretation
    } = useMeeting();
    const { t } = useI18n();

    // AI Interpretation state (managed by context)
    const [isInterpreting, setIsInterpreting] = React.useState(false);
    const [loadingMessageIdx, setLoadingMessageIdx] = React.useState(0);
    const [progress, setProgress] = React.useState(0);
    const speakerRenameMap = React.useMemo(() => {
        if (!currentMeetingId) return {};
        try {
            const raw = localStorage.getItem(`meeting_speaker_rename_map_${currentMeetingId}`);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }, [currentMeetingId]);

    // Simulated progress bar for the global loading view
    React.useEffect(() => {
        let interval;
        if (isInterpreting) {
            setProgress(0);
            interval = setInterval(() => {
                setProgress(p => Math.min(p + (Math.random() * 2 + 1), 95));
            }, 800);
        } else {
            setProgress(100);
        }
        return () => clearInterval(interval);
    }, [isInterpreting]);



    React.useEffect(() => {
        let interval;
        if (isInterpreting) {
            setLoadingMessageIdx(0);
            interval = setInterval(() => {
                setLoadingMessageIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
            }, 3500);
        }
        return () => clearInterval(interval);
    }, [isInterpreting]);

    const fetchInterpretation = React.useCallback(async (meetingId, analyticsPayload) => {
        if (!meetingId) return;
        setIsInterpreting(true);
        try {
            // 1. Démarrer le job en background (force=true pour ignorer le cache précédent)
            // Always send to Flask using the numeric ID if available, otherwise use meetingId
            const flaskId = isSymfonyUUID(meetingId) ? meetingId : meetingId;
            const startRes = await fetch(
                `http://localhost:5001/api/meetings/${flaskId}/analytics/interpret`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ analytics_data: analyticsPayload }),
                }
            );
            
            if (!startRes.ok && startRes.status !== 202) {
                console.warn('[BehavioralAnalytics] Start interpretation failed', startRes.status);
                setIsInterpreting(false);
                return;
            }

            // 2. Polling toutes les 3 secondes
            const poll = async () => {
                try {
                    const statusRes = await fetch(`http://localhost:5001/api/meetings/${flaskId}/analytics/interpret`);
                    if (statusRes.status === 200) {
                        const json = await statusRes.json();
                        const result = json.result;
                        setInterpretation(result);
                        setIsInterpreting(false);

                        // Persist the interpretation to Symfony DB if we have a UUID
                        if (isSymfonyUUID(meetingId)) {
                            console.log('[BehavioralAnalytics] Persisting new interpretation to Symfony DB...');
                            saveAnalyticsInterpretation(meetingId, result);
                        }
                    } else if (statusRes.status === 202) {
                        // Toujours en cours
                        setTimeout(poll, 3000);
                    } else {
                        console.error('[BehavioralAnalytics] Interpretation polling failed', statusRes.status);
                        setIsInterpreting(false);
                    }
                } catch (e) {
                    console.error('[BehavioralAnalytics] Interpretation poll error:', e);
                    setIsInterpreting(false);
                }
            };
            
            setTimeout(poll, 3000);

        } catch (err) {
            console.error('[BehavioralAnalytics] Interpretation start error:', err);
            setIsInterpreting(false);
        }
    }, [saveAnalyticsInterpretation]);

    // Load interpretation from the analytics API response (already fetched from behavioral_interpretation table).
    // This runs whenever analyticsData changes — covers both initial load and meeting switches.
    React.useEffect(() => {
        if (currentMeetingId && !analyticsData) {
            fetchAnalytics(currentMeetingId).then(res => {
                const stored = getStoredInterpretation(res.data);
                if (res.success && stored) {
                    setInterpretation(stored);
                }
            });
        } else if (!interpretation) {
            const stored = getStoredInterpretation(analyticsData);
            // Interpretation already in DB response — use it immediately, no Flask call needed
            if (stored) setInterpretation(stored);
        }
    }, [currentMeetingId, analyticsData, fetchAnalytics, interpretation]);

    // Auto-trigger AI interpretation ONLY when:
    // - No interpretation exists in DB (analyticsData.interpretation is null/undefined)
    // - AND no interpretation is currently in React state
    // - AND not already generating
    // This prevents re-generating on every visit when interpretation is already persisted.
    React.useEffect(() => {
        if (!currentMeetingId || !analyticsData || isInterpreting) return;

        // Priority 1: interpretation already returned by Symfony (from behavioral_interpretation table)
        if (getStoredInterpretation(analyticsData)) {
            // Already handled by the effect above — do NOT regenerate
            return;
        }

        // Priority 2: interpretation already in local React state (e.g. just generated)
        if (interpretation) return;

        // Priority 3: no interpretation anywhere — generate it via Flask
        const rawAnalytics = analyticsData.otherMetrics || analyticsData;
        const hasRealSpeakers = rawAnalytics && typeof rawAnalytics === 'object'
            && Object.keys(rawAnalytics).some(k => !['meetingId','summaryMetrics','talkTimeData','radarData','speakers','interpretation','ai_interpretation'].includes(k));

        if (!hasRealSpeakers) {
            console.log('[BehavioralAnalytics] No speaker analytics found — skipping interpretation.');
            return;
        }

        console.log('[BehavioralAnalytics] No cached interpretation found — generating via Flask AI...');
        fetchInterpretation(currentMeetingId, rawAnalytics);
    }, [currentMeetingId, analyticsData, interpretation, isInterpreting, fetchInterpretation]);

    const data = React.useMemo(
        () => formatAnalyticsData(analyticsData, currentMeeting, interpretation, speakerRenameMap),
        [analyticsData, currentMeeting, interpretation, speakerRenameMap]
    );

    if (isAnalyticsLoading) {
        return (
            <div className={`p-8 lg:p-12 w-full h-full flex flex-col items-center justify-center ${darkMode ? 'bg-gray-950 text-gray-200' : 'bg-slate-50 text-slate-900'}`}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-white mb-4"></div>
                <p>{t('analytics.analyzing')}</p>
            </div>
        );
    }

    if (!analyticsData) {
        return (
            <div className={`p-8 lg:p-12 w-full h-full flex flex-col items-center justify-center ${darkMode ? 'bg-gray-950 text-gray-200' : 'bg-slate-50 text-slate-900'}`}>
                <AlertTriangle className="w-12 h-12 text-slate-400 mb-4" />
                <h2 className="text-xl font-bold mb-2">{t('analytics.notReady')}</h2>
                <p className="text-slate-500 mb-6">{t('analytics.notReadyDesc')}</p>
                <button onClick={() => currentMeetingId && fetchAnalytics(currentMeetingId)} className="btn btn-primary">{t('analytics.refresh')}</button>
            </div>
        );
    }

    return (
        <div className={`p-8 lg:p-12 overflow-y-auto h-full relative ${darkMode ? 'bg-gray-950 text-gray-200' : 'bg-slate-50/50 text-slate-900'}`}>
            {/* Floating back button — top-left corner */}
            <button
                onClick={() => onNavigate ? onNavigate('back') : navigate(-1)}
                className={`absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border backdrop-blur-md transition-all duration-300 transform active:scale-95 group shadow-lg ${
                    darkMode
                        ? 'bg-gray-800/90 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700/90 hover:border-gray-600 shadow-black/20'
                        : 'bg-white/90 border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-white hover:border-slate-300 shadow-slate-200/40'
                }`}
                title="Retour à la page précédente"
            >
                <ChevronLeft size={14} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
                <span>Retour</span>
            </button>

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`p-1.5 rounded-md ${darkMode ? 'bg-gray-800' : 'bg-slate-200'}`}>
                                <BarChart3 className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-slate-700'}`} />
                            </div>
                            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">{t('analytics.title')}</span>
                        </div>
                        <h1 className={`text-2xl md:text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{data.meetingInfo.title}</h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 md:gap-6">
                        <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border ${darkMode ? 'bg-gray-900 border-gray-800 text-gray-400' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                            <Calendar className="w-4 h-4 text-slate-400" /><span>{data.meetingInfo.date}</span>
                        </div>
                        <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border ${darkMode ? 'bg-gray-900 border-gray-800 text-gray-400' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                            <Clock className="w-4 h-4 text-slate-400" /><span>{data.meetingInfo.duration}</span>
                        </div>
                        <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border ${darkMode ? 'bg-gray-900 border-gray-800 text-gray-400' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                            <Users className="w-4 h-4 text-slate-400" /><span>{data.meetingInfo.participants} Participants</span>
                        </div>
                    </div>
                </header>

                <main className="space-y-12">
                    {/* Meeting Summary */}
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('analytics.meetingSummary')}</h2>
                            <span className="text-sm text-slate-500">{t('analytics.highLevelInsights')}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                            {data.summaryMetrics.map((metric, index) => {
                                const Icon = iconMap[metric.label] || Activity;
                                return (
                                    <Card key={index} className={`p-4 flex flex-col items-start ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                                        <div className="mb-3">
                                            <Icon className={`w-5 h-5 ${darkMode ? 'text-white' : 'text-slate-900'}`} />
                                        </div>
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{metric.label}</span>
                                        <span className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{metric.value}</span>
                                    </Card>
                                );
                            })}
                        </div>
                        <div className={`border rounded-xl p-5 flex items-start gap-4 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-slate-50 border-slate-200'}`}>
                            <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm border border-slate-100'}`}>
                                <Lightbulb className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-slate-600'}`} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className={`text-sm font-bold tracking-wide ${darkMode ? 'text-gray-300' : 'text-slate-900'}`}>{t('analytics.meetingDynamics')}</h3>
                                    {isInterpreting ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                            <Loader2 className="w-3 h-3 animate-spin" /> qwen3:4b analyzing…
                                        </span>
                                    ) : interpretation ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                            <Sparkles className="w-3 h-3" /> {t('analytics.aiInterpretation')}
                                        </span>
                                    ) : null}
                                </div>
                                {isInterpreting ? (
                                    <div className="mt-3">
                                        <div className="flex justify-between items-center text-xs font-medium text-slate-500 mb-2">
                                            <span>{t('analytics.buildingGlobalView')}</span>
                                            <span>{Math.floor(progress)}%</span>
                                        </div>
                                        <div className={`w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-slate-200'}`}>
                                            <div className="h-full bg-emerald-500 transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-slate-600'}`}>{data.meetingDynamics.text}</p>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Comparative Analysis */}
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('analytics.comparativeAnalysis')}</h2>
                            <span className="text-sm text-slate-500">{t('analytics.visualComparison')}</span>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Card className={`p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                                <h3 className={`text-sm font-bold mb-6 uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>{t('analytics.talkTimeDistribution')}</h3>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart layout="vertical" data={data.talkTimeData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={darkMode ? '#334155' : '#e2e8f0'} />
                                            <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
                                            <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                            <Tooltip cursor={{ fill: darkMode ? '#1e293b' : '#f1f5f9' }} contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#fff', borderRadius: '8px', border: 'none', color: darkMode ? '#fff' : '#000' }} />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                                                {data.talkTimeData.map((entry, index) => {
                                                    const fills = ['#97aab8', '#97b8a3', '#afa3b8', '#b8b09f', '#97b8b4']; // Grisés colorés pour les charts
                                                    return <Cell key={`cell-${index}`} fill={fills[index % fills.length]} />;
                                                })}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>

                            <Card className={`p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                                <h3 className={`text-sm font-bold mb-2 uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>{t('analytics.behavioralProfileComparison')}</h3>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ReRadarChart cx="50%" cy="50%" outerRadius="70%" data={data.radarData}>
                                            <PolarGrid stroke={darkMode ? '#334155' : '#e2e8f0'} />
                                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b' }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                            {data.speakers.map((s, idx) => {
                                                const fills = ['#97aab8', '#97b8a3', '#afa3b8', '#b8b09f', '#97b8b4'];
                                                const color = fills[idx % fills.length];
                                                return (
                                                    <Radar key={s.id} name={s.name} dataKey={s.id} stroke={color} strokeWidth={2} fill={color} fillOpacity={0.25} />
                                                );
                                            })}
                                            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                                            <Tooltip contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#fff', borderRadius: '8px', border: 'none' }} />
                                        </ReRadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </div>
                    </section>

                    {/* Speaker Profiles */}
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('analytics.speakerProfiles')}</h2>
                            <span className="text-sm text-slate-500">{t('analytics.detailedBreakdown')}</span>
                        </div>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            {data.speakers.map((speaker) => (
                                <SpeakerProfileCard key={speaker.id} speaker={speaker} darkMode={darkMode} isInterpreting={isInterpreting} hasInterpretation={!!interpretation} loadingMessage={LOADING_MESSAGES[loadingMessageIdx]} t={t} />
                            ))}
                        </div>
                    </section>
                </main>

                {/* Metric Definitions */}
                <footer className={`mt-20 border-t pt-12 pb-12 ${darkMode ? 'border-gray-800' : 'border-slate-200'}`}>
                    <h3 className={`text-xs font-bold uppercase tracking-widest mb-8 ${darkMode ? 'text-gray-500' : 'text-slate-400'}`}>Metric Definitions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                        {data.metricDefinitions.map((def, index) => (
                            <div key={index}>
                                <h4 className={`text-sm font-bold mb-3 ${darkMode ? 'text-gray-200' : 'text-slate-900'}`}>{def.title}</h4>
                                <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-500' : 'text-slate-500'}`}>{def.description}</p>
                            </div>
                        ))}
                    </div>
                    <div className="text-center text-[10px] font-medium tracking-widest text-slate-500 uppercase">Generated by Meeting Behavioral Analysis AI • v1.1.0</div>
                </footer>
            </div>
        </div>
    );
};

export default BehavioralAnalyticsView;





