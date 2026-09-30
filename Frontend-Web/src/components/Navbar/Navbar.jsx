import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    Settings, Bell, Moon, Sun, User, LogOut, Mail, 
    Calendar, HelpCircle, Archive, MessageSquare, 
    X, Check, Shield, Info, Keyboard, CheckSquare, BarChart2 
} from 'lucide-react';
import { useMeeting } from '../../context/MeetingContext';
import { useI18n } from '../../i18n/useI18n';
import api from '../../services/api';
import Avatar from '../Avatar/Avatar';
import ProgressBar from '../ProgressBar/ProgressBar';
import logoSFM from '../../assets/images/LOGO_SFM.png';

const Navbar = ({ currentStep, hideSteps, onLogoClick }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { 
        darkMode, setDarkMode, language, setLanguage, 
        navbarWidth, navbarWidthReadonly, navbarHeight, navbarHeightReadonly 
    } = useMeeting();
    const { t } = useI18n();

    const [showSettings, setShowSettings] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    
    // Modals visibility states
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showNotificationsModal, setShowNotificationsModal] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [helpTab, setHelpTab] = useState('intro');

    // Dynamic User Data
    const userData = React.useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('user_data') || '{}');
        } catch {
            return {};
        }
    }, []);

    const userFullName = userData.firstName && userData.lastName 
        ? `${userData.firstName} ${userData.lastName}` 
        : (userData.email || 'Jane Doe');

    const userInitials = userData.firstName && userData.lastName 
        ? `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase() 
        : (userData.email ? userData.email.substring(0, 2).toUpperCase() : 'JD');

    const userEmail = userData.email || 'jane.doe@company.com';
    const userRole = userData.roles?.includes('ROLE_ADMIN') ? 'Admin' : 'Standard';

    // Notifications State
    const [notifications, setNotifications] = useState(() => {
        try {
            const saved = localStorage.getItem('app_notifications');
            if (saved) return JSON.parse(saved);
        } catch {}
        
        // Default mock notifications
        return [
            {
                id: 'notif-1',
                title: 'Transcription terminée',
                titleEn: 'Transcription complete',
                message: 'Le meeting "Weekly Sync Q4" a été transcrit avec succès.',
                messageEn: 'The meeting "Weekly Sync Q4" was successfully transcribed.',
                time: '10 min ago',
                timeFr: 'il y a 10 min',
                type: 'success',
                read: false,
            },
            {
                id: 'notif-2',
                title: 'Compte-rendu prêt',
                titleEn: 'Minutes ready',
                message: 'Le procès-verbal (PV) de la réunion Roadmap Produit est disponible.',
                messageEn: 'The meeting minutes (PV) for the Product Roadmap are available.',
                time: '1 hour ago',
                timeFr: 'il y a 1 heure',
                type: 'info',
                read: false,
            },
            {
                id: 'notif-3',
                title: 'Analyses prêtes',
                titleEn: 'Analytics ready',
                message: "L'analyse comportementale de la réunion de projet est disponible.",
                messageEn: 'The behavioral analytics for the project meeting are ready.',
                time: '1 day ago',
                timeFr: 'il y a 1 jour',
                type: 'analytics',
                read: false,
            },
            {
                id: 'notif-4',
                title: 'Mise à jour système',
                titleEn: 'System update',
                message: 'Une nouvelle version de l\'assistant de réunion IA a été déployée.',
                messageEn: 'A new version of the AI meeting assistant has been deployed.',
                time: '3 days ago',
                timeFr: 'il y a 3 jours',
                type: 'system',
                read: true,
            }
        ];
    });

    // Sync notifications to localStorage
    React.useEffect(() => {
        localStorage.setItem('app_notifications', JSON.stringify(notifications));
    }, [notifications]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (err) {
            console.error('Logout failed:', err);
        } finally {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_data');
            // Navigate to login page
            navigate('/login');
        }
    };

    return (
        <>
        <header
            style={{ height: `${hideSteps ? navbarHeightReadonly : navbarHeight}px` }}
            className={`border-b px-6 flex items-center justify-center sticky top-0 z-50 transition-colors duration-300 ${darkMode ? 'bg-gray-950/90 border-gray-800' : 'bg-white/95 border-gray-200'} backdrop-blur-md shadow-sm`}
        >

            <div
                style={{ maxWidth: `${hideSteps ? navbarWidthReadonly : navbarWidth}px` }}
                className="w-full flex items-center justify-between relative"
            >

                {/* Left: Logo / Branding */}
                <div className={`flex items-center gap-2 cursor-pointer transition-all ${hideSteps ? '' : 'absolute left-4 top-1/2 -translate-y-1/2'}`} onClick={() => onLogoClick ? onLogoClick() : navigate('/archive')}>
                    <img src={logoSFM} alt="SFM Logo" className="h-10 w-auto object-contain" />
                </div>

                {/* Center: Progress Bar */}
                {!hideSteps && (
                    <div className="w-full max-w-xl mx-auto px-4">
                        <ProgressBar currentStep={currentStep} />
                    </div>
                )}

                {/* Right: Actions */}
                <div className={`flex items-center gap-4 transition-all ${hideSteps ? '' : 'absolute right-0 top-1/2 -translate-y-1/2'}`}>
                    <div className="relative">
                        <Settings
                            size={20}
                            className={`cursor-pointer transition-colors ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                            onClick={() => setShowSettings(!showSettings)}
                        />

                        {/* Settings Dropdown Panel */}
                        {showSettings && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)}></div>
                                <div className={`absolute right-0 top-full mt-3 w-72 rounded-xl shadow-2xl border p-4 z-50 transform origin-top-right transition-all animate-in fade-in slide-in-from-top-2 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                                    <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('navbar.settings')}</h3>

                                    {/* Language Section */}
                                    <div className="mb-4">
                                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{t('navbar.language')}</label>
                                        <div className={`flex rounded-lg p-1 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
                                            <button
                                                onClick={() => setLanguage('EN')}
                                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${language === 'EN'
                                                    ? (darkMode ? 'bg-gray-700 text-white shadow' : 'bg-white text-blue-900 shadow')
                                                    : (darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-900')}`}
                                            >
                                                English
                                            </button>
                                            <button
                                                onClick={() => setLanguage('FR')}
                                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${language === 'FR'
                                                    ? (darkMode ? 'bg-gray-700 text-white shadow' : 'bg-white text-blue-900 shadow')
                                                    : (darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-900')}`}
                                            >
                                                Français
                                            </button>
                                        </div>
                                    </div>

                                    {/* Theme Section */}
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{t('navbar.appearance')}</label>
                                        <div
                                            onClick={() => setDarkMode(!darkMode)}
                                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors border ${darkMode ? 'bg-gray-900 border-gray-700 hover:border-gray-600' : 'bg-gray-50 border-gray-200 hover:border-blue-300'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-900'}`}>
                                                    {darkMode ? <Moon size={16} /> : <Sun size={16} />}
                                                </div>
                                                <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                                                    {darkMode ? t('navbar.darkMode') : t('navbar.lightMode')}
                                                </span>
                                            </div>
                                            <div className={`w-10 h-5 rounded-full relative transition-colors ${darkMode ? 'bg-blue-900' : 'bg-gray-300'}`}>
                                                <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${darkMode ? 'translate-x-5' : ''}`} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Profile Avatar with Dropdown */}
                    <div className="relative">
                        <div onClick={() => setShowProfile(!showProfile)} className="cursor-pointer">
                            <Avatar name={userFullName} initials={userInitials} color="#F472B6" size="medium" />
                        </div>

                        {/* Profile Dropdown Panel */}
                        {showProfile && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)}></div>
                                <div className={`absolute right-0 top-full mt-3 w-80 rounded-xl shadow-2xl border p-5 z-50 transform origin-top-right transition-all animate-in fade-in slide-in-from-top-2 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                                    {/* User Info */}
                                    <div className={`flex items-center gap-4 mb-5 pb-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                        <Avatar name={userFullName} initials={userInitials} color="#F472B6" size="large" />
                                        <div className="flex-1 min-w-0">
                                            <h3 className={`font-bold text-base truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{userFullName}</h3>
                                            <p className={`text-sm truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{userEmail}</p>
                                        </div>
                                    </div>

                                    {/* Menu Items */}
                                    <div className="space-y-1">
                                        <button 
                                            onClick={() => {
                                                setShowProfile(false);
                                                setShowProfileModal(true);
                                            }}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
                                        >
                                            <User size={18} />
                                            <span className="text-sm font-medium">{t('navbar.myProfile')}</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowProfile(false);
                                                navigate('/archive');
                                            }}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
                                        >
                                            <Archive size={18} />
                                            <span className="text-sm font-medium">{t('navbar.archiveLibrary')}</span>
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setShowProfile(false);
                                                setShowNotificationsModal(true);
                                            }}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Bell size={18} />
                                                <span className="text-sm font-medium">{t('navbar.notifications')}</span>
                                            </div>
                                            {unreadCount > 0 && (
                                                <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                    {unreadCount}
                                                </span>
                                            )}
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setShowProfile(false);
                                                setShowHelpModal(true);
                                            }}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
                                        >
                                            <HelpCircle size={18} />
                                            <span className="text-sm font-medium">{t('navbar.helpSupport')}</span>
                                        </button>
                                    </div>

                                    {/* Logout */}
                                    <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                        <button 
                                            onClick={handleLogout}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${darkMode ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-600'}`}
                                        >
                                            <LogOut size={18} />
                                            <span className="text-sm font-medium">{t('navbar.logout')}</span>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>

        {/* Floating Chatbot Bubble */}
        {!['/chatbot', '/login', '/unauthorized'].includes(location.pathname) && 
         !location.pathname.startsWith('/admin') && 
         !location.pathname.startsWith('/login') && 
         !location.pathname.startsWith('/unauthorized') && (
            <button
                onClick={() => navigate('/chatbot')}
                className={`fixed bottom-6 right-6 z-45 p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 active:scale-95 group flex items-center justify-center ${
                    userRole === 'Admin'
                        ? (darkMode
                            ? 'bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-indigo-900/40 hover:shadow-indigo-500/30'
                            : 'bg-gradient-to-tr from-indigo-500 to-violet-500 text-white shadow-indigo-200/50 hover:shadow-indigo-400/40')
                        : 'bg-blue-900 hover:bg-blue-800 text-white shadow-blue-900/40 hover:shadow-blue-500/30 border border-blue-800'
                }`}
                title="Chatbot IA"
            >
                <MessageSquare size={24} className="animate-pulse" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 text-xs font-semibold whitespace-nowrap">
                    Assistant Réunions IA
                </span>
            </button>
        )}

        {/* Profile Modal */}
        {showProfileModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                {/* Backdrop */}
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowProfileModal(false)}></div>
                
                {/* Content */}
                <div className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden p-6 z-10 transition-all transform animate-in fade-in zoom-in-95 duration-200 ${
                    darkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-100 text-gray-900'
                }`}>
                    {/* Header / Banner */}
                    <div className="absolute top-0 left-0 right-0 h-32 bg-blue-900"></div>
                    
                    {/* Close Button */}
                    <button 
                        onClick={() => setShowProfileModal(false)}
                        className={`absolute top-4 right-4 z-20 p-2 rounded-full transition-colors ${
                            darkMode ? 'bg-black/20 hover:bg-black/40 text-gray-400 hover:text-white' : 'bg-white/20 hover:bg-white/40 text-white hover:text-gray-200'
                        }`}
                    >
                        <X size={16} />
                    </button>
                    
                    {/* Avatar & Basic Info */}
                    <div className="relative pt-4 flex flex-col sm:flex-row items-center gap-4 mb-14 z-10 text-white">
                        <div 
                            className="rounded-full border-4 border-white/20 shadow-lg shrink-0 w-16 h-16 flex items-center justify-center text-white font-bold text-xl"
                            style={{ backgroundColor: '#F472B6' }}
                        >
                            {userInitials}
                        </div>
                        <div className="text-center sm:text-left flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <h2 className="text-2xl font-bold text-white">{userFullName}</h2>
                                <span className={`self-center sm:self-auto text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                                    userRole === 'Admin'
                                        ? 'bg-white/20 text-white border-white/30'
                                        : 'bg-white/10 text-blue-100 border-white/20'
                                }`}>
                                    {userRole === 'Admin' ? 'Administrateur' : 'Utilisateur Standard'}
                                </span>
                            </div>
                            <p className="text-sm text-blue-100">{userEmail}</p>
                        </div>
                    </div>
                    
                    <div className={`border-t my-6 ${darkMode ? 'border-gray-800' : 'border-gray-100'}`} />
                    
                    {/* Content Tabs / Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Side: Account Info */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2">
                                <Info size={14} /> {language === 'FR' ? 'Informations Générales' : 'General Information'}
                            </h3>
                            <div className={`p-4 rounded-xl space-y-3 ${darkMode ? 'bg-blue-950/10 border border-blue-900/30' : 'bg-blue-50/20 border border-blue-900/10'}`}>
                                <div>
                                    <span className="text-xs text-gray-500 block">{language === 'FR' ? 'Prénom' : 'First Name'}</span>
                                    <span className="text-sm font-medium">{userData.firstName || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 block">{language === 'FR' ? 'Nom' : 'Last Name'}</span>
                                    <span className="text-sm font-medium">{userData.lastName || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 block">Identifiant Unique (UUID)</span>
                                    <span className="text-xs font-mono text-gray-400 block truncate">{userData.id || '-'}</span>
                                </div>
                            </div>
                            
                            {userData.projects && userData.projects.length > 0 && (
                                <>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2">
                                        <Archive size={14} /> {language === 'FR' ? 'Projets Associés' : 'Associated Projects'}
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {userData.projects.map((proj) => (
                                            <span key={proj.id} className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                                                darkMode ? 'bg-blue-950/30 text-blue-300 border-blue-900/40' : 'bg-blue-50 text-blue-900 border-blue-900/20'
                                            }`}>
                                                {proj.name}
                                            </span>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        
                        {/* Right Side: Permissions */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2">
                                <Shield size={14} /> {language === 'FR' ? 'Permissions Accordées' : 'Granted Permissions'}
                            </h3>
                            
                            <div className={`p-4 rounded-xl max-h-[220px] overflow-y-auto space-y-2.5 ${darkMode ? 'bg-blue-950/10 border border-blue-900/30' : 'bg-blue-50/20 border border-blue-900/10'}`}>
                                {userRole === 'Admin' ? (
                                    <div className="flex items-start gap-3 py-1">
                                        <div className="text-indigo-400 mt-0.5"><Shield size={16} /></div>
                                        <div>
                                            <span className="text-sm font-semibold text-indigo-400 block">Super Administrateur</span>
                                            <span className="text-xs text-gray-500">Accès total à toutes les fonctionnalités et configurations sans restriction.</span>
                                        </div>
                                    </div>
                                ) : userData.permissions && userData.permissions.length > 0 ? (
                                    userData.permissions.map((perm) => {
                                        let friendlyName = perm;
                                        let friendlyDesc = "Permission spécifique accordée.";
                                        if (perm === 'meeting.upload') {
                                            friendlyName = language === 'FR' ? "Chargement & Enregistrement" : "Upload & Record Meetings";
                                            friendlyDesc = language === 'FR' ? "Importer ou enregistrer des réunions pour analyse." : "Upload or record audio for AI processing.";
                                        } else if (perm.includes('transcript.read')) {
                                            friendlyName = language === 'FR' ? "Lecture des Transcriptions" : "View Transcriptions";
                                            friendlyDesc = language === 'FR' ? "Voir et éditer les transcriptions écrites des réunions." : "View and edit voice transcription records.";
                                        } else if (perm.includes('pv.read')) {
                                            friendlyName = language === 'FR' ? "Lecture des Comptes-rendus (PV)" : "View Minutes (PV)";
                                            friendlyDesc = language === 'FR' ? "Consulter et éditer les documents officiels résumés par l'IA." : "View and edit minutes and official summaries.";
                                        } else if (perm.includes('analytics.self')) {
                                            friendlyName = language === 'FR' ? "Analytics Personnelles" : "Personal Analytics";
                                            friendlyDesc = language === 'FR' ? "Accès à ses propres statistiques et profils de parole." : "View personal speech stats and profiles.";
                                        } else if (perm.includes('analytics.others')) {
                                            friendlyName = language === 'FR' ? "Analytics d'Équipe" : "Team Analytics";
                                            friendlyDesc = language === 'FR' ? "Accès aux analyses comportementales de toute l'équipe." : "View psychometric profiles of other speakers.";
                                        }
                                        return (
                                            <div key={perm} className={`flex items-start gap-3 py-1.5 border-b border-dashed last:border-0 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                                                <div className="text-emerald-400 mt-0.5"><Check size={14} /></div>
                                                <div>
                                                    <span className="text-sm font-medium block">{friendlyName}</span>
                                                    <span className="text-xs text-gray-500">{friendlyDesc}</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-sm text-gray-500 py-2 italic text-center">Aucune permission spécifique. Contactez l'administrateur.</div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className={`border-t my-6 ${darkMode ? 'border-gray-800' : 'border-gray-100'}`} />
                    
                    {/* Footer */}
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowProfileModal(false)}
                            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors border ${
                                darkMode 
                                    ? 'bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 border-blue-800/50' 
                                    : 'bg-blue-900 text-white hover:bg-blue-800 border-blue-800'
                            }`}
                        >
                            {language === 'FR' ? 'Fermer' : 'Close'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Notifications Slide-Over Panel */}
        {showNotificationsModal && (
            <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
                {/* Backdrop */}
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNotificationsModal(false)}></div>
                
                {/* Drawer Panel */}
                <div className={`relative w-full max-w-md h-full shadow-2xl flex flex-col z-10 transition-transform transform animate-in slide-in-from-right duration-300 ${
                    darkMode ? 'bg-gray-900 border-l border-gray-800 text-white' : 'bg-white border-l border-gray-200 text-gray-900'
                }`}>
                    {/* Header */}
                    <div className={`p-4 border-b flex items-center justify-between ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                        <div className="flex items-center gap-2">
                            <Bell size={20} className="text-blue-500" />
                            <h2 className="text-lg font-bold">{t('navbar.notifications')}</h2>
                            {unreadCount > 0 && (
                                <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button 
                                    onClick={() => {
                                        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                                    }}
                                    className="text-xs text-blue-500 hover:text-blue-400 font-semibold transition-colors"
                                >
                                    {language === 'FR' ? 'Tout lire' : 'Mark all read'}
                                </button>
                            )}
                            <button 
                                onClick={() => setShowNotificationsModal(false)}
                                className={`p-1.5 rounded-full transition-colors ${
                                    darkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                    
                    {/* Notifications List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {notifications.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-2">
                                <Bell size={40} className="stroke-1 text-gray-600" />
                                <p className="text-sm font-medium">{language === 'FR' ? 'Aucune notification' : 'No notifications'}</p>
                                <p className="text-xs text-gray-600">{language === 'FR' ? 'Vous êtes à jour !' : 'You are all caught up!'}</p>
                            </div>
                        ) : (
                            notifications.map((notif) => {
                                const isRead = notif.read;
                                return (
                                    <div 
                                        key={notif.id}
                                        onClick={() => {
                                            if (!isRead) {
                                                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                                            }
                                        }}
                                        className={`p-4 rounded-xl border transition-all cursor-pointer relative group ${
                                            isRead 
                                                ? (darkMode ? 'bg-gray-950/20 border-gray-800/60 hover:bg-gray-950/40 text-gray-400' : 'bg-gray-55/55 border-gray-100 hover:bg-gray-50 text-gray-500')
                                                : (darkMode ? 'bg-blue-950/20 border-blue-900/40 hover:bg-blue-950/30' : 'bg-blue-50/40 border-blue-100/60 hover:bg-blue-50/60')
                                        }`}
                                    >
                                        {!isRead && (
                                            <span className="absolute top-4 right-4 h-2.5 w-2.5 bg-blue-500 rounded-full"></span>
                                        )}
                                        
                                        <div className="flex gap-3">
                                            <div className="mt-0.5">
                                                {notif.type === 'success' && <div className="text-emerald-500"><CheckSquare size={16} /></div>}
                                                {notif.type === 'info' && <div className="text-blue-500"><Info size={16} /></div>}
                                                {notif.type === 'analytics' && <div className="text-indigo-500"><BarChart2 size={16} /></div>}
                                                {notif.type === 'system' && <div className="text-amber-500"><Settings size={16} /></div>}
                                            </div>
                                            <div className="flex-1 pr-4">
                                                <h4 className={`text-sm font-bold ${isRead ? '' : (darkMode ? 'text-white' : 'text-gray-900')}`}>
                                                    {language === 'FR' ? notif.title : notif.titleEn}
                                                </h4>
                                                <p className="text-xs mt-1 leading-relaxed">
                                                    {language === 'FR' ? notif.message : notif.messageEn}
                                                </p>
                                                <span className="text-[10px] text-gray-500 mt-2 block">
                                                    {language === 'FR' ? notif.timeFr : notif.time}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setNotifications(prev => prev.filter(n => n.id !== notif.id));
                                            }}
                                            className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/10 text-red-500/80 hover:text-red-500"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    
                    {/* Drawer Footer */}
                    {notifications.length > 0 && (
                        <div className={`p-4 border-t flex gap-2 ${darkMode ? 'border-gray-800 bg-gray-950/20' : 'border-gray-200 bg-gray-50/40'}`}>
                            <button
                                onClick={() => setNotifications([])}
                                className={`w-full py-2 text-xs font-semibold rounded-lg border transition-colors ${
                                    darkMode ? 'border-gray-800 hover:bg-gray-800 text-gray-400 hover:text-white' : 'border-gray-200 hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                {language === 'FR' ? 'Effacer tout' : 'Clear all'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Help & Support Modal */}
        {showHelpModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                {/* Backdrop */}
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHelpModal(false)}></div>
                
                {/* Help Panel */}
                <div className={`relative w-full max-w-4xl h-[600px] rounded-2xl border shadow-2xl overflow-hidden flex flex-col z-10 transition-all transform animate-in fade-in zoom-in-95 duration-200 ${
                    darkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-100 text-gray-900'
                }`}>
                    {/* Header */}
                    <div className={`p-4 border-b flex items-center justify-between bg-gradient-to-r ${
                        darkMode ? 'from-gray-950 to-gray-900 border-gray-800' : 'from-gray-50 to-white border-gray-200'
                    }`}>
                        <div className="flex items-center gap-2">
                            <HelpCircle size={22} className="text-blue-500" />
                            <div>
                                <h2 className="text-lg font-bold">{t('navbar.helpSupport')}</h2>
                                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {language === 'FR' ? 'Guide d\'utilisation de la plateforme MeetingIA' : 'User guide for the MeetingIA platform'}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowHelpModal(false)}
                            className={`p-1.5 rounded-full transition-colors ${
                                darkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            <X size={18} />
                        </button>
                    </div>
                    
                    {/* Modal Body */}
                    <div className="flex-1 flex overflow-hidden">
                        {/* Left Sidebar */}
                        <div className={`w-64 border-r p-3 flex flex-col gap-1 overflow-y-auto ${
                            darkMode ? 'bg-gray-950/40 border-gray-800' : 'bg-gray-50/40 border-gray-200'
                        }`}>
                            {[
                                { id: 'intro', label: language === 'FR' ? 'Enregistrement' : 'Recording' },
                                { id: 'transcription', label: language === 'FR' ? 'Transcription' : 'Transcription' },
                                { id: 'pv', label: language === 'FR' ? 'Procès-Verbal (PV)' : 'Meeting Minutes (PV)' },
                                { id: 'analytics', label: language === 'FR' ? 'Analyses comportementales' : 'Behavioral Analytics' },
                                { id: 'shortcuts', label: language === 'FR' ? 'Raccourcis & FAQ' : 'Shortcuts & FAQ' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setHelpTab(tab.id)}
                                    className={`w-full px-3 py-2.5 rounded-lg text-left text-sm font-semibold transition-all ${
                                        helpTab === tab.id
                                            ? (darkMode ? 'bg-blue-600/20 text-blue-400 border border-blue-800/40 shadow-sm' : 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm')
                                            : (darkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200 border border-transparent' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-transparent')
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        
                        {/* Right Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {helpTab === 'intro' && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <h3 className="text-xl font-bold">{language === 'FR' ? 'Importation Audio & Enregistrement Direct' : 'Audio Import & Live Recording'}</h3>
                                    <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {language === 'FR' 
                                            ? 'La plateforme MeetingIA vous permet de capturer des réunions en direct ou d\'importer des enregistrements existants pour traitement par intelligence artificielle.' 
                                            : 'The MeetingIA platform allows you to capture live meetings or import existing recordings for processing by artificial intelligence.'}
                                    </p>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-950/40 border-gray-800' : 'bg-gray-55/55 border-gray-100'}`}>
                                            <h4 className="font-bold text-sm mb-2">{language === 'FR' ? 'Téléversement de fichiers' : 'File Upload'}</h4>
                                            <ul className="text-xs space-y-1.5 text-gray-500 list-disc list-inside">
                                                <li>Formats supportés : MP3, WAV, M4A.</li>
                                                <li>Taille maximum de fichier : 50 Mo.</li>
                                                <li>Idéal pour les réunions enregistrées sur dictaphone ou Teams/Zoom.</li>
                                            </ul>
                                        </div>
                                        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-950/40 border-gray-800' : 'bg-gray-55/55 border-gray-100'}`}>
                                            <h4 className="font-bold text-sm mb-2">{language === 'FR' ? 'Enregistrement Live' : 'Live Recording'}</h4>
                                            <ul className="text-xs space-y-1.5 text-gray-500 list-disc list-inside">
                                                <li>Enregistrez directement à partir du micro de votre PC/Mac.</li>
                                                <li>Visualisez le spectre sonore en temps réel.</li>
                                                <li>Recommandé : Utilisez un micro omnidirectionnel de table pour de meilleurs résultats.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {helpTab === 'transcription' && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <h3 className="text-xl font-bold">{language === 'FR' ? 'Transcription & Identification des Locuteurs' : 'Transcription & Speaker Identification'}</h3>
                                    <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {language === 'FR'
                                            ? 'Une fois l\'audio envoyé, l\'algorithme de diarisation identifie chaque participant individuellement (Locuteur A, B, etc.) et retranscrit fidèlement leurs propos.'
                                            : 'Once the audio is uploaded, the diarization algorithm identifies each participant individually (Speaker A, B, etc.) and transcribes their speech verbatim.'}
                                    </p>
                                    
                                    <div className="space-y-3 pt-2">
                                        <div className="flex gap-3">
                                            <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                                            <div>
                                                <h4 className="font-bold text-sm">{language === 'FR' ? 'Renommer les Intervenants' : 'Rename Speakers'}</h4>
                                                <p className="text-xs text-gray-500 mt-0.5">{language === 'FR' ? 'Modifiez le nom des locuteurs détectés en une seule fois pour toutes leurs interventions.' : 'Edit the name of detected speakers once to update all their interventions.'}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                                            <div>
                                                <h4 className="font-bold text-sm">{language === 'FR' ? 'Édition Interactive' : 'Interactive Editing'}</h4>
                                                <p className="text-xs text-gray-500 mt-0.5">{language === 'FR' ? 'Cliquez sur n\'importe quel segment textuel pour corriger des fautes de frappe ou des termes techniques.' : 'Click on any text segment to correct typing mistakes or technical terminology.'}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</div>
                                            <div>
                                                <h4 className="font-bold text-sm">{language === 'FR' ? 'Traduction Intégrée' : 'Integrated Translation'}</h4>
                                                <p className="text-xs text-gray-500 mt-0.5">{language === 'FR' ? 'Traduisez instantanément la transcription en Anglais ou en Français en conservant les locuteurs.' : 'Instantly translate the transcript into English or French while preserving speaker identities.'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {helpTab === 'pv' && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <h3 className="text-xl font-bold">{language === 'FR' ? 'Génération automatique de Procès-Verbal (PV)' : 'Automatic Meeting Minutes Generation'}</h3>
                                    <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {language === 'FR'
                                            ? 'Le système analyse le fond des discussions pour extraire les faits marquants, rédiger un résumé exécutif et organiser les points clés, décisions et actions.'
                                            : 'The system analyzes the core discussions to extract highlights, write an executive summary, and structure key points, decisions, and action items.'}
                                    </p>
                                    
                                    <div className="space-y-3 pt-2">
                                        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-950/40 border-gray-800' : 'bg-gray-55/55 border-gray-100'}`}>
                                            <h4 className="font-bold text-sm mb-1">{language === 'FR' ? 'Personnalisation de la Rédaction' : 'Custom Drafting Options'}</h4>
                                            <p className="text-xs text-gray-500">
                                                {language === 'FR' 
                                                    ? 'Choisissez le modèle d\'IA (rapide ou avancé), la langue de rédaction et le format (court, standard ou détaillé).' 
                                                    : 'Select the AI model (fast or advanced), the output language, and the format length (short, standard, or detailed).'}
                                            </p>
                                        </div>
                                        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-950/40 border-gray-800' : 'bg-gray-55/55 border-gray-100'}`}>
                                            <h4 className="font-bold text-sm mb-1">{language === 'FR' ? 'Actions & Décisions' : 'Actions & Decisions'}</h4>
                                            <p className="text-xs text-gray-500">
                                                {language === 'FR'
                                                    ? 'Attribuez des tâches aux participants avec des dates d\'échéance et des niveaux de priorité directement dans le tableau des actions.'
                                                    : 'Assign tasks to participants with due dates and priority levels directly inside the action items table.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {helpTab === 'analytics' && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <h3 className="text-xl font-bold">{language === 'FR' ? 'Analyses comportementales avancées' : 'Advanced Behavioral Analytics'}</h3>
                                    <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {language === 'FR'
                                            ? 'Visualisez les dynamiques d\'équipe basées sur la structure de l\'échange de parole, le rythme, le stress et les interactions.'
                                            : 'Visualize team dynamics based on speech patterns, pacing, estimated stress, and inter-speaker dynamics.'}
                                    </p>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                        <div className="space-y-2">
                                            <h4 className="font-bold text-sm">{language === 'FR' ? 'Métriques clés :' : 'Key metrics:'}</h4>
                                            <ul className="text-xs space-y-1.5 text-gray-500 list-disc list-inside">
                                                <li><strong>{language === 'FR' ? 'Temps de parole :' : 'Talk Time:'}</strong> {language === 'FR' ? 'Pourcentage de parole de chaque personne.' : 'Percentage of overall meeting speech.'}</li>
                                                <li><strong>{language === 'FR' ? 'Monopolisation :' : 'Monopolization:'}</strong> {language === 'FR' ? 'Tendance à couper la parole ou à monopoliser le flux.' : 'Propensity to hog or dominate the floor.'}</li>
                                                <li><strong>{language === 'FR' ? 'Stress :' : 'Stress Level:'}</strong> {language === 'FR' ? 'Détection vocale et sémantique de la tension.' : 'Semantic and vocal indicators of speech tension.'}</li>
                                            </ul>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="font-bold text-sm">{language === 'FR' ? 'Recommandations IA :' : 'AI Recommendations:'}</h4>
                                            <p className="text-xs text-gray-500 leading-relaxed">
                                                {language === 'FR'
                                                    ? 'L\'IA fournit des conseils personnalisés pour améliorer l\'engagement et l\'inclusion de chaque intervenant dans les réunions futures.'
                                                    : 'The AI provides customized recommendations to improve the inclusion and engagement of each speaker in future meetings.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {helpTab === 'shortcuts' && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <h3 className="text-xl font-bold">{language === 'FR' ? 'Raccourcis Clavier & FAQ' : 'Keyboard Shortcuts & FAQ'}</h3>
                                    
                                    <div className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-950/40 border-gray-800' : 'bg-gray-55/55 border-gray-100'}`}>
                                        <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                                            <Keyboard size={16} /> {language === 'FR' ? 'Raccourcis dans l\'éditeur' : 'Editor Shortcuts'}
                                        </h4>
                                        <div className="grid grid-cols-2 gap-y-2 text-xs">
                                            <div className="font-semibold text-gray-400">Ctrl + Z</div>
                                            <div>{language === 'FR' ? 'Annuler la dernière modification' : 'Undo last modification'}</div>
                                            <div className="font-semibold text-gray-400">Ctrl + Y</div>
                                            <div>{language === 'FR' ? 'Rétablir la modification annulée' : 'Redo last modification'}</div>
                                            <div className="font-semibold text-gray-400">Space (hors saisie)</div>
                                            <div>{language === 'FR' ? 'Lecture / Pause du fichier audio' : 'Play / Pause audio track'}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-sm">{language === 'FR' ? 'Sécurité des données :' : 'Data Security:'}</h4>
                                        <p className="text-xs text-gray-500 leading-relaxed">
                                            {language === 'FR'
                                                ? 'Vos enregistrements et rapports sont stockés localement sur un serveur sécurisé. Conforme RGPD, aucune donnée n\'est revendue ou partagée avec des tiers pour l\'entraînement de modèles publics.'
                                                : 'Your recordings and files are processed using highly secure localized endpoints. Under GDPR compliance, no audio or summary information is ever sold or utilized for training third-party public models.'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Footer */}
                    <div className={`p-4 border-t flex justify-end gap-3 bg-gradient-to-r ${
                        darkMode ? 'from-gray-950 to-gray-900 border-gray-800' : 'from-gray-50 to-white border-gray-200'
                    }`}>
                        <button
                            onClick={() => setShowHelpModal(false)}
                            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                                darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                        >
                            {language === 'FR' ? 'Fermer' : 'Close'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default Navbar;
