import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Button, Tag, Table, Space, Typography, notification, Empty, Divider, Result } from 'antd';
import { TeamOutlined, EnvironmentOutlined, CalendarOutlined, FilePdfOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import axios from 'axios';
import { WorkOrdersUrl, BaseUrl } from '../utils/network';
import { PageLoader } from '../components';

const { Title, Text, Paragraph } = Typography;

const PublicWorkOrderPortal: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [workOrder, setWorkOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [responseLoading, setResponseLoading] = useState(false);
    const [submitted, setSubmitted] = useState<string | null>(null);

    useEffect(() => {
        fetchWorkOrder();
    }, [token]);

    const fetchWorkOrder = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${WorkOrdersUrl}/public/${token}`);
            setWorkOrder(response.data);
        } catch (error) {
            notification.error({
                message: 'Error',
                description: 'Failed to load work order. The link may be invalid or expired.',
                title: 'Error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRespond = async (response: 'accepted' | 'cancelled') => {
        try {
            setResponseLoading(true);
            await axios.post(`${WorkOrdersUrl}/public/${token}/respond`, { response });
            setSubmitted(response);
            notification.success({
                message: 'Success',
                description: `Your response has been recorded as: ${response.toUpperCase()}`,
                title: 'Success'
            });
            fetchWorkOrder();
        } catch (error) {
            notification.error({
                message: 'Error',
                description: 'Failed to submit response.',
                title: 'Error'
            });
        } finally {
            setResponseLoading(false);
        }
    };

    if (loading) {
        return <PageLoader fullPage text="Loading Work Order Assignment..." />;
    }

    if (!workOrder) {
        return (
            <div style={{ padding: '50px' }}>
                <Result
                    status="404"
                    title="Invalid Link"
                    subTitle="Sorry, the work order assignment link you used is invalid or has expired."
                />
            </div>
        );
    }

    const columns = [
        { title: 'Description', dataIndex: 'description', key: 'description' },
        { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
        {
            title: 'Rate',
            dataIndex: 'contractor_rate',
            key: 'contractor_rate',
            render: (val: number) => `$${Number(val).toFixed(2)}`
        },
        {
            title: 'Total',
            dataIndex: 'total_amount',
            key: 'total_amount',
            render: (val: number) => <strong>$${Number(val).toFixed(2)}</strong>
        },
    ];

    return (
        <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px' }}>
            <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div>
                        <Tag color="red" style={{ marginBottom: '8px' }}>WORK ORDER ASSIGNMENT</Tag>
                        <Title level={2} style={{ margin: 0 }}>WO #{workOrder.id}</Title>
                        <Text type="secondary">Generated on {new Date(workOrder.created_at).toLocaleDateString()}</Text>
                    </div>
                    <Space direction="vertical" align="end">
                        <Tag color={
                            workOrder.status === 'pending' ? 'orange' :
                                workOrder.status === 'accepted' ? 'blue' :
                                    workOrder.status === 'completed' ? 'green' : 'red'
                        } style={{ fontSize: '14px', padding: '4px 12px' }}>
                            {workOrder.status.toUpperCase()}
                        </Tag>
                        {workOrder.pdf_file && (
                            <Button
                                type="link"
                                icon={<FilePdfOutlined />}
                                href={`${BaseUrl.replace('/api/', '')}${workOrder.pdf_file}`}
                                target="_blank"
                            >
                                Download PDF Copy
                            </Button>
                        )}
                    </Space>
                </div>

                <Divider />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
                    <div>
                        <Title level={4}><TeamOutlined /> Contractor Details</Title>
                        <Paragraph>
                            <Text strong>{workOrder.contractor_name}</Text>
                        </Paragraph>

                        <Title level={4} style={{ marginTop: '24px' }}><EnvironmentOutlined /> Job Locations</Title>
                        <Paragraph>
                            <Text type="secondary">Origin:</Text><br />
                            {workOrder.estimate_details.origin_address || 'TBD'}
                        </Paragraph>
                        <Paragraph>
                            <Text type="secondary">Destination:</Text><br />
                            {workOrder.estimate_details.destination_address || 'TBD'}
                        </Paragraph>
                    </div>
                    <div>
                        <Title level={4}><CalendarOutlined /> Schedule Information</Title>
                        <Paragraph>
                            <Text type="secondary">Pickup Date:</Text><br />
                            {workOrder.estimate_details.pickup_date ? new Date(workOrder.estimate_details.pickup_date).toLocaleDateString() : 'TBD'}
                        </Paragraph>
                        <Paragraph>
                            <Text type="secondary">Delivery Date:</Text><br />
                            {workOrder.estimate_details.delivery_date ? new Date(workOrder.estimate_details.delivery_date).toLocaleDateString() : 'TBD'}
                        </Paragraph>

                        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f6ffed', borderRadius: '8px', border: '1px solid #b7eb8f' }}>
                            <Text type="secondary">Agreed Contractor Total:</Text><br />
                            <Title level={2} style={{ margin: 0, color: '#52c41a' }}>${Number(workOrder.total_contractor_amount).toFixed(2)}</Title>
                        </div>
                    </div>
                </div>

                <Divider>Assignment Details</Divider>
                <Table
                    dataSource={workOrder.items}
                    columns={columns}
                    pagination={false}
                    rowKey="id"
                    style={{ marginBottom: '32px' }}
                />

                {workOrder.status === 'pending' && (
                    <div style={{
                        marginTop: '40px',
                        padding: '24px',
                        backgroundColor: '#fafafa',
                        borderRadius: '12px',
                        textAlign: 'center',
                        border: '1px solid #e8e8e8'
                    }}>
                        <Title level={4}>Action Required: Please Review and Respond</Title>
                        <Paragraph>By accepting, you agree to the rates and schedule provided above.</Paragraph>
                        <Space size="large">
                            <Button
                                type="primary"
                                size="large"
                                icon={<CheckOutlined />}
                                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', height: '50px', padding: '0 40px' }}
                                onClick={() => handleRespond('accepted')}
                                loading={responseLoading}
                            >
                                ACCEPT ASSIGNMENT
                            </Button>
                            <Button
                                danger
                                size="large"
                                icon={<CloseOutlined />}
                                style={{ height: '50px', padding: '0 40px' }}
                                onClick={() => handleRespond('cancelled')}
                                loading={responseLoading}
                            >
                                REJECT / CANCEL
                            </Button>
                        </Space>
                    </div>
                )}

                {(workOrder.status === 'accepted' || workOrder.status === 'completed') && (
                    <Result
                        status="success"
                        title="Assignment Confirmed"
                        subTitle="You have accepted this work order. Please proceed according to the schedule."
                    />
                )}
            </Card>

            <div style={{ textAlign: 'center', marginTop: '24px', color: '#999', fontSize: '12px' }}>
                Professional CRM System Assignment Portal &copy; {new Date().getFullYear()}
            </div>
        </div>
    );
};

export default PublicWorkOrderPortal;
