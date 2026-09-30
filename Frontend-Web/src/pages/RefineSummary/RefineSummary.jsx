import React from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import RefineSummaryView from './RefineSummaryView';
import { useMeeting } from '../../context/MeetingContext';

const RefineSummary = ({ isEmbedded = false, meetingId, onNavigate }) => {
    const { darkMode } = useMeeting();
    const [searchParams] = useSearchParams();
    const isReadOnly = searchParams.get('mode') === 'readonly';

    return (
        <div className={`flex flex-col h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-950 text-gray-200' : 'bg-[#F9FAFB] text-gray-800'}`}>
            <div className="flex-1 overflow-hidden flex flex-col">
                <RefineSummaryView 
                    hideSidebar={isReadOnly} 
                    isReadOnly={isReadOnly} 
                    isEmbedded={isEmbedded}
                    meetingId={meetingId}
                    onNavigate={onNavigate}
                />
            </div>
        </div>
    );
};

export default RefineSummary;
