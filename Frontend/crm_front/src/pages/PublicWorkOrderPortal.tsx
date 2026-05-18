import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Button, Tag, Table, Space, Typography, notification, Divider, Result, Row, Col } from 'antd';
import {
    TeamOutlined,
    EnvironmentOutlined,
    CalendarOutlined,
    FilePdfOutlined,
    CheckOutlined,
    CloseOutlined,
    FileTextOutlined,
    UserOutlined,
    ClockCircleOutlined,
    DollarOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { WorkOrdersUrl, BaseUrl } from '../utils/network';
import { PageLoader } from '../components';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const PublicWorkOrderPortal: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [workOrder, setWorkOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [responseLoading, setResponseLoading] = useState(false);
    const [submitted, setSubmitted] = useState<string | null>(null);

    useEffect(() => {
        if (token) {
            fetchWorkOrder();
        }
    }, [token]);

    const fetchWorkOrder = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${WorkOrdersUrl}/public/${token}`);
            setWorkOrder(response.data);
        } catch (error) {
            console.error('Fetch error:', error);
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
                message: 'Response Recorded',
                description: `Work order has been ${response === 'accepted' ? 'accepted' : 'declined'}.`,
                placement: 'top',
                title: 'Success'
            });
            fetchWorkOrder();
        } catch (error) {
            notification.error({
                message: 'Submission Error',
                description: 'Failed to record your response. Please try again.',
                title: 'Error'
            });
        } finally {
            setResponseLoading(false);
        }
    };

    if (loading) {
        return <PageLoader fullPage text="Loading Assignment Details..." />;
    }

    if (!workOrder) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
                <Card style={{ borderRadius: '16px', maxWidth: '500px', width: '90%', textAlign: 'center' }}>
                    <Result
                        status="warning"
                        title="Link Expired or Invalid"
                        subTitle="This work order assignment link is no longer active. Please contact the administrator if you believe this is an error."
                    />
                </Card>
            </div>
        );
    }

    const columns = [
        {
            title: 'SERVICE DESCRIPTION',
            dataIndex: 'description',
            key: 'description',
            render: (text: string) => <Text strong style={{ color: '#262626' }}>{text}</Text>
        },
        {
            title: 'QTY',
            dataIndex: 'quantity',
            key: 'quantity',
            width: 80,
            align: 'center' as const,
            render: (val: number) => <Text style={{ color: '#595959' }}>{Number(val).toFixed(2)}</Text>
        },
        {
            title: 'RATE',
            dataIndex: 'contractor_rate',
            key: 'contractor_rate',
            width: 120,
            align: 'right' as const,
            render: (val: number) => <Text style={{ color: '#595959' }}>${Number(val).toFixed(2)}</Text>
        },
        {
            title: 'TOTAL',
            dataIndex: 'total_amount',
            key: 'total_amount',
            width: 140,
            align: 'right' as const,
            render: (val: number) => <Text strong style={{ color: '#1890ff', fontSize: '15px' }}>${Number(val).toFixed(2)}</Text>
        },
    ];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '40px 20px' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

                {/* Modern Header Section - Matching PublicEstimateView Colors */}
                <div style={{
                    background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                    borderRadius: '16px',
                    padding: '40px 32px',
                    marginBottom: '32px',
                    color: '#fff',
                    boxShadow: '0 10px 30px rgba(24, 144, 255, 0.15)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', top: '-10%', right: '-5%', opacity: 0.1 }}>
                        <TeamOutlined style={{ fontSize: '200px' }} />
                    </div>

                    <Row justify="space-between" align="middle">
                        <Col xs={24} md={16}>
                            <Tag style={{
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                color: '#fff',
                                fontWeight: 600,
                                padding: '4px 12px',
                                borderRadius: '4px',
                                marginBottom: '12px'
                            }}>
                                CONTRACTOR PORTAL
                            </Tag>
                            <Title level={1} style={{ color: '#fff', margin: 0, fontSize: '28px', fontWeight: 600 }}>
                                Work Order Assignment #{workOrder.id}
                            </Title>
                            <Paragraph style={{ color: 'rgba(255,255,255,0.9)', marginTop: '8px', fontSize: '16px', fontWeight: 500 }}>
                                Contractor: {workOrder.contractor_name}
                            </Paragraph>
                        </Col>
                        <Col xs={24} md={8} style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                                <Tag color={
                                    workOrder.status === 'accepted' ? 'green' :
                                        workOrder.status === 'cancelled' ? 'red' : 'blue'
                                } style={{
                                    fontSize: '14px',
                                    padding: '4px 16px',
                                    borderRadius: '4px',
                                    fontWeight: 600,
                                    textTransform: 'uppercase'
                                }}>
                                    {workOrder.status}
                                </Tag>
                                {workOrder.pdf_file && (
                                    <Button
                                        ghost
                                        icon={<FilePdfOutlined />}
                                        href={`${BaseUrl.replace('/api/', '')}${workOrder.pdf_file}`}
                                        target="_blank"
                                        style={{ borderRadius: '4px', fontWeight: 500 }}
                                    >
                                        Download PDF Copy
                                    </Button>
                                )}
                            </div>
                        </Col>
                    </Row>
                </div>

                {/* Info Grid */}
                <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
                    <Col xs={24} lg={12}>
                        <Card style={{ borderRadius: '12px', height: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <div style={{ background: '#e6f7ff', padding: '10px', borderRadius: '8px' }}>
                                    <EnvironmentOutlined style={{ color: '#1890ff', fontSize: '20px' }} />
                                </div>
                                <Title level={4} style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Site Locations</Title>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.02em' }}>Origin Address</Text>
                                    <Paragraph style={{ fontSize: '14px', fontWeight: 500, marginTop: '4px', color: '#262626' }}>
                                        {workOrder.estimate_details.origin_address || '—'}
                                    </Paragraph>
                                </div>
                                <div>
                                    <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.02em' }}>Destination Address</Text>
                                    <Paragraph style={{ fontSize: '14px', fontWeight: 500, marginTop: '4px', color: '#262626' }}>
                                        {workOrder.estimate_details.destination_address || '—'}
                                    </Paragraph>
                                </div>
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} lg={12}>
                        <Card style={{ borderRadius: '12px', height: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <div style={{ background: '#e6f7ff', padding: '10px', borderRadius: '8px' }}>
                                    <CalendarOutlined style={{ color: '#1890ff', fontSize: '20px' }} />
                                </div>
                                <Title level={4} style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Schedule & Metrics</Title>
                            </div>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Pickup Date</Text>
                                    <Paragraph style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>
                                        {workOrder.estimate_details.pickup_date ? dayjs(workOrder.estimate_details.pickup_date, 'YYYY-MM-DD').format('MMM D, YYYY') : 'TBD'}
                                    </Paragraph>
                                    {workOrder.estimate_details.pickup_time_window_display && (
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                            <ClockCircleOutlined style={{ marginRight: '4px' }} />
                                            {workOrder.estimate_details.pickup_time_window_display}
                                        </Text>
                                    )}
                                </Col>
                                <Col span={12}>
                                    <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Delivery Date</Text>
                                    <Paragraph style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>
                                        {workOrder.estimate_details.delivery_date ? dayjs(workOrder.estimate_details.delivery_date, 'YYYY-MM-DD').format('MMM D, YYYY') : 'TBD'}
                                    </Paragraph>
                                    {workOrder.estimate_details.delivery_time_window_display && (
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                            <ClockCircleOutlined style={{ marginRight: '4px' }} />
                                            {workOrder.estimate_details.delivery_time_window_display}
                                        </Text>
                                    )}
                                </Col>
                            </Row>

                            <Divider style={{ margin: '12px 0' }} />

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Weight Capacity</Text>
                                    <Paragraph style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>
                                        {workOrder.estimate_details.weight_lbs ? `${workOrder.estimate_details.weight_lbs} lbs` : '—'}
                                    </Paragraph>
                                </Col>
                                <Col span={12}>
                                    <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Labour Hours</Text>
                                    <Paragraph style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>
                                        {workOrder.estimate_details.labour_hours ? `${Number(workOrder.estimate_details.labour_hours).toFixed(1)} hrs` : '—'}
                                    </Paragraph>
                                </Col>
                            </Row>
                        </Card>
                    </Col>
                </Row>

                {/* Assignment Details Table */}
                <Card
                    title={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileTextOutlined style={{ color: '#1890ff' }} /> Payout Breakdown</div>}
                    style={{ borderRadius: '12px', marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
                    bodyStyle={{ padding: 0 }}
                >
                    <Table
                        dataSource={workOrder.items}
                        columns={columns}
                        pagination={false}
                        rowKey="id"
                        bordered={false}
                        summary={() => (
                            <Table.Summary fixed>
                                <Table.Summary.Row style={{ backgroundColor: '#fafafa' }}>
                                    <Table.Summary.Cell index={0} colSpan={3} align="right">
                                        <Text strong style={{ fontSize: '15px' }}>TOTAL PROJECT PAYOUT</Text>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={1} align="right">
                                        <Text style={{ fontSize: '18px', fontWeight: 700, color: '#52c41a' }}>
                                            ${Number(workOrder.total_contractor_amount).toFixed(2)}
                                        </Text>
                                    </Table.Summary.Cell>
                                </Table.Summary.Row>
                            </Table.Summary>
                        )}
                    />
                </Card>

                {/* Contractor Notes */}
                {workOrder.notes && (
                    <Card
                        title={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileTextOutlined style={{ color: '#fa8c16' }} /> Special Instructions</div>}
                        style={{ borderRadius: '12px', marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', backgroundColor: '#fffbf0' }}
                    >
                        <Paragraph style={{ fontSize: '14px', margin: 0, whiteSpace: 'pre-wrap' }}>
                            {workOrder.notes}
                        </Paragraph>
                    </Card>
                )}

                {/* Decision Area */}
                <div style={{ marginTop: '40px' }}>
                    {workOrder.status === 'pending' ? (
                        <Card style={{
                            borderRadius: '16px',
                            textAlign: 'center',
                            background: '#fff',
                            border: '1px solid #1890ff',
                            padding: '24px'
                        }}>
                            <Title level={3} style={{ fontSize: '20px', fontWeight: 600 }}>Final Assignment Confirmation</Title>
                            <Paragraph style={{ fontSize: '15px', color: '#595959', maxWidth: '600px', margin: '0 auto 30px' }}>
                                Please review all site details, schedule windows, and payout rates. By accepting, you confirm your availability and agreement to execute this assignment.
                            </Paragraph>
                            <Space size="large" className="action-buttons-space">
                                <style>
                                    {`
                                        @media (max-width: 640px) {
                                            .action-buttons-space {
                                                flex-direction: column !important;
                                                width: 100%;
                                            }
                                            .action-buttons-space > .ant-space-item {
                                                width: 100%;
                                            }
                                            .action-buttons-space button {
                                                width: 100% !important;
                                            }
                                        }
                                    `}
                                </style>
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<CheckOutlined />}
                                    onClick={() => handleRespond('accepted')}
                                    loading={responseLoading}
                                    style={{
                                        backgroundColor: '#52c41a',
                                        borderColor: '#52c41a',
                                        height: '48px',
                                        padding: '0 40px',
                                        fontSize: '16px',
                                        fontWeight: 600,
                                        borderRadius: '8px'
                                    }}
                                >
                                    APPROVE & ACCEPT
                                </Button>
                                <Button
                                    danger
                                    size="large"
                                    icon={<CloseOutlined />}
                                    onClick={() => handleRespond('cancelled')}
                                    loading={responseLoading}
                                    style={{
                                        height: '48px',
                                        padding: '0 40px',
                                        fontSize: '16px',
                                        fontWeight: 500,
                                        borderRadius: '8px'
                                    }}
                                >
                                    DECLINE
                                </Button>
                            </Space>
                        </Card>
                    ) : (
                        <Card style={{ borderRadius: '16px', textAlign: 'center', padding: '40px' }}>
                            <Result
                                status={workOrder.status === 'accepted' || workOrder.status === 'completed' ? 'success' : 'warning'}
                                title={
                                    workOrder.status === 'accepted' ? 'Assignment Confirmed' :
                                        workOrder.status === 'completed' ? 'Assignment Completed' : 'Assignment Declined'
                                }
                                subTitle={
                                    workOrder.status === 'accepted' ? 'You have officially accepted this work order assignment.' :
                                        workOrder.status === 'completed' ? 'This assignment has been marked as successfully completed.' : 'You have declined this work order assignment.'
                                }
                            />
                        </Card>
                    )}
                </div>

                <div style={{ textAlign: 'center', marginTop: '48px', color: '#bfbfbf', fontSize: '12px' }}>
                    <Divider style={{ margin: '24px 0' }} />
                    <Paragraph>
                        Professional Moving CRM • Automated Contractor Portal
                    </Paragraph>
                    <Text disabled>© {new Date().getFullYear()} Baltic Van Lines. All rights reserved.</Text>
                </div>
            </div>
        </div>
    );
};

export default PublicWorkOrderPortal;
