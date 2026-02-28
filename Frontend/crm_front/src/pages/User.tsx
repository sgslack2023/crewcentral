import React, { FC, useState } from "react";
import { Select } from "antd";
import { UserOutlined, ClockCircleOutlined, CloseCircleOutlined, SecurityScanOutlined, TeamOutlined, PlusOutlined } from '@ant-design/icons';
import { useGetUsers } from "../utils/hooks";
import { UserProps } from "../utils/types";
import { getUsers, getCurrentUser, getGlobalUsers } from "../utils/functions";
import AdminApprovalPanel from "../components/AdminApprovalPanel";
import UserManagement from "../components/UserManagement";
import DeniedUsersPanel from "../components/DeniedUsersPanel";
import RoleManagement from "../components/RoleManagement";
import { VerticalTabs, SearchBar, BlackButton, AddUserForm } from "../components";
import { useNavigate } from 'react-router-dom';
import Organizations from './Organizations';


interface UserPageProps {
  initialTab?: 'approved' | 'pending' | 'denied';
}

const User: FC<UserPageProps> = ({ initialTab }) => {
  const navigate = useNavigate();
  const [fetching, setFetching] = useState(true);
  const [users, setUsers] = useState<UserProps[] | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  // Get initial tab from localStorage if available, otherwise use prop or default
  const getInitialTab = () => {
    const storedTab = localStorage.getItem('userManagementTab') as 'approved' | 'pending' | null;
    if (storedTab) {
      localStorage.removeItem('userManagementTab'); // Clear after reading
      return storedTab;
    }
    return initialTab || "approved";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const currentUser = getCurrentUser();
  const isSuperuser = currentUser?.role === 'Admin'; // In this system, Admin role at global level usually means superuser

  const [globalUsers, setGlobalUsers] = useState<UserProps[]>([]);
  const [fetchingGlobal, setFetchingGlobal] = useState(false);

  useGetUsers(setUsers, setFetching);

  const refreshUsers = () => {
    getUsers(setUsers, setFetching);
    if (isSuperuser) {
      getGlobalUsers(setGlobalUsers, setFetchingGlobal);
    }
  };

  React.useEffect(() => {
    if (isSuperuser) {
      getGlobalUsers(setGlobalUsers, setFetchingGlobal);
    }
  }, [isSuperuser]);

  const [isAddUserVisible, setIsAddUserVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProps | null>(null);

  const handleEditUser = (user: UserProps) => {
    setEditingUser(user);
    setIsAddUserVisible(true);
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setIsAddUserVisible(true);
  };

  // Separate users by approval status
  const pendingUsers = users?.filter(user => !user.approved && !user.denial_reason) || [];
  const approvedUsers = users?.filter(user => user.approved) || [];
  const deniedUsers = users?.filter(user => !user.approved && user.denial_reason) || [];

  const tabItems = [
    {
      key: 'users',
      label: 'Users',
      icon: <UserOutlined />,
      children: (
        <div>
          {/* Search and Filters */}
          <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <SearchBar
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, minWidth: '250px' }}
              allowClear
            />
            <Select
              value={selectedRole}
              onChange={setSelectedRole}
              style={{ width: 180 }}
              placeholder="Filter by Role"
            >
              <Select.Option value="all">All Roles</Select.Option>
              <Select.Option value="Admin">Admin</Select.Option>
              <Select.Option value="User">User</Select.Option>
            </Select>
          </div>
          <UserManagement
            approvedUsers={approvedUsers}
            onRefreshUsers={refreshUsers}
            onEditUser={handleEditUser}
            loading={fetching}
            searchTerm={searchTerm}
            selectedRole={selectedRole}
          />
        </div>
      )
    },
    {
      key: 'organizations',
      label: 'Organizations',
      icon: <TeamOutlined />,
      children: <Organizations hideHeader={true} />
    },
    {
      key: 'pending',
      label: `Pending (${pendingUsers.length})`,
      icon: <ClockCircleOutlined />,
      children: (
        <AdminApprovalPanel
          pendingUsers={pendingUsers}
          onRefreshUsers={refreshUsers}
          loading={fetching}
          searchTerm={searchTerm}
          selectedRole={selectedRole}
        />
      )
    },
    {
      key: 'denied',
      label: `Denied (${deniedUsers.length})`,
      icon: <CloseCircleOutlined />,
      children: (
        <DeniedUsersPanel
          deniedUsers={deniedUsers}
          onRefreshUsers={refreshUsers}
          loading={fetching}
          searchTerm={searchTerm}
          selectedRole={selectedRole}
        />
      )
    },
    {
      key: 'roles',
      label: 'Roles & Permissions',
      icon: <SecurityScanOutlined />,
      children: <RoleManagement hideHeader={true} />
    },
    ...(isSuperuser ? [{
      key: 'global',
      label: 'Global Users (Superusers)',
      icon: <SecurityScanOutlined />,
      children: (
        <UserManagement
          approvedUsers={globalUsers}
          onRefreshUsers={refreshUsers}
          onEditUser={handleEditUser}
          loading={fetchingGlobal}
          searchTerm={searchTerm}
          selectedRole={'all'}
        />
      )
    }] : [])
  ];

  return (
    <div style={{ padding: '8px 16px 24px 16px', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      {/* Page Title */}
      <div style={{ marginBottom: '16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1a1a2e' }}>User Management</h1>
            <p style={{ color: '#8e8ea8', margin: '4px 0 0 0', fontSize: '13px' }}>
              Manage user accounts, roles, and permissions ({users?.length || 0} total users)
            </p>
          </div>
          <BlackButton
            icon={<PlusOutlined />}
            onClick={handleAddUser}
            style={{ height: '40px', padding: '0 20px' }}
          >
            Add User
          </BlackButton>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        flex: 1,
        minHeight: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        display: 'flex'
      }}>
        <VerticalTabs
          items={tabItems}
          defaultActiveKey="users"
          tabWidth={220}
        />
      </div>

      <AddUserForm
        isVisible={isAddUserVisible}
        onClose={() => setIsAddUserVisible(false)}
        onSuccessCallBack={refreshUsers}
        editingUser={editingUser}
        onCloseWithoutEditing={() => setIsAddUserVisible(false)}
      />
    </div>
  );
};

export default User;