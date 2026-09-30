import React from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import BehavioralAnalyticsView from './BehavioralAnalyticsView';

const BehavioralAnalytics = ({ isEmbedded = false, onNavigate }) => {
    const [searchParams] = useSearchParams();
    const isReadonly = searchParams.get('mode') === 'readonly';

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            {!isEmbedded && <Navbar currentStep={4} hideSteps={true} />}
            <div className="flex-1 overflow-hidden flex flex-col">
                <BehavioralAnalyticsView isEmbedded={isEmbedded} onNavigate={onNavigate} />
            </div>
        </div>
    );
};

export default BehavioralAnalytics;
