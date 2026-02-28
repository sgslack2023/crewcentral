import React from 'react';
import { Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import AutomationManager from '../components/AutomationManager';
import { WhiteButton } from '../components';

interface SchedulersProps {
    hideHeader?: boolean;
}

const Schedulers: React.FC<SchedulersProps> = ({ hideHeader = false }) => {
    const navigate = useNavigate();

    return (
        <div style={{ padding: hideHeader ? '0' : '8px 16px 24px 16px' }}>
            {!hideHeader && (
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1a1a2e' }}>Automations & Scheduling</h1>
                            <p style={{ color: '#8e8ea8', margin: '4px 0 0 0', fontSize: '13px' }}>
                                Manage background tasks and automated job schedules.
                            </p>
                        </div>
                        <WhiteButton
                            icon={<ArrowLeftOutlined />}
                            onClick={() => navigate('/settings')}
                        >
                            Back to Settings
                        </WhiteButton>
                    </div>
                </div>
            )}

            <AutomationManager />
        </div>
    );
};

export default Schedulers;
