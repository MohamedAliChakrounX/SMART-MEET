import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, Star, MoreVertical, Eye, Download, Share2, Calendar, HardDrive, Plus, FileText, Trash2, FileSpreadsheet, FileType, Building2, Users, Folder, ChevronDown } from 'lucide-react';
import Navbar from '../../components/Navbar/Navbar';
import Badge from '../../components/Badge/Badge';
import Avatar from '../../components/Avatar/Avatar';
import { useMeeting } from '../../context/MeetingContext';
import api from '../../services/api';
import { useI18n } from '../../i18n/useI18n';

const ArchiveLibrary = ({ isEmbedded = false, onMeetingSelect, onNewMeeting }) => {
    const navigate = useNavigate();
    const { setCurrentMeeting, setCurrentMeetingId, darkMode } = useMeeting();
    const { t, locale } = useI18n();
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [activeDownloadId, setActiveDownloadId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [teams, setTeams] = useState([]);
    const [projects, setProjects] = useState([]);
    const [selectedDepartment, setSelectedDepartment] = useState('all');
    const [selectedTeam, setSelectedTeam] = useState('all');
    const [selectedProject, setSelectedProject] = useState('all');
    const [downloadingId, setDownloadingId] = useState(null);
    const observerTarget = useRef(null);
    const datePickerRef = useRef(null);

    // Date Range filter state
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateFilterType, setDateFilterType] = useState('meeting'); // 'meeting' | 'pv'
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [appliedDateFilter, setAppliedDateFilter] = useState(null); // { type, from, to }

    // Load meetings from Symfony API
    const fetchMeetings = useCallback(async (page = 1, deptId, teamId, projId) => {
        try {
            const params = { page, limit: 20 };
            if (deptId && deptId !== 'all') params.departmentId = deptId;
            if (teamId && teamId !== 'all') params.teamId = teamId;
            if (projId && projId !== 'all') params.projectId = projId;

            const response = await api.get('/meetings', { params });
            if (page === 1) {
                setMeetings(response.data.data ?? []);
            } else {
                setMeetings(prev => [...prev, ...(response.data.data ?? [])]);
            }
            setCurrentPage(page);
            setTotalPages(response.data.meta?.totalPages ?? 1);
            setLoading(false);
            setLoadingMore(false);
        } catch (error) {
            console.error('Failed to fetch meetings:', error);
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    // Initial load + re-fetch when org filters change
    useEffect(() => {
        setLoading(true);
        fetchMeetings(1, selectedDepartment, selectedTeam, selectedProject);
    }, [fetchMeetings, selectedDepartment, selectedTeam, selectedProject]);

    useEffect(() => {
        const fetchOrganisationFilters = async () => {
            try {
                const [deptRes, teamRes, projectRes] = await Promise.allSettled([
                    api.get('/admin/organisation/departments'),
                    api.get('/admin/organisation/teams'),
                    api.get('/admin/organisation/projects'),
                ]);

                if (deptRes.status === 'fulfilled') {
                    setDepartments(Array.isArray(deptRes.value.data) ? deptRes.value.data : []);
                }
                if (teamRes.status === 'fulfilled') {
                    setTeams(Array.isArray(teamRes.value.data) ? teamRes.value.data : []);
                }
                if (projectRes.status === 'fulfilled') {
                    setProjects(Array.isArray(projectRes.value.data) ? projectRes.value.data : []);
                }
            } catch (error) {
                console.error('Failed to fetch organisation filters:', error);
            }
        };

        fetchOrganisationFilters();
    }, []);

    // Infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && currentPage < totalPages && !loadingMore) {
                    setLoadingMore(true);
                    fetchMeetings(currentPage + 1, selectedDepartment, selectedTeam, selectedProject);
                }
            },
            { threshold: 0.1 }
        );
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [currentPage, totalPages, loadingMore, fetchMeetings, selectedDepartment, selectedTeam, selectedProject]);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            setActiveMenuId(null);
            setActiveDownloadId(null);
            if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
                setShowDatePicker(false);
            }
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const handleDownloadFormat = async (e, formatLabel, meeting) => {
        e.stopPropagation();
        setActiveDownloadId(null);

        // Map UI labels to API formats
        const formatMap = {
            'PDF': 'pdf',
            'DOC': 'word',
            'Excel': 'excel',
            'CSV': 'csv'
        };
        const format = formatMap[formatLabel] || formatLabel.toLowerCase();

        setDownloadingId(`${meeting.id}-${format}`);

        try {
            const response = await api.get(`/meetings/${meeting.id}/export/${format}`, {
                responseType: 'blob'
            });

            // Create blob link to download
            const blob = new Blob([response.data], {
                type: response.headers['content-type']
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Extract filename from header if possible
            const contentDisposition = response.headers['content-disposition'];
            let fileName = `PV_${meeting.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.${format === 'word' ? 'docx' : format === 'excel' ? 'xlsx' : format}`;

            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
                if (fileNameMatch?.[1]) fileName = fileNameMatch[1].replace(/"/g, '');
            }

            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            alert(t('archive.downloadError'));
        } finally {
            setDownloadingId(null);
        }
    };

    const toggleDownloadMenu = (e, id) => {
        e.stopPropagation();
        setActiveDownloadId(activeDownloadId === id ? null : id);
        setActiveMenuId(null);
    };

    const formatDisplayDate = (value) => {
        if (!value) return t('common.notAvailable');
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return new Intl.DateTimeFormat(locale, {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const getMeetingDateValue = (meeting) =>
        // Prefer explicit meeting/audio timestamps before generic entity creation date
        meeting?.startAt ||
        meeting?.date ||
        meeting?.meetingDate ||
        meeting?.scheduledAt ||
        meeting?.recordedAt ||
        meeting?.audioRecordedAt ||
        meeting?.uploadedAt ||
        meeting?.audioUploadedAt ||
        meeting?.createdAt ||
        null;

    const getPvGeneratedDateValue = (meeting) =>
        meeting?.pvGeneratedAt ||
        meeting?.summaryGeneratedAt ||
        meeting?.generatedAt ||
        meeting?.summary?.generatedAt ||
        meeting?.summary?.createdAt ||
        meeting?.summary?.updatedAt ||
        meeting?.updatedAt ||
        null;

    // Date filter functions
    // Automatic date filtering
    useEffect(() => {
        if (dateFrom || dateTo) {
            setAppliedDateFilter({
                type: dateFilterType,
                from: dateFrom,
                to: dateTo
            });
        } else {
            setAppliedDateFilter(null);
        }
    }, [dateFrom, dateTo, dateFilterType]);


    const clearDateFilter = () => {
        setAppliedDateFilter(null);
        setDateFrom('');
        setDateTo('');
        setDateFilterType('meeting');
    };

    const normalizeId = (value) => {
        if (!value) return null;
        if (typeof value === 'string') return value.trim().toLowerCase();
        if (typeof value === 'object') {
            if (typeof value.id === 'string') return value.id.trim().toLowerCase();
            if (typeof value.value === 'string') return value.value.trim().toLowerCase();
            if (typeof value.uuid === 'string') return value.uuid.trim().toLowerCase();
            const asString = String(value);
            if (asString && asString !== '[object Object]') return asString.trim().toLowerCase();
        }
        return String(value).trim().toLowerCase();
    };
    const idsEqual = (a, b) => normalizeId(a) !== null && normalizeId(a) === normalizeId(b);

    const getProjectId = (meeting) => meeting.project?.id ?? meeting.projectId ?? null;
    const getProjectName = (meeting) => meeting.project?.name ?? meeting.projectName ?? null;
    const getMeetingProject = (meeting) => {
        const projectId = normalizeId(getProjectId(meeting));
        if (!projectId) return null;
        return projects.find((p) => idsEqual(p.id, projectId)) || meeting.project || null;
    };
    const getMeetingTeamIds = (meeting) => {
        const project = getMeetingProject(meeting);
        const linkedTeams = Array.isArray(project?.teams) ? project.teams : [];
        if (linkedTeams.length > 0) {
            return linkedTeams.map((t) => normalizeId(t?.id)).filter(Boolean);
        }
        const fallbackTeamId = normalizeId(meeting.team?.id ?? meeting.teamId ?? null);
        return fallbackTeamId ? [fallbackTeamId] : [];
    };
    const getMeetingDepartmentIds = (meeting) => {
        const project = getMeetingProject(meeting);
        const linkedTeams = Array.isArray(project?.teams) ? project.teams : [];
        const deptIdsFromProject = linkedTeams
            .map((t) => normalizeId(t?.department?.id ?? t?.departmentId ?? null))
            .filter(Boolean);
        if (deptIdsFromProject.length > 0) return deptIdsFromProject;
        const fallbackDeptId = normalizeId(meeting.department?.id ?? meeting.departmentId ?? null);
        return fallbackDeptId ? [fallbackDeptId] : [];
    };

    const visibleTeams = selectedDepartment === 'all'
        ? teams
        : teams.filter((team) => {
            const deptId = team.department?.id ?? team.departmentId ?? null;
            return idsEqual(deptId, selectedDepartment);
        });

    const visibleProjects = projects.filter((project) => {
        const projectTeams = Array.isArray(project.teams) ? project.teams : [];
        if (selectedTeam !== 'all') {
            return projectTeams.some((team) => idsEqual(team.id ?? team.uuid, selectedTeam));
        }
        if (selectedDepartment !== 'all') {
            return projectTeams.some((team) => {
                const deptId = team.department?.id ?? team.departmentId ?? null;
                return idsEqual(deptId, selectedDepartment);
            });
        }
        return true;
    });

    // Server handles dept/team/project filtering – search and date filtering done client-side
    const filteredMeetings = meetings.filter(m => {
        const matchesSearch = !searchQuery ||
            (m.title ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (m.description ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.participants?.some(p => {
                const pName = typeof p === 'string' ? p : (p?.name ?? '');
                return pName.toLowerCase().includes(searchQuery.toLowerCase());
            });

        // Apply date filter if set
        if (appliedDateFilter) {
            const dateValue = appliedDateFilter.type === 'meeting'
                ? getMeetingDateValue(m)
                : getPvGeneratedDateValue(m);

            if (!dateValue) return false;

            const meetingDate = new Date(dateValue);
            if (isNaN(meetingDate.getTime())) return false;

            if (appliedDateFilter.from) {
                const fromDate = new Date(appliedDateFilter.from);
                fromDate.setHours(0, 0, 0, 0);
                if (meetingDate < fromDate) return false;
            }

            if (appliedDateFilter.to) {
                const toDate = new Date(appliedDateFilter.to);
                toDate.setHours(23, 59, 59, 999);
                if (meetingDate > toDate) return false;
            }
        }

        return matchesSearch;
    });

    const handleCardClick = (meeting) => {
        setCurrentMeeting(meeting);
        setCurrentMeetingId(meeting.id);
        if (isEmbedded && onMeetingSelect) {
            onMeetingSelect(meeting, 'overview');
        } else {
            navigate(`/overview/${meeting.id}`);
        }
    };

    const toggleMenu = (e, id) => {
        e.stopPropagation();
        setActiveMenuId(activeMenuId === id ? null : id);
    };

    const handleEditTranscription = (e, meeting) => {
        e.stopPropagation();
        if (isEmbedded && onMeetingSelect) {
            onMeetingSelect(meeting, 'transcription');
        } else {
            setCurrentMeeting(meeting);
            setCurrentMeetingId(meeting.id);
            navigate(`/transcription?meetingId=${meeting.id}&mode=readonly`);
        }
        setActiveMenuId(null);
    };

    const handleEditPV = (e, meeting) => {
        e.stopPropagation();
        if (isEmbedded && onMeetingSelect) {
            onMeetingSelect(meeting, 'pv');
        } else {
            setCurrentMeeting(meeting);
            setCurrentMeetingId(meeting.id);
            navigate(`/summary?meetingId=${meeting.id}`);
        }
        setActiveMenuId(null);
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (window.confirm(t('archive.confirmDeleteMeeting'))) {
            try {
                await api.delete(`/meetings/${id}`);
                setMeetings(prev => prev.filter(m => m.id !== id));
                setActiveMenuId(null);
            } catch (error) {
                console.error('Failed to delete meeting:', error);
                alert(t('archive.deleteError'));
            }
        }
    };

    const content = (
        <main className={`flex-1 overflow-y-auto no-scrollbar px-8 py-6 ${isEmbedded ? '' : ''}`}>
            {/* Top Bar */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <h1 className={`text-xl font-bold m-0 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {t('archive.title')}
                    </h1>

                </div>
                <button
                    onClick={() => isEmbedded && onNewMeeting ? onNewMeeting() : navigate('/upload')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${darkMode ? 'bg-blue-900 hover:bg-blue-800 text-white' : 'bg-blue-900 hover:bg-blue-800 text-white'}`}
                >
                    <Plus size={18} />
                    {t('archive.newMeeting')}
                </button>
            </div>

            {/* Search & Filters */}
            <div className="flex gap-3 mb-4">
                <div className={`flex items-center gap-2 flex-1 border rounded-lg px-4 py-2.5 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <Search size={18} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                    <input
                        type="text"
                        placeholder={t('archive.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`flex-1 border-none outline-none text-sm bg-transparent ${darkMode ? 'text-gray-200 placeholder-gray-500' : 'text-gray-700 placeholder-gray-400'}`}
                    />
                </div>
                {/* Date Range Button + Popover */}
                <div className="relative" ref={datePickerRef}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowDatePicker(v => !v); }}
                        className={`flex items-center gap-2 border rounded-lg px-4 py-2.5 text-sm cursor-pointer transition-colors ${appliedDateFilter
                            ? (darkMode ? 'bg-blue-900/30 border-blue-700 text-blue-300' : 'bg-blue-50 border-blue-300 text-blue-800')
                            : (darkMode ? 'bg-gray-900 border-gray-800 text-gray-300 hover:bg-gray-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50')
                            }`}
                    >
                        <Calendar size={18} />
                        {t('archive.dateRange')}
                        {appliedDateFilter && (
                            <span className={`ml-1 w-2 h-2 rounded-full inline-block ${darkMode ? 'bg-blue-400' : 'bg-blue-600'}`} />
                        )}
                    </button>

                    {showDatePicker && (
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className={`absolute right-0 top-12 z-50 w-80 rounded-2xl shadow-2xl border overflow-hidden ${darkMode ? 'bg-gray-900 border-gray-700 shadow-black/60' : 'bg-white border-gray-200 shadow-gray-200'
                                }`}
                        >
                            {/* Header */}
                            <div className={`px-4 pt-4 pb-3 border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {t('archive.filterByDate')}
                                </p>
                                {/* Type toggle */}
                                <div className={`flex rounded-lg p-1 gap-1 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                    <button
                                        onClick={() => setDateFilterType('meeting')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold transition-all ${dateFilterType === 'meeting'
                                            ? (darkMode ? 'bg-blue-900 text-blue-200 shadow' : 'bg-white text-blue-800 shadow')
                                            : (darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')
                                            }`}
                                    >
                                        <Calendar size={12} />
                                        {t('archive.meetingDate')}
                                    </button>
                                    <button
                                        onClick={() => setDateFilterType('pv')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold transition-all ${dateFilterType === 'pv'
                                            ? (darkMode ? 'bg-emerald-900 text-emerald-200 shadow' : 'bg-white text-emerald-700 shadow')
                                            : (darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')
                                            }`}
                                    >
                                        <FileText size={12} />
                                        {t('archive.pvGeneration')}
                                    </button>
                                </div>
                            </div>

                            {/* Date inputs */}
                            <div className="px-4 py-4 flex flex-col gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {t('archive.from')}
                                    </label>
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all ${darkMode
                                            ? 'bg-gray-800 border-gray-700 text-gray-200 focus:border-blue-600 [color-scheme:dark]'
                                            : 'bg-white border-gray-200 text-gray-700 focus:border-blue-500'
                                            }`}
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {t('archive.to')}
                                    </label>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        min={dateFrom || undefined}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all ${darkMode
                                            ? 'bg-gray-800 border-gray-700 text-gray-200 focus:border-blue-600 [color-scheme:dark]'
                                            : 'bg-white border-gray-200 text-gray-700 focus:border-blue-500'
                                            }`}
                                    />
                                </div>
                            </div>

                            <div className={`flex gap-2 px-4 pb-4`}>
                                <button
                                    onClick={clearDateFilter}
                                    className={`w-full py-2.5 rounded-lg text-xs font-semibold border transition-colors ${darkMode ? 'border-gray-700 text-gray-400 hover:bg-gray-800' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    {t('archive.resetFilters')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <button className={`flex items-center gap-2 border rounded-lg px-4 py-2.5 text-sm cursor-pointer hover:bg-opacity-80 transition-colors ${darkMode ? 'bg-gray-900 border-gray-800 text-gray-300 hover:bg-gray-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                    <SlidersHorizontal size={18} />
                    {t('archive.filters')}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {/* Department Filter */}
                <div className="flex flex-col gap-1.5">
                    <label className={`text-[10px] font-bold uppercase tracking-wider ml-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {t('archive.department')}
                    </label>
                    <div className="relative group">
                        <Building2 size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${darkMode ? 'text-gray-500 group-hover:text-blue-400' : 'text-gray-400 group-hover:text-blue-900'}`} />
                        <select
                            value={selectedDepartment}
                            onChange={(e) => {
                                setSelectedDepartment(e.target.value);
                                setSelectedTeam('all');
                                setSelectedProject('all');
                            }}
                            className={`w-full pl-11 pr-10 py-3 text-sm appearance-none border rounded-xl outline-none transition-all cursor-pointer ${darkMode
                                ? 'bg-gray-900 border-gray-800 text-gray-200 focus:border-blue-900 focus:ring-4 focus:ring-blue-900/20'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 focus:border-blue-900 focus:ring-4 focus:ring-blue-900/5'
                                }`}
                        >
                            <option value="all">{t('archive.allDepartments')}</option>
                            {departments.map((dept) => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                    </div>
                </div>

                {/* Team Filter */}
                <div className="flex flex-col gap-1.5">
                    <label className={`text-[10px] font-bold uppercase tracking-wider ml-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {t('archive.team')}
                    </label>
                    <div className="relative group">
                        <Users size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${darkMode ? 'text-gray-500 group-hover:text-blue-400' : 'text-gray-400 group-hover:text-blue-900'}`} />
                        <select
                            value={selectedTeam}
                            onChange={(e) => {
                                setSelectedTeam(e.target.value);
                                setSelectedProject('all');
                            }}
                            className={`w-full pl-11 pr-10 py-3 text-sm appearance-none border rounded-xl outline-none transition-all cursor-pointer ${darkMode
                                ? 'bg-gray-900 border-gray-800 text-gray-200 focus:border-blue-900 focus:ring-4 focus:ring-blue-900/20'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 focus:border-blue-900 focus:ring-4 focus:ring-blue-900/5'
                                }`}
                        >
                            <option value="all">{t('archive.allTeams')}</option>
                            {visibleTeams.map((team) => (
                                <option key={team.id} value={team.id}>{team.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                    </div>
                </div>

                {/* Project Filter */}
                <div className="flex flex-col gap-1.5">
                    <label className={`text-[10px] font-bold uppercase tracking-wider ml-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {t('archive.project')}
                    </label>
                    <div className="relative group">
                        <Folder size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${darkMode ? 'text-gray-500 group-hover:text-blue-400' : 'text-gray-400 group-hover:text-blue-900'}`} />
                        <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            className={`w-full pl-11 pr-10 py-3 text-sm appearance-none border rounded-xl outline-none transition-all cursor-pointer ${darkMode
                                ? 'bg-gray-900 border-gray-800 text-gray-200 focus:border-blue-900 focus:ring-4 focus:ring-blue-900/20'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 focus:border-blue-900 focus:ring-4 focus:ring-blue-900/5'
                                }`}
                        >
                            <option value="all">{t('archive.allProjects')}</option>
                            {visibleProjects.map((project) => (
                                <option key={project.id} value={project.id}>{project.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                    </div>
                </div>
            </div>


            {/* Meeting Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                {loading ? (
                    <>
                        <div className={`rounded-xl h-60 animate-pulse ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}></div>
                        <div className={`rounded-xl h-60 animate-pulse ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}></div>
                        <div className={`rounded-xl h-60 animate-pulse ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}></div>
                    </>
                ) : filteredMeetings.length === 0 ? (
                    <div className={`col-span-full text-center py-16 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        <p className="text-lg mb-2">{t('archive.noResultsTitle')}</p>
                        <p className="text-sm">{t('archive.noResultsHint')}</p>
                    </div>
                ) : (
                    filteredMeetings.map((meeting) => (
                        <div
                            key={meeting.id}
                            className={`border rounded-xl p-5 hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer relative ${darkMode ? 'bg-gray-900 border-gray-800 hover:border-gray-700' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                            onClick={() => handleCardClick(meeting)}
                        >
                            <div className="flex justify-between items-center mb-3">
                                <Badge variant="general">{getProjectName(meeting) ?? t('archive.noProject')}</Badge>
                                <div className="flex gap-2 items-center relative">
                                    {meeting.starred && <Star size={16} fill="#F59E0B" color="#F59E0B" />}
                                    <button
                                        onClick={(e) => toggleMenu(e, meeting.id)}
                                        className={`p-1 rounded-md transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-500 hover:text-gray-400' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'}`}
                                    >
                                        <MoreVertical size={16} />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {activeMenuId === meeting.id && (
                                        <div className={`absolute right-0 top-8 w-48 rounded-xl shadow-xl border z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${darkMode ? 'bg-gray-800 border-gray-700 shadow-black/50' : 'bg-white border-gray-100 shadow-gray-200'}`}>
                                            <div className="py-1">
                                                <button
                                                    onClick={(e) => handleEditTranscription(e, meeting)}
                                                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}
                                                >
                                                    <FileText size={14} className="text-blue-500" />
                                                    {t('archive.editTranscript')}
                                                </button>
                                                <button
                                                    onClick={(e) => handleEditPV(e, meeting)}
                                                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}
                                                >
                                                    <Share2 size={14} className="text-emerald-500" />
                                                    {t('archive.editMinutes')}
                                                </button>
                                                <div className={`h-px my-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}></div>
                                                <button
                                                    onClick={(e) => handleDelete(e, meeting.id)}
                                                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${darkMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'}`}
                                                >
                                                    <Trash2 size={14} />
                                                    {t('common.delete')}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <h3 className={`text-base font-semibold m-0 mb-2 leading-snug ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {meeting.title}
                            </h3>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <Calendar size={12} className={darkMode ? 'text-blue-400' : 'text-blue-700'} />
                                    <span className={`text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('common.meeting')}</span>
                                    <span className={`text-[11px] font-medium truncate ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {formatDisplayDate(getMeetingDateValue(meeting))}
                                    </span>
                                </div>
                                <span className={`w-px h-3 shrink-0 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <FileText size={12} className={darkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                                    <span className={`text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>PV</span>
                                    <span className={`text-[11px] font-medium truncate ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {formatDisplayDate(getPvGeneratedDateValue(meeting))}
                                    </span>
                                </div>
                            </div>
                            <p className={`text-xs m-0 mb-3 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                {meeting.duration}
                            </p>
                            <p className={`text-[13px] leading-relaxed m-0 mb-4 line-clamp-2 h-10 overflow-hidden ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {meeting.description}
                            </p>

                            <div className={`flex justify-between items-center pt-4 border-t ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                <div className="flex -space-x-2">
                                    {meeting.participants?.slice(0, 3).map((participant, idx) => {
                                        const displayName = typeof participant === 'string' ? participant : (participant?.name || '?');
                                        return (
                                            <Avatar
                                                key={idx}
                                                name={displayName}
                                                initials={displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?'}
                                                size="small"
                                                color={idx === 0 ? '#3B82F6' : idx === 1 ? '#10B981' : '#F59E0B'}
                                            />
                                        );
                                    })}
                                    {meeting.participants?.length > 3 && (
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold border-2 ${darkMode ? 'bg-gray-800 text-gray-400 border-gray-900' : 'bg-gray-100 text-gray-500 border-white'}`}>
                                            +{meeting.participants.length - 3}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                    {/* Eye → BehavioralAnalytics */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isEmbedded && onMeetingSelect) {
                                                onMeetingSelect(meeting, 'analytics');
                                            } else {
                                                navigate('/analytics');
                                            }
                                        }}
                                        className={`w-8 h-8 border-none rounded-md flex items-center justify-center cursor-pointer transition-colors ${darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-blue-400' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-blue-900'}`}
                                        title={t('archive.behavioralAnalysis')}
                                    >
                                        <Eye size={16} />
                                    </button>

                                    {/* Download → format dropdown */}
                                    <div className="relative">
                                        <button
                                            onClick={(e) => toggleDownloadMenu(e, meeting.id)}
                                            disabled={!!downloadingId?.startsWith(meeting.id)}
                                            className={`w-8 h-8 border-none rounded-md flex items-center justify-center cursor-pointer transition-colors ${activeDownloadId === meeting.id ? (darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-900') : (darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900')} ${downloadingId?.startsWith(meeting.id) ? 'opacity-50 cursor-wait' : ''}`}
                                            title={t('archive.download')}
                                        >
                                            {downloadingId?.startsWith(meeting.id) ? (
                                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Download size={16} />
                                            )}
                                        </button>

                                        {activeDownloadId === meeting.id && (
                                            <div className={`absolute right-0 bottom-10 w-44 rounded-xl shadow-xl border z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${darkMode ? 'bg-gray-800 border-gray-700 shadow-black/50' : 'bg-white border-gray-100 shadow-gray-200'}`}>
                                                <p className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider border-b ${darkMode ? 'text-gray-500 border-gray-700' : 'text-gray-400 border-gray-100'}`}>{t('archive.format')}</p>
                                                {[
                                                    { label: 'PDF', icon: FileText, color: 'text-red-500' },
                                                    { label: 'DOC', icon: FileType, color: 'text-blue-500' },
                                                    { label: 'CSV', icon: FileSpreadsheet, color: 'text-green-500' },
                                                    { label: 'Excel', icon: FileSpreadsheet, color: 'text-emerald-600' },
                                                ].map(({ label, icon: Icon, color }) => (
                                                    <button
                                                        key={label}
                                                        onClick={(e) => handleDownloadFormat(e, label, meeting)}
                                                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}
                                                    >
                                                        <Icon size={14} className={color} />
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => alert(t('archive.sharingLink', { title: meeting.title }))}
                                        className={`w-8 h-8 border-none rounded-md flex items-center justify-center cursor-pointer transition-colors ${darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900'}`}
                                        title={t('archive.shareUrl')}
                                    >
                                        <Share2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Load More */}
            {!loading && filteredMeetings.length > 0 && (
                <div className="text-center">
                    <p className={`text-[13px] m-0 mb-3 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {t('archive.showing')} {filteredMeetings.length} {t('archive.ofArchivedMinutes')}
                    </p>
                    <button className={`px-6 py-2.5 border rounded-lg text-sm cursor-pointer transition-colors ${darkMode ? 'bg-gray-900 border-gray-800 text-gray-300 hover:bg-gray-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                        {t('archive.loadMore')}
                    </button>
                </div>
            )}
        </main>
    );

    if (isEmbedded) return content;

    return (
        <div className={`flex flex-col min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-950' : 'bg-[#F9FAFB]'}`}>
            <Navbar currentStep={null} />
            {content}
        </div>
    );
};

export default ArchiveLibrary;
