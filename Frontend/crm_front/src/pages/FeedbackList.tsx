import React, { FC, useEffect, useState } from 'react';
import { Table, Button, Card, Space, Tag, Modal, notification, Rate, Tooltip, Select, Input } from 'antd';
import {
    StarOutlined,
    DeleteOutlined,
    PlusOutlined,
    MailOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { FeedbackUrl, CustomersUrl } from '../utils/network';
import { getAuthToken, getCurrentUser } from '../utils/functions';
import { FeedbackProps, CustomerProps } from '../utils/types';
import Header from '../components/Header';
import { fullname, role, email } from '../utils/data';
import BlackButton from '../components/BlackButton';

const { Option } = Select;

const FeedbackList: FC = () => {
    const [feedbacks, setFeedbacks] = useState<FeedbackProps[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
    const [customers, setCustomers] = useState<CustomerProps[]>([]);
    const [searching, setSearching] = useState(false);

    // User info for Header
    const currentUser = getCurrentUser();

    const fetchFeedbacks = async () => {
        setLoading(true);
        try {
            const token = getAuthToken();
            if (!token) return;
            const response = await axios.get(FeedbackUrl, token);
            setFeedbacks(response.data.results ? response.data.results : response.data);
        } catch (error) {
            console.error(error);
            notification.error({
                message: 'Error',
                description: 'Failed to load feedback',
                placement: 'topRight',
                duration: 3,
                title: 'Error'
            } as any);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedbacks();
    }, []);

    const handleSearchCustomer = async (value: string) => {
        if (!value) return;
        setSearching(true);
        try {
            const token = getAuthToken();
            if (!token) return;
            const response = await axios.get(`${CustomersUrl}?search=${value}`, token);
            setCustomers(response.data.results ? response.data.results : response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setSearching(false);
        }
    };

    const handleCreateRequest = async () => {
        if (!selectedCustomer) {
            notification.error({ message: 'Error', description: 'Please select a customer', duration: 3, title: 'Error' } as any);
            return;
        }

        try {
            const token = getAuthToken();
            if (!token) return;
            await axios.post(FeedbackUrl, {
                customer: selectedCustomer,
                status: 'draft'
            }, token);
            notification.success({ message: 'Success', description: 'Feedback request created', duration: 3, title: 'Success' } as any);
            setIsModalVisible(false);
            fetchFeedbacks();
            setSelectedCustomer(null);
        } catch (error) {
            console.error(error);
            notification.error({ message: 'Error', description: 'Failed to create request', duration: 3, title: 'Error' } as any);
        }
    };

    const handleDelete = async (id: number) => {
        Modal.confirm({
            title: 'Delete Feedback',
            content: 'Are you sure you want to delete this record?',
            onOk: async () => {
                try {
                    const token = getAuthToken();
                    if (!token) return;
                    await axios.delete(`${FeedbackUrl}/${id}`, token);
                    notification.success({ message: 'Success', description: 'Deleted successfully', duration: 3, title: 'Success' } as any);
                    fetchFeedbacks();
                } catch (error) {
                    notification.error({ message: 'Error', description: 'Failed to delete', duration: 3, title: 'Error' } as any);
                }
            }
        });
    };

    const handleSendEmail = async (record: FeedbackProps) => {
        try {
            const token = getAuthToken();
            if (!token) return;
            await axios.post(`${FeedbackUrl}/${record.id}/send_request`, {
                base_url: window.location.origin
            }, token);
            notification.success({ message: 'Success', description: 'Email sent successfully', duration: 3, title: 'Success' } as any);
            fetchFeedbacks();
        } catch (error) {
            console.error(error);
            notification.error({ message: 'Error', description: 'Failed to send email', duration: 3, title: 'Error' } as any);
        }
    };

    const columns = [
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                let color = 'default';
                if (status === 'received') color = 'success';
                if (status === 'requested') color = 'processing';
                if (status === 'draft') color = 'default';
                return <Tag color={color}>{status ? status.toUpperCase() : 'UNKNOWN'}</Tag>;
            }
        },
        {
            title: 'Customer',
            dataIndex: 'customer_name',
            key: 'customer_name',
        },
        {
            title: 'Rating',
            dataIndex: 'rating',
            key: 'rating',
            render: (rating: number) => <Rate disabled defaultValue={rating} style={{ fontSize: 14 }} />
        },
        {
            title: 'Comment',
            dataIndex: 'comment',
            key: 'comment',
            ellipsis: true,
        },
        {
            title: 'Sent At',
            dataIndex: 'request_sent_at',
            key: 'request_sent_at',
            render: (text: string) => text ? new Date(text).toLocaleString() : '-'
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: FeedbackProps) => (
                <Space>
                    {record.status !== 'received' && (
                        <Tooltip title="Send Request Email">
                            <Button
                                icon={<MailOutlined />}
                                size="small"
                                type="primary"
                                ghost
                                onClick={() => handleSendEmail(record)}
                            />
                        </Tooltip>
                    )}
                    <Button
                        icon={<DeleteOutlined />}
                        size="small"
                        danger
                        onClick={() => handleDelete(record.id!)}
                    />
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: '8px 16px 24px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1a1a2e' }}>Customer Feedback</h1>
                    <p style={{ color: '#8e8ea8', margin: '4px 0 0 0', fontSize: '13px' }}>Manage and request customer reviews and feedback</p>
                </div>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchFeedbacks}>Refresh</Button>
                    <BlackButton icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
                        New Request
                    </BlackButton>
                </Space>
            </div>

            <Card style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>

                <Table
                    columns={columns}
                    dataSource={feedbacks}
                    rowKey="id"
                    loading={loading}
                />

                <Modal
                    title="Create Feedback Request"
                    open={isModalVisible}
                    onOk={handleCreateRequest}
                    onCancel={() => setIsModalVisible(false)}
                >
                    <p>Select a customer to create a feedback request for:</p>
                    <Select
                        showSearch
                        placeholder="Search for a customer..."
                        style={{ width: '100%' }}
                        filterOption={false}
                        onSearch={handleSearchCustomer}
                        onChange={(val: number) => setSelectedCustomer(val)}
                        loading={searching}
                        notFoundContent={null}
                    >
                        {customers.map(c => (
                            <Option key={c.id} value={c.id}>{c.full_name} ({c.email})</Option>
                        ))}
                    </Select>
                </Modal>
            </Card>
        </div>
    );
};

export default FeedbackList;
