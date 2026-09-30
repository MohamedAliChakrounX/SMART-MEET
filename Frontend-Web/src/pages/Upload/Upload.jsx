import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, ShieldCheck, ChevronRight, ChevronLeft, CloudUpload, FileAudio, X, Loader, ShieldAlert, Building2, Users, Folder, ChevronDown } from 'lucide-react';
import Navbar from '../../components/Navbar/Navbar';
import { useMeeting } from '../../context/MeetingContext';
import { useI18n } from '../../i18n/useI18n';
import api from '../../services/api';

const Upload = ({ isEmbedded = false, onNavigate }) => {
    const navigate = useNavigate();
    const { setAudioFile, setCurrentMeetingId, setTranscript, darkMode } = useMeeting();
    const { t } = useI18n();
    const [dragging, setDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [departments, setDepartments] = useState([]);
    const [teams, setTeams] = useState([]);
    const [projects, setProjects] = useState([]);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const timerRef = React.useRef(null);

    const userDataStr = localStorage.getItem('user_data');
    const user = userDataStr ? JSON.parse(userDataStr) : null;
    const isAdmin = user?.roles?.includes('ROLE_ADMIN');
    const canUpload = user?.roles?.includes('ROLE_ADMIN') || user?.permissions?.includes('meeting.upload');
    const userProjects = Array.isArray(user?.projects)
        ? user.projects.filter((p) => p && p.id && p.name)
        : [];
    const userProjectIds = Array.isArray(user?.projectIds) ? user.projectIds.filter(Boolean) : [];
    const hasProjectSelection = isAdmin || userProjects.length > 0 || userProjectIds.length > 0;
    const isProjectValid = !hasProjectSelection || !!selectedProjectId;
    const visibleTeams = selectedDepartmentId
        ? teams.filter((team) => (team.department?.id ?? team.departmentId) === selectedDepartmentId)
        : [];
    const visibleProjects = selectedTeamId
        ? projects.filter((project) =>
            Array.isArray(project.teams) && project.teams.some((team) => team.id === selectedTeamId)
        )
        : [];

    if (!canUpload) {
        return (
            <div className={`flex flex-col items-center justify-center min-h-screen p-8 text-center transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
                <ShieldAlert size={64} className="text-red-500 mb-6" />
                <h1 className="text-2xl font-bold mb-4">{t('upload.unauthorized')}</h1>
                <p className={`max-w-md mx-auto mb-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t('upload.unauthorizedDesc')}
                </p>
                <button 
                    onClick={() => navigate('/')} 
                    className="bg-blue-900 hover:bg-blue-800 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-blue-900/30 transition-all active:scale-95"
                >
                    {t('upload.backToDashboard')}
                </button>
            </div>
        );
    }

    // Prevent default drag behavior on the window
    React.useEffect(() => {
        const preventDefault = (e) => e.preventDefault();
        window.addEventListener('dragover', preventDefault);
        window.addEventListener('drop', preventDefault);
        return () => {
            window.removeEventListener('dragover', preventDefault);
            window.removeEventListener('drop', preventDefault);
        };
    }, []);

    // Timer effect
    React.useEffect(() => {
        if (isRecording) {
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isRecording]);

    React.useEffect(() => {
        const fetchOrganisationFilters = async () => {
            if (!isAdmin) return;
            try {
                const [deptRes, teamRes, projectRes] = await Promise.all([
                    api.get('/admin/organisation/departments'),
                    api.get('/admin/organisation/teams'),
                    api.get('/admin/organisation/projects'),
                ]);
                setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
                setTeams(Array.isArray(teamRes.data) ? teamRes.data : []);
                setProjects(Array.isArray(projectRes.data) ? projectRes.data : []);
            } catch (err) {
                console.error('Failed to load organisation filters:', err);
            }
        };

        fetchOrganisationFilters();
    }, [isAdmin]);



    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            setMediaRecorder(recorder);

            const chunks = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const file = new File([blob], `recording_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.webm`, { type: 'audio/webm' });
                handleFile(file);
                setRecordingTime(0);
                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please ensure you have granted permission.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            setIsRecording(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFile(file);
        }
    };

    const handleFile = (file) => {
        console.log('File selected:', file);
        setSelectedFile(file);
    };

    const removeFile = (e) => {
        e.stopPropagation();
        setSelectedFile(null);
    };

    const handleNext = async () => {
        if (!selectedFile || !isProjectValid) return;

        setUploading(true);
        setUploadError(null);

        // Keep local audio URL for the player
        const fileUrl = URL.createObjectURL(selectedFile);
        const audioCreatedAtMs = typeof selectedFile.lastModified === 'number' && selectedFile.lastModified > 0
            ? selectedFile.lastModified
            : Date.now();
        setAudioFile({
            file: selectedFile,
            url: fileUrl,
            lastModified: audioCreatedAtMs,
            audioCreatedAt: new Date(audioCreatedAtMs).toISOString(),
            uploadedAt: new Date().toISOString(),
        });

        try {
            const selectedProject =
                userProjects.find((p) => p.id === selectedProjectId) ||
                projects.find((p) => p.id === selectedProjectId);
            if (selectedProjectId) {
                localStorage.setItem('selected_project_id', selectedProjectId);
                localStorage.setItem('selected_project_name', selectedProject?.name || '');
            } else {
                localStorage.removeItem('selected_project_id');
                localStorage.removeItem('selected_project_name');
            }

            const formData = new FormData();
            formData.append('audio', selectedFile);
            formData.append('title', selectedFile.name.replace(/\.[^/.]+$/, ''));
            // Send the audio file's original creation/modification date
            // so Flask stores the real meeting date instead of today's date
            formData.append('audioCreatedAt', new Date(audioCreatedAtMs).toISOString());
            if (selectedProjectId) {
                formData.append('projectId', selectedProjectId);
            }

            const response = await api.post('/meetings/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const meetingId = response.data?.meetingId;
            if (meetingId) {
                if (selectedProjectId) {
                    const rawMap = localStorage.getItem('meeting_project_map');
                    const meetingProjectMap = rawMap ? JSON.parse(rawMap) : {};
                    meetingProjectMap[String(meetingId)] = {
                        projectId: selectedProjectId,
                        projectName: selectedProject?.name || '',
                    };
                    localStorage.setItem('meeting_project_map', JSON.stringify(meetingProjectMap));
                }

                // Clear stale transcript from previous session before navigating
                setTranscript([]);
                localStorage.removeItem('meeting_transcript');
                setCurrentMeetingId(meetingId);
                if (isEmbedded && onNavigate) {
                    onNavigate('transcription', meetingId);
                } else {
                    navigate(`/transcription?meetingId=${meetingId}`);
                }
            } else {
                throw new Error('No meetingId returned from server');
            }
        } catch (err) {
            console.error('Upload failed:', err);
            setUploadError(err.response?.data?.error || err.message || 'Upload failed');
            setUploading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const content = (
        <main className={`flex-1 overflow-y-auto no-scrollbar transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-[#F9FAFB]'}`}>
            <div className="p-8">
                        {/* Breadcrumbs Removed */}

                        <div className="max-w-4xl mx-auto">
                            <div className="mb-4">
                                <button
                                    onClick={() => isEmbedded && onNavigate ? onNavigate('back') : navigate(-1)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-300 transform active:scale-95 group ${
                                        darkMode
                                            ? 'bg-gray-800 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-750 hover:border-gray-650'
                                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 hover:border-slate-300'
                                    }`}
                                    title="Retour à la page précédente"
                                >
                                    <ChevronLeft size={14} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
                                    <span>Retour</span>
                                </button>
                            </div>
                            <h1 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('upload.title')}</h1>
                            <p className={`mb-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('upload.subtitle')}</p>
                            
                            {hasProjectSelection && (
                                <div className="mb-8">
                                    {isAdmin ? (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {/* Department Select */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className={`text-[10px] font-bold uppercase tracking-wider ml-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {t('archive.department')}
                                                </label>
                                                <div className="relative group">
                                                    <Building2 size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${darkMode ? 'text-gray-500 group-hover:text-blue-400' : 'text-gray-400 group-hover:text-blue-900'}`} />
                                                    <select
                                                        value={selectedDepartmentId}
                                                        onChange={(e) => {
                                                            setSelectedDepartmentId(e.target.value);
                                                            setSelectedTeamId('');
                                                            setSelectedProjectId('');
                                                        }}
                                                        className={`w-full pl-11 pr-10 py-3 text-sm appearance-none border rounded-xl outline-none transition-all cursor-pointer ${
                                                            darkMode 
                                                            ? 'bg-gray-800 border-gray-700 text-gray-100 focus:border-blue-900 focus:ring-4 focus:ring-blue-900/20' 
                                                            : 'bg-white border-gray-200 text-gray-900 hover:border-gray-300 focus:border-blue-900 focus:ring-4 focus:ring-blue-900/5'
                                                        }`}
                                                    >
                                                        <option value="">{t('upload.selectDept')}</option>
                                                        {departments.map((department) => (
                                                            <option key={department.id} value={department.id}>
                                                                {department.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                                                </div>
                                            </div>

                                            {/* Team Select */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className={`text-[10px] font-bold uppercase tracking-wider ml-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {t('archive.team')}
                                                </label>
                                                <div className="relative group">
                                                    <Users size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${darkMode ? 'text-gray-500 group-hover:text-blue-400' : 'text-gray-400 group-hover:text-blue-900'}`} />
                                                    <select
                                                        value={selectedTeamId}
                                                        onChange={(e) => {
                                                            setSelectedTeamId(e.target.value);
                                                            setSelectedProjectId('');
                                                        }}
                                                        disabled={!selectedDepartmentId}
                                                        className={`w-full pl-11 pr-10 py-3 text-sm appearance-none border rounded-xl outline-none transition-all cursor-pointer ${
                                                            darkMode 
                                                            ? 'bg-gray-800 border-gray-700 text-gray-100 focus:border-blue-900 focus:ring-4 focus:ring-blue-900/20 disabled:opacity-40 disabled:cursor-not-allowed' 
                                                            : 'bg-white border-gray-200 text-gray-900 hover:border-gray-300 focus:border-blue-900 focus:ring-4 focus:ring-blue-900/5 disabled:opacity-50 disabled:cursor-not-allowed'
                                                        }`}
                                                    >
                                                        <option value="">{t('upload.selectTeam')}</option>
                                                        {visibleTeams.map((team) => (
                                                            <option key={team.id} value={team.id}>
                                                                {team.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                                                </div>
                                            </div>

                                            {/* Project Select */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className={`text-[10px] font-bold uppercase tracking-wider ml-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {t('archive.project')}
                                                </label>
                                                <div className="relative group">
                                                    <Folder size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${darkMode ? 'text-gray-500 group-hover:text-blue-400' : 'text-gray-400 group-hover:text-blue-900'}`} />
                                                    <select
                                                        value={selectedProjectId}
                                                        onChange={(e) => setSelectedProjectId(e.target.value)}
                                                        disabled={!selectedTeamId}
                                                        className={`w-full pl-11 pr-10 py-3 text-sm appearance-none border rounded-xl outline-none transition-all cursor-pointer ${
                                                            darkMode 
                                                            ? 'bg-gray-800 border-gray-700 text-gray-100 focus:border-blue-900 focus:ring-4 focus:ring-blue-900/20 disabled:opacity-40 disabled:cursor-not-allowed' 
                                                            : 'bg-white border-gray-200 text-gray-900 hover:border-gray-300 focus:border-blue-900 focus:ring-4 focus:ring-blue-900/5 disabled:opacity-50 disabled:cursor-not-allowed'
                                                        }`}
                                                    >
                                                        <option value="">{t('upload.selectProject')}</option>
                                                        {visibleProjects.map((project) => (
                                                            <option key={project.id} value={project.id}>
                                                                {project.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1.5 max-w-md">
                                            <label className={`text-[10px] font-bold uppercase tracking-wider ml-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                Projet
                                            </label>
                                            <div className="relative group">
                                                <Folder size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${darkMode ? 'text-gray-500 group-hover:text-blue-400' : 'text-gray-400 group-hover:text-blue-900'}`} />
                                                <select
                                                    value={selectedProjectId}
                                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                                    className={`w-full pl-11 pr-10 py-3 text-sm appearance-none border rounded-xl outline-none transition-all cursor-pointer ${
                                                        darkMode 
                                                        ? 'bg-gray-800 border-gray-700 text-gray-100 focus:border-blue-900 focus:ring-4 focus:ring-blue-900/20' 
                                                        : 'bg-white border-gray-200 text-gray-900 hover:border-gray-300 focus:border-blue-900 focus:ring-4 focus:ring-blue-900/5'
                                                    }`}
                                                >
                                                    <option value="">Sélectionnez un projet</option>
                                                    {userProjects.length > 0
                                                        ? userProjects.map((project) => (
                                                            <option key={project.id} value={project.id}>
                                                                {project.name}
                                                            </option>
                                                        ))
                                                        : userProjectIds.map((projectId) => (
                                                            <option key={projectId} value={projectId}>
                                                                {projectId}
                                                            </option>
                                                        ))}
                                                </select>
                                                <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                {/* Upload Card */}
                                <div className={`p-8 rounded-xl border shadow-sm flex flex-col transition-colors duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                                            <CloudUpload size={20} className="text-blue-900" />
                                        </div>
                                        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('upload.uploadCardTitle')}</h3>
                                    </div>

                                    <div
                                        className={`relative flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 transition-colors ${dragging
                                            ? 'border-blue-900 bg-blue-50 dark:bg-blue-900/20'
                                            : darkMode
                                                ? 'border-gray-700 bg-gray-800 hover:border-blue-900/50 hover:bg-gray-800/80'
                                                : 'border-gray-200 bg-gray-50 hover:border-blue-900 hover:bg-blue-50/50'
                                            } ${selectedFile ? (darkMode ? 'bg-blue-900/20 border-blue-900' : 'bg-blue-50 border-blue-900 hover:border-blue-900 hover:bg-blue-50') : ''}`}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                    >
                                        {selectedFile ? (
                                            <div className="w-full h-full flex flex-col items-center justify-center relative">
                                                <button
                                                    onClick={removeFile}
                                                    className={`absolute -top-4 -right-4 rounded-full p-1 border transition-colors z-20 cursor-pointer ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-900' : 'bg-white border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200'}`}
                                                >
                                                    <X size={16} />
                                                </button>
                                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-900'}`}>
                                                    <FileAudio size={32} />
                                                </div>
                                                <p className={`text-sm font-semibold mb-1 max-w-[200px] truncate text-center ${darkMode ? 'text-gray-200' : 'text-gray-900'}`} title={selectedFile.name}>{selectedFile.name}</p>
                                                <p className={`text-xs font-medium px-2 py-1 rounded-full ${darkMode ? 'text-blue-300 bg-blue-900/30' : 'text-blue-900 bg-blue-100'}`}>{formatFileSize(selectedFile.size)}</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                                                    <CloudUpload size={24} className="text-blue-900" />
                                                </div>
                                                <p className={`text-sm font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{t('upload.dragDropHint')}</p>
                                                <p className={`text-xs mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{t('upload.fileTypesHint')}</p>

                                                <div className="flex gap-2">
                                                    <span className={`px-2 py-1 border rounded text-[10px] ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}>MP3</span>
                                                    <span className={`px-2 py-1 border rounded text-[10px] ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}>WAV</span>
                                                    <span className={`px-2 py-1 border rounded text-[10px] ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}>M4A</span>
                                                </div>
                                                <input
                                                    type="file"
                                                    accept=".mp3,.wav,.m4a"
                                                    onChange={handleFileSelect}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Live Recording Card */}
                                <div className={`p-8 rounded-xl border shadow-sm flex flex-col transition-colors duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className={`p-2 rounded-lg ${darkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
                                            <Mic size={20} className="text-red-500" />
                                        </div>
                                        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('upload.liveCardTitle')}</h3>
                                    </div>

                                    <div className={`flex-1 rounded-xl flex flex-col items-center justify-center p-8 relative overflow-hidden transition-all duration-300 ${darkMode ? 'bg-gray-950 border border-gray-800' : 'bg-[#111827]'}`}>
                                        {isRecording ? (
                                            <>
                                                <div className="flex gap-1 items-center justify-center h-12 mb-6">
                                                    {[...Array(5)].map((_, i) => (
                                                        <div
                                                            key={i}
                                                            className="w-1.5 bg-red-500 rounded-full"
                                                            style={{
                                                                height: `${Math.random() * 24 + 12}px`,
                                                                animation: 'pulse 0.5s infinite alternate',
                                                                animationDelay: `${i * 0.1}s`
                                                            }}
                                                        ></div>
                                                    ))}
                                                </div>
                                                <div className="text-2xl font-mono text-white mb-6 font-bold tabular-nums tracking-widest">
                                                    {formatTime(recordingTime)}
                                                </div>
                                                <button
                                                    onClick={stopRecording}
                                                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-medium transition-colors shadow-lg shadow-red-900/50 cursor-pointer animate-pulse"
                                                >
                                                    <div className="w-3 h-3 bg-white rounded-sm"></div>
                                                    {t('upload.stopRecording')}
                                                </button>
                                                <p className="text-xs text-red-400 mt-4 animate-pulse">{t('upload.recordingInProgress')}</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex gap-1 items-center justify-center h-8 mb-8 opacity-70">
                                                    <div className="w-1 h-3 bg-blue-900 rounded-full animate-pulse"></div>
                                                    <div className="w-1 h-5 bg-blue-900 rounded-full animate-pulse decoration-delay-75"></div>
                                                    <div className="w-1 h-8 bg-blue-900 rounded-full animate-pulse decoration-delay-150"></div>
                                                    <div className="w-1 h-5 bg-blue-900 rounded-full animate-pulse decoration-delay-75"></div>
                                                    <div className="w-1 h-3 bg-blue-900 rounded-full animate-pulse"></div>
                                                </div>
                                                <button
                                                    onClick={startRecording}
                                                    className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-6 py-2.5 rounded-full font-medium transition-colors shadow-lg shadow-blue-900/50 cursor-pointer"
                                                >
                                                    <div className="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center">
                                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                                    </div>
                                                    {t('upload.recordNow')}
                                                </button>

                                                <p className="text-xs text-slate-400 mt-6 text-center max-w-[200px]">
                                                    {t('upload.micHint')}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Bar */}
                            <div className={`border rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-300 ${darkMode ? 'bg-blue-950/20 border-blue-900/50' : 'bg-blue-50/50 border-blue-100'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm ${darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-white text-blue-900'}`}>
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <h4 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('upload.secureTitle')}</h4>
                                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('upload.secureDesc')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <button
                                        onClick={() => isEmbedded && onNavigate ? onNavigate('back') : navigate(-1)}
                                        className={`px-4 py-2 text-sm font-medium transition-colors ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    {uploadError && (
                                        <p className="text-red-500 text-xs text-center w-full mb-1">{uploadError}</p>
                                    )}
                                    <button
                                        onClick={handleNext}
                                        disabled={!selectedFile || uploading || !isProjectValid}
                                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${selectedFile && !uploading && isProjectValid
                                                ? 'bg-blue-900 hover:bg-blue-800 text-white shadow-lg shadow-blue-900/30 cursor-pointer'
                                                : (darkMode ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                                            }`}
                                    >
                                        {uploading ? (
                                            <><Loader size={16} className="animate-spin" /> {t('upload.uploading')}</>
                                        ) : (
                                            <>{t('upload.nextStep')} <ChevronRight size={16} /></>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="text-center mt-6">
                                <p className={`text-[10px] italic ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {t('upload.termsHint')}
                                </p>
                            </div>
                        </div>
                    </div>
                </main>
    );

    if (isEmbedded) return content;

    return (
        <div className={`flex flex-col min-h-screen font-sans text-slate-600 transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-slate-300' : 'bg-[#F9FAFB]'}`}>
            <Navbar currentStep={1} />
            <div className="flex flex-1 overflow-hidden">
                {content}
            </div>
        </div>
    );
};

export default Upload;
