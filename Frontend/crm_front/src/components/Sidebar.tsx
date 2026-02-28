import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    HomeOutlined,
    DollarOutlined,
    TeamOutlined,
    SettingOutlined,
    SafetyCertificateOutlined,
    AppstoreOutlined,
    LogoutOutlined,
    UserOutlined,
    BankOutlined,
    NodeIndexOutlined,
    CheckCircleOutlined,
    CarOutlined,
    CameraOutlined
} from '@ant-design/icons';
import { Tooltip, Modal, List, Typography, Badge } from 'antd';
import { ShopOutlined, CheckCircleFilled } from '@ant-design/icons';
import { setOrganizationContext, getCurrentUser } from '../utils/functions';
import { OrganizationProps } from '../utils/types';

const { Text } = Typography;

interface SidebarProps {
    currentUser?: any;
}

const Sidebar: React.FC<SidebarProps> = ({ currentUser: propUser }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isOrgModalVisible, setIsOrgModalVisible] = React.useState(false);

    // Use prop if available, otherwise fallback to localStorage
    const currentUser = propUser || getCurrentUser();
    const organizations: OrganizationProps[] = currentUser?.organizations || [];
    const currentOrgId = localStorage.getItem('current_org_id');

    const isActive = (path: string) => location.pathname === path;

    interface MenuItem {
        key: string;
        icon: React.ReactNode;
        label: string;
        adminOnly?: boolean;
    }

    // Define sidebar items
    const menuItems: MenuItem[] = [
        {
            key: '/',
            icon: <HomeOutlined />,
            label: 'Spaces',
        },
        {
            key: '/deals',

            icon: <NodeIndexOutlined />,
            label: 'Deals',
        },
        {
            key: '/customers',
            icon: <TeamOutlined />,
            label: 'Customers',
        },
        {
            key: '/finance',
            icon: <BankOutlined />, // Or another appropriate icon
            label: 'Finance',
        },
        {
            key: '/membership',
            icon: <SafetyCertificateOutlined />,
            label: 'Membership',
            adminOnly: true,
        },
        {
            key: '/settings',
            icon: <SettingOutlined />,
            label: 'Settings',
        }
    ];

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/login';
    };

    const isSuperuser = currentUser.is_superuser;
    const currentOrgRole = organizations.find(o => o.id.toString() === currentOrgId)?.role?.toLowerCase();

    const visibleMenuItems = menuItems.filter(item =>
        !item.adminOnly || isSuperuser || currentOrgRole === 'admin'
    );

    const currentOrgName = organizations.find(o => o.id.toString() === currentOrgId)?.name;

    return (
        <div style={{
            width: '40px',
            minWidth: '40px',
            backgroundColor: '#1e1e2d', // Dark navy/black
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: '20px',
            height: '100vh',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            boxShadow: '2px 0 8px rgba(0,0,0,0.15)'
        }}>
            {/* Logo Area */}
            <div style={{
                marginBottom: '16px',
                color: 'white',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer'
            }} onClick={() => navigate('/')}>
                <AppstoreOutlined style={{ color: '#5b6cf9' }} />
            </div>

            {/* Navigation Items */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                width: '100%',
                alignItems: 'center'
            }}>
                {visibleMenuItems.map(item => (
                    <Tooltip title={item.label} placement="right" key={item.key}>
                        <div
                            onClick={() => navigate(item.key)}
                            style={{
                                cursor: 'pointer',
                                color: isActive(item.key) ? '#ffffff' : '#8e8ea8',
                                backgroundColor: isActive(item.key) ? '#5b6cf9' : 'transparent',
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                transition: 'all 0.2s ease',
                            }}
                            className="sidebar-icon"
                        >
                            {item.icon}
                        </div>
                    </Tooltip>
                ))}
            </div>

            {/* User / Logout */}
            <div style={{
                paddingBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                alignItems: 'center'
            }}>
                <Tooltip title={currentOrgName ? `Organization: ${currentOrgName}` : (currentUser?.fullname || 'Profile')} placement="right">
                    <div
                        style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: '#3f4254',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: isOrgModalVisible ? '2px solid #5b6cf9' : 'none'
                        }}
                        onClick={() => setIsOrgModalVisible(true)}
                    >
                        {currentUser?.fullname ? currentUser.fullname.charAt(0).toUpperCase() : <UserOutlined />}
                    </div>
                </Tooltip>

                <Tooltip title="Sign Out" placement="right">
                    <div
                        onClick={handleLogout}
                        style={{
                            cursor: 'pointer',
                            color: '#d9534f',
                            fontSize: '18px',
                        }}
                    >
                        <LogoutOutlined />
                    </div>
                </Tooltip>
            </div>

            {/* Organization Selection Modal */}
            <Modal
                title={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ShopOutlined /> Select Organization</div>}
                open={isOrgModalVisible}
                onCancel={() => setIsOrgModalVisible(false)}
                footer={null}
                width={400}
                centered
            >
                <div style={{ padding: '8px 0' }}>
                    <List
                        dataSource={organizations}
                        renderItem={(org) => {
                            const isCurrent = org.id.toString() === currentOrgId;
                            return (
                                <List.Item
                                    onClick={() => {
                                        if (!isCurrent) {
                                            setOrganizationContext(org.id);
                                            window.location.reload();
                                        }
                                        setIsOrgModalVisible(false);
                                    }}
                                    style={{
                                        cursor: 'pointer',
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        marginBottom: '8px',
                                        border: isCurrent ? '1px solid #5b6cf9' : '1px solid #f0f0f0',
                                        backgroundColor: isCurrent ? '#f5f7ff' : '#fff',
                                        transition: 'all 0.2s ease'
                                    }}
                                    className="org-list-item"
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <Text strong style={{ color: isCurrent ? '#5b6cf9' : 'inherit' }}>{org.name}</Text>
                                            <Text type="secondary" style={{ fontSize: '12px' }}>{org.role} • {org.org_type}</Text>
                                        </div>
                                        {isCurrent && <CheckCircleFilled style={{ color: '#5b6cf9', fontSize: '18px' }} />}
                                    </div>
                                </List.Item>
                            );
                        }}
                    />

                    {organizations.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '24px', color: '#8e8ea8' }}>
                            No organizations assigned to your account.
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default Sidebar;
