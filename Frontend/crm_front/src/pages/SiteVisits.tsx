import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, notification, Tag, Empty, Modal, Space, Tooltip, Descriptions } from 'antd';
import {
    EnvironmentOutlined,
    CalendarOutlined,
    UserOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CameraOutlined,
    PlusOutlined,
    EditOutlined,
    PhoneOutlined,
    MailOutlined,
    HomeOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { SiteVisitsUrl, CustomersUrl } from '../utils/network';
import { SiteVisitProps, CustomerProps } from '../utils/types';
import { getAuthToken } from '../utils/functions';
import { BlackButton, WhiteButton, PageLoader } from '../components';
import AddCustomerForm from '../components/AddCustomerForm';

const SiteVisits: React.FC = () => {
    const navigate = useNavigate();
    const [visits, setVisits] = useState<SiteVisitProps[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerProps | null>(null);
    const [customerModalVisible, setCustomerModalVisible] = useState(false);
    const [customerDetailsVisible, setCustomerDetailsVisible] = useState(false);

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

    const fetchCustomerDetails = async (customerId: number) => {
        try {
            const headers = getAuthToken() as any;
            const response = await axios.get(`${CustomersUrl}/${customerId}`, headers);
            setSelectedCustomer(response.data);
            setCustomerDetailsVisible(true);
        } catch (error) {
            notification.error({
                message: 'Error',
                description: 'Failed to fetch customer details',
                title: 'Error'
            });
        }
    };

    const handleEditCustomer = () => {
        setCustomerDetailsVisible(false);
        setCustomerModalVisible(true);
    };

    const handleCustomerUpdateSuccess = () => {
        setCustomerModalVisible(false);
        setSelectedCustomer(null);
        fetchVisits();
        notification.success({
            message: 'Success',
            description: 'Customer updated successfully',
            title: 'Success'
        });
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
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <Tooltip title="View Customer Info">
                                            <Button
                                                type="text"
                                                size="small"
                                                icon={<UserOutlined />}
                                                onClick={() => fetchCustomerDetails(visit.customer)}
                                                style={{ color: '#5b6cf9' }}
                                            />
                                        </Tooltip>
                                        {getStatusTag(visit.status)}
                                    </div>
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

            {/* Customer Details Modal */}
            <Modal
                title="Customer Information"
                open={customerDetailsVisible}
                onCancel={() => {
                    setCustomerDetailsVisible(false);
                    setSelectedCustomer(null);
                }}
                footer={[
                    <Button key="close" onClick={() => setCustomerDetailsVisible(false)}>
                        Close
                    </Button>,
                    <BlackButton key="edit" icon={<EditOutlined />} onClick={handleEditCustomer}>
                        Edit Customer
                    </BlackButton>
                ]}
                width={700}
            >
                {selectedCustomer && (
                    <Descriptions bordered column={2} size="small">
                        <Descriptions.Item label="Full Name" span={2}>
                            <strong>{selectedCustomer.full_name}</strong>
                        </Descriptions.Item>
                        <Descriptions.Item label="Email" span={2}>
                            <MailOutlined style={{ marginRight: '6px', color: '#1890ff' }} />
                            {selectedCustomer.email || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Phone" span={2}>
                            <PhoneOutlined style={{ marginRight: '6px', color: '#52c41a' }} />
                            {selectedCustomer.phone || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Origin Address" span={2}>
                            <HomeOutlined style={{ marginRight: '6px', color: '#fa8c16' }} />
                            {selectedCustomer.origin_address || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Destination Address" span={2}>
                            <EnvironmentOutlined style={{ marginRight: '6px', color: '#eb2f96' }} />
                            {selectedCustomer.destination_address || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Move Date">
                            <CalendarOutlined style={{ marginRight: '6px' }} />
                            {selectedCustomer.move_date || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Service Type">
                            {selectedCustomer.service_type_name || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Move Size">
                            {selectedCustomer.move_size_name || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Stage">
                            <Tag color="blue">{selectedCustomer.stage?.replace('_', ' ').toUpperCase()}</Tag>
                        </Descriptions.Item>
                        {selectedCustomer.notes && (
                            <Descriptions.Item label="Notes" span={2}>
                                {selectedCustomer.notes}
                            </Descriptions.Item>
                        )}
                    </Descriptions>
                )}
            </Modal>

            {/* Customer Edit Form */}
            <AddCustomerForm
                isVisible={customerModalVisible}
                onClose={() => {
                    setCustomerModalVisible(false);
                    setSelectedCustomer(null);
                }}
                onSuccessCallBack={handleCustomerUpdateSuccess}
                editingCustomer={selectedCustomer}
            />
        </div>
    );
};

export default SiteVisits;
