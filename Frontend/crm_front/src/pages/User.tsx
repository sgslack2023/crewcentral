import React, { FC, useState } from "react";
import { Tabs, TabsProps, Card, Button, Space, Input, Select } from "antd";
import { UserOutlined, ClockCircleOutlined, CloseCircleOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useGetUsers } from "../utils/hooks";
import { UserProps } from "../utils/types";
import { getUsers } from "../utils/functions";
import { fullname, role, email } from "../utils/data";
import AdminApprovalPanel from "../components/AdminApprovalPanel";
import UserManagement from "../components/UserManagement";
import DeniedUsersPanel from "../components/DeniedUsersPanel";
import Header from "../components/Header";
import { useNavigate } from 'react-router-dom';

const { Option } = Select;

interface UserPageProps {
  initialTab?: 'approved' | 'pending' | 'denied';
}

const User: FC<UserPageProps> = ({ initialTab }) => {
  const navigate = useNavigate();
  const [fetching, setFetching] = useState(true);
  const [users, setUsers] = useState<UserProps[] | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  
  // Get current user info from localStorage
  const currentUser = {
    role: localStorage.getItem(role) || 'user',
    fullname: localStorage.getItem(fullname) || 'User',
    email: localStorage.getItem(email) || ''
  };
  
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

  useGetUsers(setUsers, setFetching);

  const refreshUsers = () => {
    getUsers(setUsers, setFetching);
  };

  // Separate users by approval status
  const pendingUsers = users?.filter(user => !user.approved && !user.denial_reason) || [];
  const approvedUsers = users?.filter(user => user.approved) || [];
  const deniedUsers = users?.filter(user => !user.approved && user.denial_reason) || [];

  const tabItems: TabsProps['items'] = [
    {
      key: 'approved',
      label: (
        <span>
          <UserOutlined />
          User Management ({approvedUsers.length})
        </span>
      ),
      children: (
        <UserManagement
          approvedUsers={approvedUsers}
          onRefreshUsers={refreshUsers}
          onEditUser={() => {}} // No-op since editing is handled within UserManagement
          loading={fetching}
          searchTerm={searchTerm}
          selectedRole={selectedRole}
        />
      )
    },
    {
      key: 'pending',
      label: (
        <span>
          <ClockCircleOutlined />
          Pending Approvals ({pendingUsers.length})
        </span>
      ),
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
      label: (
        <span>
          <CloseCircleOutlined />
          Denied Requests ({deniedUsers.length})
        </span>
      ),
      children: (
        <DeniedUsersPanel
          deniedUsers={deniedUsers}
          onRefreshUsers={refreshUsers}
          loading={fetching}
          searchTerm={searchTerm}
          selectedRole={selectedRole}
        />
      )
    }
  ];

  return (
    <div>
      {/* Header */}
      <Header currentUser={currentUser} />
      
      <div style={{ padding: '24px' }}>
        {/* Page Title */}
        <div style={{ marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 500, margin: 0, marginBottom: '8px' }}>User Management</h1>
            <p style={{ color: '#666', margin: 0 }}>
              Manage user accounts, roles, and permissions ({users?.length || 0} total users)
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Input
            placeholder="Search by name or email..."
            prefix={<SearchOutlined />}
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
            <Option value="all">All Roles</Option>
            <Option value="Admin">Admin</Option>
            <Option value="User">User</Option>
          </Select>
        </div>

      {/* Main Content */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'approved' | 'pending' | 'denied')}
          items={tabItems}
          size="large"
          tabBarStyle={{ marginBottom: 16 }}
          tabBarExtraContent={
            <div style={{ 
              backgroundColor: '#1890ff', 
              color: 'white', 
              padding: '4px 12px', 
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: 600
            }}>
              {users?.length || 0} Total
            </div>
          }
        />
      </Card>
      </div>
    </div>
  );
};

export default User;