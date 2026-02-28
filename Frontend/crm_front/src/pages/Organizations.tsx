import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, Modal, Form, Input, Select, notification, Space, Avatar, Badge } from 'antd';
import { Chart } from 'react-google-charts';
import {
    TeamOutlined,
    PlusOutlined,
    DeleteOutlined,
    InfoCircleOutlined,
    ArrowLeftOutlined,
    UserOutlined,
    SafetyCertificateOutlined,
    MailOutlined,
    CheckCircleOutlined,
    ClusterOutlined,
    EditOutlined,
    GoogleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { OrganizationsUrl, MeUrl, RolesUrl } from '../utils/network';

import { getOrganizations, getAuthToken, getCurrentUser } from '../utils/functions';
import { ActionTypes, OrganizationProps, OrganizationMemberProps } from '../utils/types';
import { BlackButton, WhiteButton, PageLoader, VerticalTabs, InfoCard, AddOrganizationForm } from '../components';
import { store } from '../utils/store';
import { useContext } from 'react';


interface OrganizationsProps {
    hideHeader?: boolean;
}

const Organizations: React.FC<OrganizationsProps> = ({ hideHeader = false }) => {
    const navigate = useNavigate();
    const [organizations, setOrganizations] = useState<OrganizationProps[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isDetailVisible, setIsDetailVisible] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState<OrganizationProps | null>(null);
    const [members, setMembers] = useState<OrganizationMemberProps[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [isAddMemberVisible, setIsAddMemberVisible] = useState(false);
    const [roles, setRoles] = useState<any[]>([]);
    const [form] = Form.useForm();
    const [memberForm] = Form.useForm();
    const { state, dispatch } = useContext(store);

    const currentUser = state.user || getCurrentUser();
    const isSuperuser = currentUser?.role?.toLowerCase() === 'admin' && !localStorage.getItem('current_org_id');
    // Note: currentUser.role might be 'admin' for org admins too, so we check if they are in global context
    // Better yet, our backend get_organizations sets "role": "Superuser" for superusers.

    const isActuallySuperuser = currentUser?.organizations?.some((o: OrganizationProps) => o.role === 'Superuser');

    useEffect(() => {
        fetchOrganizations();
    }, []);

    const fetchOrganizations = async () => {
        getOrganizations(setOrganizations, setLoading);
    };

    const refreshUserContext = async () => {
        // Refresh user's organization context from /Me endpoint to update localStorage
        try {
            const headers = getAuthToken() as any;
            const response = await axios.get(MeUrl, headers);
            if (response.data) {
                if (response.data.organizations) {
                    localStorage.setItem('user_organizations', JSON.stringify(response.data.organizations));
                }
                dispatch({
                    type: ActionTypes.UPDATE_USER_INFO,
                    payload: response.data
                });
            }
        } catch (error) {
            console.error('Failed to refresh user context:', error);
        }
    };

    const fetchOrgMembers = async (orgId: number) => {
        setMembersLoading(true);
        try {
            const headers = getAuthToken() as any;
            const response = await axios.get(`${OrganizationsUrl}/${orgId}/members`, headers);
            setMembers(response.data);
        } catch (error) {
            notification.error({
                message: 'Error',
                description: 'Failed to fetch organization members',
                title: 'Error'
            });
        } finally {
            setMembersLoading(false);
        }
    };

    const fetchOrgRoles = async (orgId: number) => {
        try {
            const headers = getAuthToken() as any;
            // Explicitly set the organization context for this request
            if (headers && headers.headers) {
                headers.headers['X-Organization-ID'] = orgId.toString();
            }
            const response = await axios.get(RolesUrl, headers);
            setRoles(response.data);
        } catch (error) {
            console.error('Failed to fetch roles:', error);
        }
    };

    const handleAddMember = async (values: any) => {
        if (!selectedOrg) return;
        try {
            const headers = getAuthToken() as any;
            const response = await axios.post(`${OrganizationsUrl}/${selectedOrg.id}/add_member`, values, headers);

            const tempPassword = response.data?.temporary_password || response.data?.password;

            if (tempPassword) {
                Modal.success({
                    title: 'Member Added Successfully',
                    content: (
                        <div>
                            <p>User <b>{values.fullname}</b> has been added and automatically approved.</p>
                            <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '8px', border: '1px solid #d9d9d9', marginTop: '16px' }}>
                                <p style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>Sign-in Details:</p>
                                <p style={{ margin: 0 }}><b>Email:</b> {values.email}</p>
                                <p style={{ margin: 0 }}><b>Temporary Password:</b> {tempPassword}</p>
                            </div>
                            <p style={{ marginTop: '16px', fontSize: '12px', color: '#8c8c8c' }}>Please share these credentials with the user. They have also received a welcome email.</p>
                        </div>
                    ),
                    width: 450
                });
            } else {
                notification.success({
                    message: 'Member Added',
                    description: 'User has been added to the organization',
                    title: 'Success'
                });
            }

            setIsAddMemberVisible(false);
            memberForm.resetFields();
            fetchOrgMembers(selectedOrg.id);
        } catch (error: any) {
            notification.error({
                message: 'Error',
                description: error.response?.data?.error || 'Failed to add member',
                title: 'Error'
            });
        }
    };

    const handleRemoveMember = async (userId: number) => {
        if (!selectedOrg) return;
        Modal.confirm({
            title: 'Remove Member',
            content: 'Are you sure you want to remove this member? This will only remove them from this organization.',
            okText: 'Remove',
            okType: 'danger',
            onOk: async () => {
                try {
                    const headers = getAuthToken() as any;
                    await axios.post(`${OrganizationsUrl}/${selectedOrg.id}/remove_member`, { user_id: userId }, headers);
                    notification.success({
                        message: 'Member Removed',
                        description: 'Member has been removed from the organization',
                        title: 'Success'
                    });
                    fetchOrgMembers(selectedOrg.id);
                } catch (error: any) {
                    notification.error({
                        message: 'Error',
                        description: error.response?.data?.error || 'Failed to remove member',
                        title: 'Error'
                    });
                }
            }
        });
    };

    const handleCreateOrg = async (values: any) => {
        try {
            const headers = getAuthToken() as any;
            await axios.post(OrganizationsUrl, values, headers);
            notification.success({
                message: 'Success',
                description: 'Organization created successfully',
                title: 'Success'
            });
            setIsModalVisible(false);
            form.resetFields();
            await fetchOrganizations();
            await refreshUserContext(); // Refresh localStorage cache
        } catch (error: any) {
            notification.error({
                message: 'Error',
                description: error.response?.data?.error || 'Failed to create organization',
                title: 'Error'
            });
        }
    };

    const handleDeleteOrg = (id: number) => {
        Modal.confirm({
            title: 'Delete Organization',
            content: 'Are you sure you want to delete this organization? This action cannot be undone.',
            okText: 'Delete',
            okType: 'danger',
            onOk: async () => {
                try {
                    const headers = getAuthToken() as any;
                    await axios.delete(`${OrganizationsUrl}/${id}`, headers);
                    notification.success({
                        message: 'Deleted',
                        description: 'Organization deleted successfully',
                        title: 'Success'
                    });

                    // Refresh user context to update localStorage
                    await refreshUserContext();

                    // If we deleted the organization we are currently in (according to localStorage), clear context
                    const currentOrgId = localStorage.getItem('current_org_id');
                    if (currentOrgId && id.toString() === currentOrgId.toString()) {
                        localStorage.removeItem('current_org_name');
                        localStorage.removeItem('current_org_id');
                        window.location.href = '/'; // Refresh to dashboard
                    } else {
                        await fetchOrganizations();
                    }
                } catch (error: any) {
                    const errorMsg = error.response?.data?.error || error.response?.data?.detail || 'Failed to delete organization';
                    notification.error({
                        message: 'Deletion Failed',
                        description: errorMsg,
                        title: 'Error'
                    });
                    // Refresh anyway to clear stale UI
                    await fetchOrganizations();
                    await refreshUserContext();
                }
            }
        });
    };

    const showOrgDetails = (org: OrganizationProps) => {
        setSelectedOrg(org);
        setIsDetailVisible(true);
        fetchOrgMembers(org.id);
        fetchOrgRoles(org.id);
    };

    return (
        <>
            <div style={{
                padding: hideHeader ? '0' : '8px 16px 24px 16px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {!hideHeader && (
                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1a1a2e' }}>Organizations</h1>
                            <p style={{ color: '#8e8ea8', margin: '4px 0 0 0', fontSize: '13px' }}>Manage your organization hierarchy and members</p>
                        </div>
                        <Space>
                            <WhiteButton icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>Back</WhiteButton>
                            <BlackButton icon={<PlusOutlined />} onClick={() => { setSelectedOrg(null); setIsModalVisible(true); }}>
                                New Organization
                            </BlackButton>
                        </Space>
                    </div>
                )}

                {/* Add button for embedded view */}
                {hideHeader && (
                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                        <BlackButton icon={<PlusOutlined />} onClick={() => { setSelectedOrg(null); setIsModalVisible(true); }}>
                            New Organization
                        </BlackButton>
                    </div>
                )}

                {/* Organizations Cards Grid */}
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: '12px',
                    alignContent: 'flex-start',
                    padding: '4px'
                }}>
                    {loading ? (
                        <PageLoader text="Loading organizations..." />
                    ) : organizations.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                            <TeamOutlined style={{ fontSize: '36px', color: '#d9d9d9', marginBottom: '12px' }} />
                            <h3 style={{ marginBottom: '6px', color: '#1f2937', fontSize: '14px' }}>No organizations found</h3>
                            <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '12px' }}>Get started by creating your first organization.</p>
                            <BlackButton icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)} style={{ fontSize: '12px' }}>
                                New Organization
                            </BlackButton>
                        </div>
                    ) : (
                        organizations.map((org) => {
                            const isCurrent = localStorage.getItem('current_org_id') === org.id.toString();
                            const colors = { bg: '#f0f2ff', icon: '#5b6cf9' };

                            return (
                                <InfoCard
                                    key={org.id}
                                    title={org.name}
                                    subtitle={org.parent_organization_name}
                                    subtitleIcon={<ClusterOutlined />}
                                    icon={<TeamOutlined />}
                                    iconBgColor={colors.bg}
                                    iconColor={colors.icon}
                                    accentColor="#5b6cf9"
                                    highlighted={isCurrent}
                                    highlightColor="#5b6cf9"
                                    badge={isCurrent ? { label: 'CURRENT', color: '#5b6cf9', bgColor: '#f0f2ff' } : undefined}
                                    tags={[
                                        {
                                            label: org.org_type?.toUpperCase() || '',
                                            color: '#5b6cf9',
                                            bgColor: '#f0f2ff',
                                        },
                                        {
                                            label: org.is_active ? 'Active' : 'Inactive',
                                            color: org.is_active ? '#5b6cf9' : '#8c8c8c',
                                            bgColor: org.is_active ? '#f0f2ff' : '#f5f5f5',
                                            showDot: true,
                                        }
                                    ]}
                                    actions={[
                                        {
                                            label: 'Details',
                                            icon: <InfoCircleOutlined />,
                                            onClick: () => showOrgDetails(org),
                                            color: '#5b6cf9'
                                        },
                                        ...(isActuallySuperuser ? [{
                                            label: '',
                                            icon: <DeleteOutlined />,
                                            onClick: () => handleDeleteOrg(org.id),
                                            danger: true,
                                        }] : [])
                                    ]}
                                    onClick={() => showOrgDetails(org)}
                                />
                            );
                        })
                    )}
                </div>
            </div>

            <AddOrganizationForm
                isVisible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                onSuccessCallBack={fetchOrganizations}
                organizations={organizations}
                isActuallySuperuser={isActuallySuperuser}
                editingOrganization={selectedOrg}
            />


            {/* Organization Details Modal */}
            <Modal
                title={null}
                open={isDetailVisible}
                onCancel={() => setIsDetailVisible(false)}
                width={950}
                footer={null}
                bodyStyle={{ padding: 0 }}
                style={{ top: 20 }}
                centered
            >
                {/* Modal Header */}
                <div style={{
                    padding: '12px 18px',
                    borderBottom: '1px solid #f0f0f0',
                    background: '#ffffff',
                    borderTopLeftRadius: '12px',
                    borderTopRightRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '8px',
                            background: '#f0f2ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #e0e7ff'
                        }}>
                            <TeamOutlined style={{
                                fontSize: '18px',
                                color: '#5b6cf9'
                            }} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1a1a2e' }}>
                                {selectedOrg?.name}
                            </h2>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                <Tag bordered={false} style={{ fontSize: '11px', margin: 0, padding: '0 8px', borderRadius: '4px', backgroundColor: '#f0f2ff', color: '#5b6cf9', fontWeight: 600 }}>
                                    {selectedOrg?.org_type?.toUpperCase()}
                                </Tag>
                                <Tag bordered={false} color={selectedOrg?.is_active ? 'success' : 'default'} style={{ fontSize: '11px', margin: 0, padding: '0 8px', borderRadius: '4px', fontWeight: 600 }}>
                                    {selectedOrg?.is_active ? 'ACTIVE' : 'INACTIVE'}
                                </Tag>
                                {selectedOrg?.parent_organization_name && (
                                    <Tag bordered={false} style={{ fontSize: '11px', margin: 0, padding: '0 8px', borderRadius: '4px', backgroundColor: '#fff7e6', color: '#fa8c16', fontWeight: 600 }}>
                                        <ClusterOutlined style={{ marginRight: '4px' }} />
                                        PART OF {selectedOrg.parent_organization_name.toUpperCase()}
                                    </Tag>
                                )}
                            </div>
                        </div>
                    </div>
                    {(isActuallySuperuser || selectedOrg?.role === 'Admin') && (
                        <BlackButton
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => setIsModalVisible(true)}
                            style={{ fontSize: '12px' }}
                        >
                            Edit Organization
                        </BlackButton>
                    )}
                </div>

                {/* Main Content Area */}
                <div style={{ height: '380px', background: '#fcfcfd' }}>
                    <VerticalTabs
                        tabWidth={150}
                        items={[
                            {
                                key: 'overview',
                                label: 'Quick Overview',
                                icon: <InfoCircleOutlined />,
                                children: (
                                    <div style={{ padding: '20px', height: '100%', overflow: 'auto' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                                            <Card size="small" style={{ borderRadius: '12px', border: '1px solid #eef0f2', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                                <div style={{ color: '#8e8ea8', fontSize: '12px', marginBottom: '8px' }}>Total Members</div>
                                                <div style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e' }}>{members.length}</div>
                                                <div style={{ color: '#52c41a', fontSize: '11px', marginTop: '4px' }}>Active Staff</div>
                                            </Card>
                                            <Card size="small" style={{ borderRadius: '12px', border: '1px solid #eef0f2', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                                <div style={{ color: '#8e8ea8', fontSize: '12px', marginBottom: '8px' }}>Hierarchy Nodes</div>
                                                <div style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e' }}>{1 + (selectedOrg?.sub_organizations?.length || 0)}</div>
                                                <div style={{ color: '#5b6cf9', fontSize: '11px', marginTop: '4px' }}>Child Branches</div>
                                            </Card>
                                            <Card size="small" style={{ borderRadius: '12px', border: '1px solid #eef0f2', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                                <div style={{ color: '#8e8ea8', fontSize: '12px', marginBottom: '8px' }}>Defined Roles</div>
                                                <div style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e' }}>{roles.length}</div>
                                                <div style={{ color: '#fa8c16', fontSize: '11px', marginTop: '4px' }}>Access Levels</div>
                                            </Card>
                                        </div>

                                        <div style={{ border: '1px solid #eef0f2', borderRadius: '12px', background: '#fff', padding: '16px' }}>
                                            <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <CheckCircleOutlined style={{ color: '#5b6cf9' }} />
                                                Organization Details
                                            </h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                <div>
                                                    <div style={{ marginBottom: '16px' }}>
                                                        <div style={{ fontSize: '11px', color: '#8e8ea8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trading Name</div>
                                                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a2e' }}>{selectedOrg?.name}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '11px', color: '#8e8ea8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Structure Type</div>
                                                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a2e' }}>Corporate {selectedOrg?.org_type}</div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ marginBottom: '16px' }}>
                                                        <div style={{ fontSize: '11px', color: '#8e8ea8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date Created</div>
                                                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a2e' }}>{selectedOrg?.created_at ? new Date(selectedOrg.created_at).toLocaleDateString() : 'N/A'}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '11px', color: '#8e8ea8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</div>
                                                        <Badge status={selectedOrg?.is_active ? 'success' : 'error'} text={selectedOrg?.is_active ? 'Performance Optimized' : 'Inactive'} style={{ fontSize: '13px' }} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ marginTop: '16px', borderTop: '1px solid #f6f8fa', paddingTop: '16px' }}>
                                                <div style={{ fontSize: '11px', color: '#8e8ea8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    <GoogleOutlined style={{ marginRight: '6px' }} />
                                                    Google Business Review Link
                                                </div>
                                                <div style={{ fontSize: '13px', color: selectedOrg?.google_business_link ? '#5b6cf9' : '#8c8c8c' }}>
                                                    {selectedOrg?.google_business_link ? (
                                                        <a href={selectedOrg.google_business_link} target="_blank" rel="noopener noreferrer">
                                                            {selectedOrg.google_business_link}
                                                        </a>
                                                    ) : 'No link set. Positive feedback will not be redirected to Google.'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                key: 'members',
                                label: 'Team Members',
                                icon: <UserOutlined />,
                                children: (
                                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px' }}>
                                        {/* Members Header */}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '16px',
                                            flexShrink: 0
                                        }}>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1a1a2e' }}>
                                                    Resource Allocation
                                                </h3>
                                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#8e8ea8' }}>
                                                    Managing {members.length} verified personnel within this node
                                                </p>
                                            </div>
                                            <BlackButton
                                                size="small"
                                                icon={<PlusOutlined />}
                                                onClick={() => setIsAddMemberVisible(true)}
                                                style={{ fontSize: '12px', padding: '6px 16px', height: 'auto', borderRadius: '8px' }}
                                            >
                                                Assign New Member
                                            </BlackButton>
                                        </div>

                                        {/* Members Grid */}
                                        <div style={{
                                            flex: 1,
                                            overflow: 'auto',
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                                            gap: '12px',
                                            alignContent: 'flex-start',
                                            padding: '4px'
                                        }}>
                                            {membersLoading ? (
                                                <PageLoader text="Loading members..." />
                                            ) : members.length === 0 ? (
                                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '12px', border: '1px dashed #e5e7eb' }}>
                                                    <UserOutlined style={{ fontSize: '32px', color: '#d9d9d9', marginBottom: '12px' }} />
                                                    <p style={{ color: '#8e8ea8', fontSize: '13px', margin: 0 }}>No personnel assigned to this node.</p>
                                                </div>
                                            ) : (
                                                members.map((member) => (
                                                    <div
                                                        key={member.id}
                                                        style={{
                                                            background: '#ffffff',
                                                            borderRadius: '12px',
                                                            border: '1px solid #eef0f2',
                                                            padding: '16px',
                                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                            cursor: 'default',
                                                            position: 'relative',
                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.borderColor = '#5b6cf9';
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(91, 108, 249, 0.1)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.borderColor = '#eef0f2';
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                            <Avatar
                                                                size={44}
                                                                style={{
                                                                    background: 'linear-gradient(135deg, #5b6cf9 0%, #a5affd 100%)',
                                                                    flexShrink: 0,
                                                                    fontSize: '16px',
                                                                    fontWeight: 600,
                                                                    borderRadius: '10px'
                                                                }}
                                                            >
                                                                {member.user_fullname?.charAt(0)?.toUpperCase() || 'U'}
                                                            </Avatar>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    gap: '8px',
                                                                }}>
                                                                    <span style={{
                                                                        fontWeight: 700,
                                                                        fontSize: '14px',
                                                                        color: '#1a1a2e',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap',
                                                                    }}>
                                                                        {member.user_fullname}
                                                                    </span>
                                                                    {member.is_default && (
                                                                        <Tag color="success" style={{ fontSize: '8px', padding: '0 4px', borderRadius: '3px', margin: 0, fontWeight: 700 }}>PRIMARY</Tag>
                                                                    )}
                                                                </div>
                                                                <div style={{
                                                                    color: '#8e8ea8',
                                                                    fontSize: '11px',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    marginTop: '2px'
                                                                }}>
                                                                    {member.user_email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div style={{
                                                            marginTop: '16px',
                                                            paddingTop: '12px',
                                                            borderTop: '1px solid #f6f8fa',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center'
                                                        }}>
                                                            <span style={{
                                                                background: '#f0f2ff',
                                                                color: '#5b6cf9',
                                                                padding: '4px 8px',
                                                                borderRadius: '6px',
                                                                fontSize: '10px',
                                                                fontWeight: 700,
                                                            }}>
                                                                {member.role_name?.toUpperCase() || 'USER'}
                                                            </span>
                                                            {String(member.user_id) !== String(currentUser?.id) && (
                                                                <Button
                                                                    type="text"
                                                                    danger
                                                                    size="small"
                                                                    icon={<DeleteOutlined style={{ fontSize: '13px' }} />}
                                                                    onClick={() => handleRemoveMember(member.user_id || member.id!)}
                                                                    style={{ borderRadius: '6px' }}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )
                            },
                            {
                                key: 'hierarchy',
                                label: 'Structural Tree',
                                icon: <SafetyCertificateOutlined />,
                                children: (
                                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px' }}>
                                        <div style={{ marginBottom: '16px' }}>
                                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1a1a2e' }}>
                                                Organizational Hierarchy
                                            </h3>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#8e8ea8' }}>
                                                Visualization of reporting lines and sub-divisions
                                            </p>
                                        </div>

                                        <div style={{
                                            flex: 1,
                                            background: '#ffffff',
                                            borderRadius: '16px',
                                            border: '1px solid #eef0f2',
                                            padding: '12px',
                                            overflow: 'auto',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)'
                                        }}>
                                            {selectedOrg && (
                                                <Chart
                                                    width={'100%'}
                                                    height={'260px'}
                                                    chartType="OrgChart"
                                                    loader={<div>Formatting Structural View...</div>}
                                                    data={[
                                                        ['Name', 'Manager', 'Tooltip'],
                                                        // Root: Parent (if exists)
                                                        ...(selectedOrg.parent_organization_name ? [[
                                                            {
                                                                v: 'parent',
                                                                f: `<div style="color:#8e8ea8; font-size:10px; font-weight:600; margin-bottom:4px;">PARENT NODE</div><div style="color:#1a1a2e; font-weight:700;">${selectedOrg.parent_organization_name}</div><div style="color:#fa8c16; font-size:10px; margin-top:4px; font-weight:600;">ROOT</div>`
                                                            },
                                                            '',
                                                            'Global Parent'
                                                        ]] : []),
                                                        // Current Org
                                                        [
                                                            {
                                                                v: 'current',
                                                                f: `<div style="color:#5b6cf9; font-size:10px; font-weight:600; margin-bottom:4px;">ACTIVE NODE</div><div style="color:#1a1a2e; font-weight:700;">${selectedOrg.name}</div><div style="color:#5b6cf9; font-size:10px; margin-top:4px; font-weight:600;">${selectedOrg.org_type?.toUpperCase()}</div>`
                                                            },
                                                            selectedOrg.parent_organization_name ? 'parent' : '',
                                                            'Selected Organization'
                                                        ],
                                                        // Children
                                                        ...(selectedOrg.sub_organizations || []).map((sub, idx) => [
                                                            {
                                                                v: `sub_${idx}`,
                                                                f: `<div style="color:#8c8c8c; font-size:10px; font-weight:600; margin-bottom:4px;">SUB-DIVISION</div><div style="color:#1a1a2e; font-weight:700;">${sub.name}</div><div style="color:#722ed1; font-size:10px; margin-top:4px; font-weight:600;">${sub.org_type?.toUpperCase()}</div>`
                                                            },
                                                            'current',
                                                            `Child Branch: ${sub.name}`
                                                        ])
                                                    ]}
                                                    options={{
                                                        allowHtml: true,
                                                        size: 'medium',
                                                        nodeClass: 'org-node-premium',
                                                        selectedNodeClass: 'org-node-selected'
                                                    }}
                                                />
                                            )}
                                        </div>

                                        {/* Dynamic CSS for OrgChart nodes to match theme */}
                                        <style dangerouslySetInnerHTML={{
                                            __html: `
                                            .org-node-premium {
                                                background: #ffffff !important;
                                                border: 1.5px solid #eef0f2 !important;
                                                border-radius: 10px !important;
                                                padding: 12px 20px !important;
                                                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05) !important;
                                                cursor: pointer !important;
                                                transition: all 0.2s ease !important;
                                            }
                                            .org-node-premium:hover {
                                                border-color: #5b6cf9 !important;
                                                box-shadow: 0 10px 15px -3px rgba(91, 108, 249, 0.1) !important;
                                            }
                                            .org-node-selected {
                                                background: #f0f2ff !important;
                                                border-color: #5b6cf9 !important;
                                            }
                                            .google-visualization-orgchart-lineleft { border-left: 1.5px solid #d1d5db !important; }
                                            .google-visualization-orgchart-lineright { border-right: 1.5px solid #d1d5db !important; }
                                            .google-visualization-orgchart-linebottom { border-bottom: 1.5px solid #d1d5db !important; }
                                        `}} />
                                    </div>
                                )
                            }
                        ]}
                    />
                </div>
            </Modal >

            {/* Add Member Modal */}
            < Modal
                title="Add Member to Organization"
                open={isAddMemberVisible}
                onCancel={() => setIsAddMemberVisible(false)}
                footer={null}
            >
                <Form form={memberForm} layout="vertical" onFinish={handleAddMember}>
                    <Form.Item
                        name="email"
                        label="User Email"
                        rules={[{ required: true, type: 'email' }]}
                    >
                        <Input placeholder="user@example.com" />
                    </Form.Item>
                    <Form.Item
                        name="fullname"
                        label="Full Name"
                        rules={[{ required: true }]}
                    >
                        <Input placeholder="John Doe" />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        label="Password (Optional)"
                        help="If empty, a temporary password will be generated"
                    >
                        <Input.Password placeholder="Set password" />
                    </Form.Item>
                    <Form.Item
                        name="role_id"
                        label="Role"
                        help="Empty defaults to regular user"
                    >
                        <Select placeholder="Select role" allowClear>
                            {roles.map(role => (
                                <Select.Option key={role.id} value={role.id}>{role.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="is_default"
                        valuePropName="checked"
                    >
                        <Input type="checkbox" style={{ width: 'auto', marginRight: '8px' }} /> Set as primary organization for this user
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
                        <BlackButton htmlType="submit" block>Save</BlackButton>
                    </Form.Item>
                </Form>
            </Modal >
        </>
    );
};

export default Organizations;
