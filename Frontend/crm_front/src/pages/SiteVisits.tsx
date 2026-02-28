import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, notification, Tag, Empty, Modal, Space, Tooltip } from 'antd';
import {
    EnvironmentOutlined,
    CalendarOutlined,
    UserOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CameraOutlined,
    PlusOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { SiteVisitsUrl } from '../utils/network';
import { SiteVisitProps } from '../utils/types';
import { getAuthToken } from '../utils/functions';
import { BlackButton, WhiteButton, PageLoader } from '../components';

const SiteVisits: React.FC = () => {
    const navigate = useNavigate();
    const [visits, setVisits] = useState<SiteVisitProps[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchVisits();
    }, []);

    const fetchVisits = async () => {
        setLoading(true);
        try {
            const headers = getAuthToken() as any;
            const response = await axios.get(SiteVisitsUrl, headers);
            setVisits(response.data);
        } catch (error) {
            notification.error({
                message: 'Error',
                description: 'Failed to fetch site visits',
                title: 'Error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: number, action: 'start_visit' | 'complete_visit') => {
        try {
            const headers = getAuthToken() as any;
            await axios.post(`${SiteVisitsUrl}/${id}/${action}/`, {}, headers);
            notification.success({
                message: 'Success',
                description: `Visit status updated`,
                title: 'Success'
            });
            fetchVisits();
        } catch (error) {
            notification.error({
                message: 'Error',
                description: 'Failed to update visit status',
                title: 'Error'
            });
        }
    };

    const getStatusTag = (status: string) => {
        const colors: Record<string, string> = {
            'SCHEDULED': 'blue',
            'IN_PROGRESS': 'orange',
            'COMPLETED': 'green',
            'CANCELLED': 'red'
        };
        return <Tag color={colors[status] || 'default'}>{status.replace('_', ' ')}</Tag>;
    };

    return (
        <div style={{ padding: '8px 16px 24px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1a1a2e' }}>Site Visits</h1>
                    <p style={{ color: '#8e8ea8', margin: '4px 0 0 0', fontSize: '14px' }}>
                        Manage and track surveyor site visits
                    </p>
                </div>
            </div>

            {loading ? (
                <PageLoader text="Loading site visits..." />
            ) : visits.length === 0 ? (
                <Card style={{ borderRadius: '12px', textAlign: 'center', padding: '40px' }}>
                    <Empty description="No site visits scheduled yet" />
                </Card>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
                    {visits.map(visit => (
                        <Card
                            key={visit.id}
                            style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                            title={
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600 }}>{visit.customer_name}</span>
                                    {getStatusTag(visit.status)}
                                </div>
                            }
                        >
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#4b5563' }}>
                                    <CalendarOutlined style={{ color: '#5b6cf9' }} />
                                    <span>{new Date(visit.scheduled_at).toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#4b5563' }}>
                                    <UserOutlined style={{ color: '#5b6cf9' }} />
                                    <span>Surveyor: {visit.surveyor_name || 'Unassigned'}</span>
                                </div>
                                {visit.appointment_phone && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#4b5563' }}>
                                        <EnvironmentOutlined style={{ color: '#5b6cf9' }} />
                                        <span>Contact: {visit.appointment_phone} ({visit.appointment_confirmed_by})</span>
                                    </div>
                                )}
                            </div>

                            {visit.notes && (
                                <div style={{
                                    padding: '8px 12px',
                                    backgroundColor: '#f9fafb',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    color: '#6b7280',
                                    marginBottom: '16px',
                                    border: '1px solid #f3f4f6'
                                }}>
                                    <strong>Notes:</strong> {visit.notes}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                                {visit.status === 'SCHEDULED' && (
                                    <BlackButton
                                        block
                                        onClick={() => handleStatusChange(visit.id!, 'start_visit')}
                                    >
                                        Start Visit
                                    </BlackButton>
                                )}
                                {visit.status === 'IN_PROGRESS' && (
                                    <BlackButton
                                        block
                                        onClick={() => handleStatusChange(visit.id!, 'complete_visit')}
                                    >
                                        Complete Visit
                                    </BlackButton>
                                )}
                                <WhiteButton block onClick={() => navigate(`/site-visit-capture/${visit.id}`)}>
                                    Capture Data
                                </WhiteButton>
                                <WhiteButton block onClick={() => notification.info({ message: 'Coming soon', description: 'Detail view will show full history.', title: 'Note' })}>
                                    Details
                                </WhiteButton>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SiteVisits;
