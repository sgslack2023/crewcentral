import React, { useState } from 'react';
import {
    Modal,
    notification,
    Tag,
    Card,
    Typography,
    Space,
    Table,
    Input
} from 'antd';
import {
    UserOutlined,
    MailOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    BankOutlined,
    CalendarOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons';
import { UserProps, AuthTokenType } from '../utils/types';
import { getAuthToken } from '../utils/functions';
import { UsersUrl } from '../utils/network';
import axios from 'axios';
import dayjs from 'dayjs';
import { BlackButton, WhiteButton, PageLoader } from './';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface AccountRequestsProps {
    pendingUsers: UserProps[];
    onRefresh: () => void;
    loading: boolean;
}

const AccountRequests: React.FC<AccountRequestsProps> = ({
    pendingUsers,
    onRefresh,
    loading
}) => {
    const [actionLoading, setActionLoading] = useState(false);
    const [approvalModal, setApprovalModal] = useState<{
        visible: boolean;
        user: UserProps | null;
        action: 'approve' | 'deny';
    }>({
        visible: false,
        user: null,
        action: 'approve'
    });
    const [denialReason, setDenialReason] = useState('');

    const handleAction = (user: UserProps, action: 'approve' | 'deny') => {
        setApprovalModal({
            visible: true,
            user,
            action
        });
        setDenialReason('');
    };

    const confirmAction = async () => {
        if (!approvalModal.user) return;

        setActionLoading(true);
        try {
            const headers = getAuthToken() as AuthTokenType;
            const isApproval = approvalModal.action === 'approve';

            const payload: any = {
                approved: isApproval,
            };

            if (!isApproval) {
                payload.denial_reason = denialReason;
            }

            await axios.patch(`${UsersUrl}/${approvalModal.user.id}`, payload, headers);

            notification.success({
                message: `Account ${isApproval ? 'Approved' : 'Denied'}`,
                description: `Successfully ${isApproval ? 'approved' : 'denied'} the account request for ${approvalModal.user.fullname}.`,
                title: "Success"
            });

            setApprovalModal({ visible: false, user: null, action: 'approve' });
            onRefresh();
        } catch (error: any) {
            notification.error({
                message: "Error",
                description: error.response?.data?.error || `Failed to ${approvalModal.action} account request.`,
                title: "Error"
            });
        } finally {
            setActionLoading(false);
        }
    };

    const columns = [
        {
            title: 'Full Name',
            dataIndex: 'fullname',
            key: 'fullname',
            render: (text: string, record: UserProps) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <UserOutlined style={{ color: '#5b6cf9' }} />
                    <Text strong>{text}</Text>
                </div>
            )
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            render: (text: string) => (
                <Space>
                    <MailOutlined style={{ color: '#8e8ea8', fontSize: '12px' }} />
                    <Text style={{ fontSize: '12px' }}>{text}</Text>
                </Space>
            )
        },
        {
            title: 'Requested Organization',
            key: 'organization',
            render: (record: UserProps) => {
                const org = record.organizations?.[0]; // Usually just one for new requests
                return (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <BankOutlined style={{ color: '#8e8ea8', fontSize: '12px' }} />
                        <Text style={{ fontSize: '12px' }}>{org?.name || 'N/A'}</Text>
                    </div>
                );
            }
        },
        {
            title: 'Role Requested',
            dataIndex: 'role',
            key: 'role',
            render: (role: string) => (
                <Tag color="orange">{role}</Tag>
            )
        },
        {
            title: 'Requested On',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => (
                <Space>
                    <CalendarOutlined style={{ color: '#8e8ea8', fontSize: '12px' }} />
                    <Text style={{ fontSize: '12px' }}>{dayjs(date).format('MMM DD, YYYY HH:mm')}</Text>
                </Space>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 200,
            render: (record: UserProps) => (
                <Space>
                    <WhiteButton
                        icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                        onClick={() => handleAction(record, 'approve')}
                        style={{ border: '1px solid #52c41a', color: '#52c41a' }}
                    >
                        Approve
                    </WhiteButton>
                    <WhiteButton
                        icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                        onClick={() => handleAction(record, 'deny')}
                        style={{ border: '1px solid #ff4d4f', color: '#ff4d4f' }}
                    >
                        Deny
                    </WhiteButton>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: '0 16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '20px' }}>
                <Title level={4} style={{ margin: 0 }}>Pending Account Requests</Title>
                <Text type="secondary">Review and approve new user signups</Text>
            </div>

            {loading ? (
                <PageLoader text="Loading requests..." />
            ) : pendingUsers.length === 0 ? (
                <Card style={{ textAlign: 'center', padding: '40px' }}>
                    <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#bfbfbf', marginBottom: '16px' }} />
                    <Title level={5}>No Pending Requests</Title>
                    <Text type="secondary">All account requests have been processed.</Text>
                </Card>
            ) : (
                <div style={{ flex: 1, overflow: 'auto' }}>
                    <Table
                        columns={columns}
                        dataSource={pendingUsers}
                        rowKey="id"
                        pagination={false}
                        className="custom-table"
                        style={{ backgroundColor: '#fff', borderRadius: '8px' }}
                    />
                </div>
            )}

            <Modal
                title={approvalModal.action === 'approve' ? "Approve Account Request" : "Deny Account Request"}
                open={approvalModal.visible}
                onCancel={() => setApprovalModal({ visible: false, user: null, action: 'approve' })}
                footer={[
                    <WhiteButton key="cancel" onClick={() => setApprovalModal({ visible: false, user: null, action: 'approve' })}>
                        Cancel
                    </WhiteButton>,
                    <BlackButton
                        key="confirm"
                        loading={actionLoading}
                        onClick={confirmAction}
                        style={{
                            backgroundColor: approvalModal.action === 'approve' ? '#52c41a' : '#ff4d4f',
                            borderColor: approvalModal.action === 'approve' ? '#52c41a' : '#ff4d4f'
                        }}
                    >
                        Confirm {approvalModal.action === 'approve' ? 'Approval' : 'Denial'}
                    </BlackButton>
                ]}
            >
                {approvalModal.user && (
                    <div style={{ padding: '12px 0' }}>
                        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                            <div style={{ marginBottom: '8px' }}>
                                <Text type="secondary" style={{ fontSize: '12px' }}>Requested By</Text><br />
                                <Text strong style={{ fontSize: '16px' }}>{approvalModal.user.fullname}</Text>
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                                <Text type="secondary" style={{ fontSize: '12px' }}>Email Address</Text><br />
                                <Text>{approvalModal.user.email}</Text>
                            </div>
                            <div>
                                <Text type="secondary" style={{ fontSize: '12px' }}>Organization</Text><br />
                                <Text>{approvalModal.user.organizations?.[0]?.name || 'N/A'}</Text>
                            </div>
                        </div>

                        {approvalModal.action === 'approve' ? (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <ExclamationCircleOutlined style={{ color: '#1890ff', marginTop: '4px' }} />
                                <Text style={{ fontSize: '14px' }}>
                                    Upon approval, this user will receive a welcome email with a link to set their password.
                                </Text>
                            </div>
                        ) : (
                            <div>
                                <Text strong style={{ display: 'block', marginBottom: '8px' }}>Reason for Denial (Sent to user)</Text>
                                <TextArea
                                    rows={4}
                                    placeholder="Briefly explain why the request was denied..."
                                    value={denialReason}
                                    onChange={(e) => setDenialReason(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AccountRequests;
