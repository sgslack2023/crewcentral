import React, { useState, useEffect } from 'react';
import {
    TeamOutlined,
    UserOutlined,
    SafetyCertificateOutlined
} from '@ant-design/icons';
import { getUsers } from '../utils/functions';
import Organizations from './Organizations';
import { UserManagement } from '../components/UserManagement';
import RoleManagement from '../components/RoleManagement';
import { VerticalTabs, AccountRequests } from '../components';
import { store } from '../utils/store';
import { useContext } from 'react';
import { getCurrentUser } from '../utils/functions';
import { OrganizationProps, UserProps } from '../utils/types';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const Membership: React.FC = () => {
    // User Management State
    const [users, setUsers] = useState<any[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        getUsers(setUsers, setUsersLoading);
    };

    const { state } = useContext(store);
    const currentUser = state.user || getCurrentUser();

    // Superuser check consistent with Sidebar.tsx
    const isActuallySuperuser = currentUser?.is_superuser;

    const approvedUsers = users.filter((u: UserProps) => u.approved !== false);
    const pendingUsers = users.filter((u: UserProps) => u.approved === false);

    const tabItems = [
        {
            key: 'users',
            label: 'Users',
            icon: <UserOutlined />,
            children: (
                <UserManagement
                    approvedUsers={approvedUsers}
                    onRefreshUsers={fetchUsers}
                    onEditUser={() => { }}
                    loading={usersLoading}
                />
            )
        },
        {
            key: 'organizations',
            label: 'Organizations',
            icon: <TeamOutlined />,
            children: <Organizations hideHeader={true} />
        },
        {
            key: 'roles',
            label: 'Roles & Permissions',
            icon: <SafetyCertificateOutlined />,
            children: <RoleManagement hideHeader={true} />
        }
    ];

    if (isActuallySuperuser) {
        tabItems.push({
            key: 'requests',
            label: 'Account Requests',
            icon: <ExclamationCircleOutlined />,
            children: (
                <AccountRequests
                    pendingUsers={pendingUsers}
                    onRefresh={fetchUsers}
                    loading={usersLoading}
                />
            )
        });
    }

    return (
        <div style={{ padding: '8px 16px 24px 16px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ marginBottom: '16px', flexShrink: 0 }}>
                <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1a1a2e' }}>Membership</h1>
                <p style={{ color: '#8e8ea8', margin: '4px 0 0 0', fontSize: '13px' }}>Manage user accounts, organization hierarchy, and access control</p>
            </div>

            <div style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                flex: 1,
                minHeight: 0,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                display: 'flex',
                overflow: 'hidden'
            }}>
                <VerticalTabs
                    items={tabItems}
                    defaultActiveKey="users"
                    tabWidth={220}
                />
            </div>
        </div>
    );
};

export default Membership;
