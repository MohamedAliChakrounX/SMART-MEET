import React, { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import TranscriptionView from './TranscriptionView';
import { useMeeting } from '../../context/MeetingContext';
import useNavigationGuard from '../../hooks/useNavigationGuard';

const Transcription = ({ isEmbedded = false, onNavigate }) => {
    const { darkMode, setTranscript } = useMeeting();
    const [searchParams] = useSearchParams();
    const isReadonly = searchParams.get('mode') === 'readonly';
    const rawMeetingId = searchParams.get('meetingId');
    const meetingId = rawMeetingId ? (/^\d+$/.test(rawMeetingId) ? parseInt(rawMeetingId, 10) : rawMeetingId) : null;
    const isSavedRef = useRef(false);

    // null = unknown (show processing screen if meetingId present)
    // true  = AI done, show transcript
    // false = no meetingId (direct navigation), show transcript directly
    const [aiDone, setAiDone] = useState(!meetingId);
    const [aiError, setAiError] = useState(null);

    const handleAiDone = (segments) => {
        if (segments?.length > 0) {
            setTranscript(segments);
        }
        setAiDone(true);
    };

    useNavigationGuard(
        () => !isReadonly && !isSavedRef.current,
        "⚠️ Si vous quittez cette page, vous perdrez l'audio uploadé et la transcription. Voulez-vous vraiment quitter ?"
    );

    return (
        <div className={`flex flex-col h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-950 text-slate-300' : 'bg-gray-50 text-slate-600'}`}>
            {!isEmbedded && <Navbar currentStep={2} hideSteps={isReadonly} />}
            <div className="flex-1 overflow-hidden flex flex-col">
                <TranscriptionView
                    hideActions={isReadonly}
                    meetingId={meetingId}
                    isEmbedded={isEmbedded}
                    onNavigate={onNavigate}
                    onSaveAndContinue={() => { isSavedRef.current = true; }}
                />
            </div>
        </div>
    );
};

export default Transcription;
