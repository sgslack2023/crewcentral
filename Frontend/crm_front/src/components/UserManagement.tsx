import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Button, 
  Modal, 
  notification, 
  Tag, 
  Card, 
  Input,
  Select,
  Space,
  Typography,
  Dropdown,
  MenuProps,
  App
} from 'antd';
import { 
  UserOutlined,
  MailOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  SearchOutlined,
  FilterOutlined,
  KeyOutlined,
  StopOutlined,
  PlayCircleOutlined,
  CalendarOutlined,
  HomeOutlined
} from '@ant-design/icons';
import { UserProps, AuthTokenType } from '../utils/types';
import { getAuthToken } from '../utils/functions';
import { UsersUrl, ForgotPasswordUrl } from '../utils/network';
import axios from 'axios';
import dayjs from 'dayjs';

const { Search } = Input;
const { Title, Text } = Typography;

interface UserManagementProps {
  approvedUsers: UserProps[];
  onRefreshUsers: () => void;
  onEditUser: (user: UserProps) => void;
  loading: boolean;
  searchTerm?: string;
  selectedRole?: string;
}

const ROLE_CONFIG = {
  Admin: {
    label: "Admin",
    description: "Full system administration access",
    color: "red"
  },
  User: {
    label: "User",
    description: "Standard user access with basic operations",
    color: "blue"
  }
};

export const UserManagement: React.FC<UserManagementProps> = ({
  approvedUsers,
  onRefreshUsers,
  onEditUser,
  loading,
  searchTerm = '',
  selectedRole = 'all'
}) => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [resetPasswordModal, setResetPasswordModal] = useState<{
    visible: boolean;
    user: UserProps | null;
  }>({
    visible: false,
    user: null
  });
  const [resetLoading, setResetLoading] = useState(false);
  
  const [suspendModal, setSuspendModal] = useState<{
    visible: boolean;
    user: UserProps | null;
  }>({
    visible: false,
    user: null
  });
  const [suspendLoading, setSuspendLoading] = useState(false);
  
  const [deleteModal, setDeleteModal] = useState<{
    visible: boolean;
    user: UserProps | null;
  }>({
    visible: false,
    user: null
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const [successModal, setSuccessModal] = useState<{
    visible: boolean;
    userName: string;
  }>({
    visible: false,
    userName: ""
  });

  const [editModal, setEditModal] = useState<{
    visible: boolean;
    user: UserProps | null;
    newRole: string;
    newStatus: boolean;
    newFullname: string;
    newEmail: string;
  }>({
    visible: false,
    user: null,
    newRole: "",
    newStatus: true,
    newFullname: "",
    newEmail: ""
  });
  const [editLoading, setEditLoading] = useState(false);

  // Filter users based on search and filters
  const filteredUsers = approvedUsers.filter(user => {
    const matchesSearch = !searchTerm || 
      user.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && user.is_active) ||
      (statusFilter === "inactive" && !user.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Summary stats
  const activeUsers = approvedUsers.filter(u => u.is_active).length;
  const inactiveUsers = approvedUsers.filter(u => !u.is_active).length;

  const roleStats = {
    Admin: approvedUsers.filter(u => u.role === "Admin" && u.is_active).length,
    User: approvedUsers.filter(u => u.role === "User" && u.is_active).length,
  };

  const handleDeleteUser = (user: UserProps) => {
    setDeleteModal({
      visible: true,
      user: user
    });
  };

  const confirmDeleteUser = async () => {
    if (!deleteModal.user) return;

    const userName = deleteModal.user.fullname;
    setDeleteLoading(true);
    
    try {
      const headers = getAuthToken() as AuthTokenType;
      const response = await axios.delete(`${UsersUrl}/${deleteModal.user.id}`, headers);

      // Close the delete modal
      setDeleteModal({ visible: false, user: null });
      
      // Refresh the users list immediately
      onRefreshUsers();
      
      // Show custom success modal
      setSuccessModal({
        visible: true,
        userName: userName
      });
      
    } catch (error: any) {
      notification.error({
        message: "Delete Error",
        description: error.response?.data?.error || "Failed to delete user account.",
        duration: 4.5,
        placement: 'topRight',
        title: "Delete Error"
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelDeleteUser = () => {
    setDeleteModal({ visible: false, user: null });
  };

  const handleEditUser = (user: UserProps) => {
    setEditModal({
      visible: true,
      user: user,
      newRole: user.role,
      newStatus: user.is_active,
      newFullname: user.fullname || "",
      newEmail: user.email || ""
    });
  };

  const confirmEditUser = async () => {
    if (!editModal.user) return;

    setEditLoading(true);
    try {
      const headers = getAuthToken() as AuthTokenType;
      const updateData = {
        ...editModal.user,
        role: editModal.newRole,
        is_active: editModal.newStatus,
        fullname: editModal.newFullname,
        email: editModal.newEmail
      };

      const response = await axios.put(`${UsersUrl}/${editModal.user.id}`, updateData, headers);

      // Close the edit modal
      setEditModal({ 
        visible: false, 
        user: null, 
        newRole: "", 
        newStatus: true, 
        newFullname: "", 
        newEmail: "" 
      });
      
      // Show success notification
      notification.success({
        message: "User Updated Successfully",
        description: `Changes to ${editModal.newFullname}'s account have been saved.`,
        duration: 3,
        placement: 'topRight',
        title: "User Updated Successfully"
      });

      // Refresh the users list
      onRefreshUsers();
      
    } catch (error: any) {
      notification.error({
        message: "Update Error",
        description: error.response?.data?.error || "Failed to update user account.",
        duration: 4.5,
        placement: 'topRight',
        title: "Update Error"
      });
    } finally {
      setEditLoading(false);
    }
  };

  const cancelEditUser = () => {
    setEditModal({ 
      visible: false, 
      user: null, 
      newRole: "", 
      newStatus: true, 
      newFullname: "", 
      newEmail: "" 
    });
  };

  const handleToggleUserStatus = (user: UserProps) => {
    setSuspendModal({
      visible: true,
      user: user
    });
  };

  const confirmToggleStatus = async () => {
    if (!suspendModal.user) return;

    const action = suspendModal.user.is_active ? "suspend" : "activate";
    const actionTitle = suspendModal.user.is_active ? "Suspend" : "Activate";

    setSuspendLoading(true);
    try {
      const headers = getAuthToken() as AuthTokenType;
      const response = await axios.put(`${UsersUrl}/${suspendModal.user.id}`, {
        ...suspendModal.user,
        is_active: !suspendModal.user.is_active
      }, headers);

      notification.success({
        message: `User ${actionTitle}d`,
        description: `Account for ${suspendModal.user.fullname} has been ${action}d successfully.`,
        title: `User ${actionTitle}d`
      });

      setSuspendModal({ visible: false, user: null });
      onRefreshUsers();
    } catch (error: any) {
      notification.error({
        message: `${actionTitle} Error`,
        description: error.response?.data?.error || `Failed to ${action} user account.`,
        title: `${actionTitle} Error`
      });
    } finally {
      setSuspendLoading(false);
    }
  };

  const cancelToggleStatus = () => {
    setSuspendModal({ visible: false, user: null });
  };

  const handleResetPassword = (user: UserProps) => {
    setResetPasswordModal({
      visible: true,
      user: user
    });
  };

  const confirmResetPassword = async () => {
    if (!resetPasswordModal.user) return;

    setResetLoading(true);
    try {
      const response = await axios.post(ForgotPasswordUrl, { 
        email: resetPasswordModal.user.email 
      });

      notification.success({
        message: "Password Reset Email Sent",
        description: `A password reset email has been sent to ${resetPasswordModal.user.fullname} (${resetPasswordModal.user.email}).`,
        title: "Password Reset Email Sent"
      });

      setResetPasswordModal({ visible: false, user: null });
    } catch (error: any) {
      notification.error({
        message: "Reset Error",
        description: error.response?.data?.error || "Failed to send password reset email.",
        title: "Reset Error"
      });
    } finally {
      setResetLoading(false);
    }
  };

  const cancelResetPassword = () => {
    setResetPasswordModal({ visible: false, user: null });
  };

  const getActionMenuItems = (user: UserProps): MenuProps['items'] => [
    {
      key: 'edit',
      label: 'Edit User',
      icon: <EditOutlined />,
      onClick: () => handleEditUser(user)
    },
    {
      key: 'reset-password',
      label: 'Reset Password',
      icon: <KeyOutlined />,
      onClick: () => handleResetPassword(user)
    },
    {
      key: 'toggle-status',
      label: user.is_active ? 'Suspend User' : 'Activate User',
      icon: user.is_active ? <StopOutlined /> : <PlayCircleOutlined />,
      onClick: () => handleToggleUserStatus(user)
    },
    {
      type: 'divider'
    },
    {
      key: 'delete',
      label: 'Delete User',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => handleDeleteUser(user)
    }
  ];

  return (
    <div>
      {/* Users Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h3 style={{ marginBottom: '16px' }}>No users found</h3>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              {searchTerm || selectedRole !== 'all' || statusFilter !== 'all'
                ? 'No users match your current filters.'
                : 'Get started by adding your first user.'}
            </p>
          </div>
        </Card>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
          gap: '24px' 
        }}>
          {filteredUsers.map((user) => (
            <Card
              key={user.id}
              style={{ 
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease'
              }}
              hoverable
              actions={[
                <EditOutlined 
                  key="edit" 
                  style={{ fontSize: '16px' }}
                  onClick={() => handleEditUser(user)}
                />,
                <KeyOutlined 
                  key="reset" 
                  style={{ fontSize: '16px', color: '#faad14' }}
                  onClick={() => handleResetPassword(user)}
                />,
                user.is_active ? (
                  <StopOutlined 
                    key="suspend" 
                    style={{ fontSize: '16px', color: '#ff4d4f' }}
                    onClick={() => handleToggleUserStatus(user)}
                  />
                ) : (
                  <PlayCircleOutlined 
                    key="activate" 
                    style={{ fontSize: '16px', color: '#52c41a' }}
                    onClick={() => handleToggleUserStatus(user)}
                  />
                ),
                <DeleteOutlined 
                  key="delete" 
                  style={{ fontSize: '16px', color: '#ff4d4f' }}
                  onClick={() => handleDeleteUser(user)}
                />
              ]}
            >
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <UserOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                    {user.fullname}
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Tag color={ROLE_CONFIG[user.role as keyof typeof ROLE_CONFIG]?.color || 'default'}>
                    {ROLE_CONFIG[user.role as keyof typeof ROLE_CONFIG]?.label || user.role}
                  </Tag>
                  <Tag color={user.is_active ? 'green' : 'red'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Tag>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MailOutlined style={{ color: '#666' }} />
                  <span style={{ fontSize: '14px', color: '#333' }}>{user.email}</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarOutlined style={{ color: '#666' }} />
                  <span style={{ fontSize: '14px', color: '#333' }}>
                    Joined: {dayjs(user.created_at).format('MMM DD, YYYY')}
                  </span>
                </div>

                {user.last_login && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CalendarOutlined style={{ color: '#666' }} />
                    <span style={{ fontSize: '14px', color: '#333' }}>
                      Last Login: {dayjs(user.last_login).format('MMM DD, YYYY HH:mm')}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reset Password Modal */}
      <Modal
        title="Reset User Password"
        open={resetPasswordModal.visible}
        onCancel={cancelResetPassword}
        footer={[
          <Button key="cancel" onClick={cancelResetPassword}>
            Cancel
          </Button>,
          <Button 
            key="confirm" 
            type="primary" 
            icon={<KeyOutlined />}
            loading={resetLoading}
            onClick={confirmResetPassword}
            style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
          >
            Send Reset Email
          </Button>
        ]}
      >
        {resetPasswordModal.user && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ 
              padding: 16, 
              backgroundColor: '#f5f5f5', 
              borderRadius: 6, 
              marginBottom: 16 
            }}>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>
                <UserOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                {resetPasswordModal.user.fullname}
              </div>
              <div style={{ color: '#8c8c8c', marginBottom: 8 }}>
                <MailOutlined style={{ marginRight: 4 }} />
                {resetPasswordModal.user.email}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '14px' }}>Role:</span>
                <Tag color={ROLE_CONFIG[resetPasswordModal.user.role as keyof typeof ROLE_CONFIG]?.color}>
                  {ROLE_CONFIG[resetPasswordModal.user.role as keyof typeof ROLE_CONFIG]?.label}
                </Tag>
              </div>
            </div>

            <div style={{ 
              padding: 16, 
              backgroundColor: '#e6f7ff', 
              borderRadius: 6,
              border: '1px solid #91d5ff'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <KeyOutlined style={{ color: '#1890ff', marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 4, color: '#1890ff' }}>
                    Password Reset Process
                  </div>
                  <div style={{ fontSize: '14px', color: '#595959', lineHeight: '1.5' }}>
                    • A secure reset link will be sent to the user's email<br/>
                    • The link will expire in 1 hour for security<br/>
                    • User will be able to set a new password<br/>
                    • Current password will remain active until reset
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Suspend/Activate User Modal */}
      <Modal
        title={suspendModal.user?.is_active ? "Suspend User Account" : "Activate User Account"}
        open={suspendModal.visible}
        onCancel={cancelToggleStatus}
        footer={[
          <Button key="cancel" onClick={cancelToggleStatus}>
            Cancel
          </Button>,
          <Button 
            key="confirm" 
            type="primary" 
            icon={suspendModal.user?.is_active ? <StopOutlined /> : <PlayCircleOutlined />}
            loading={suspendLoading}
            onClick={confirmToggleStatus}
            style={{ 
              backgroundColor: suspendModal.user?.is_active ? '#ff4d4f' : '#52c41a', 
              borderColor: suspendModal.user?.is_active ? '#ff4d4f' : '#52c41a' 
            }}
            danger={suspendModal.user?.is_active}
          >
            {suspendModal.user?.is_active ? "Suspend User" : "Activate User"}
          </Button>
        ]}
      >
        {suspendModal.user && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ 
              padding: 16, 
              backgroundColor: '#f5f5f5', 
              borderRadius: 6, 
              marginBottom: 16 
            }}>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>
                <UserOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                {suspendModal.user.fullname}
              </div>
              <div style={{ color: '#8c8c8c', marginBottom: 8 }}>
                <MailOutlined style={{ marginRight: 4 }} />
                {suspendModal.user.email}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: '14px' }}>Role:</span>
                <Tag color={ROLE_CONFIG[suspendModal.user.role as keyof typeof ROLE_CONFIG]?.color}>
                  {ROLE_CONFIG[suspendModal.user.role as keyof typeof ROLE_CONFIG]?.label}
                </Tag>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '14px' }}>Current Status:</span>
                <Tag color={suspendModal.user.is_active ? 'green' : 'red'}>
                  {suspendModal.user.is_active ? 'Active' : 'Inactive'}
                </Tag>
              </div>
            </div>

            <div style={{ 
              padding: 16, 
              backgroundColor: suspendModal.user.is_active ? '#fff2f0' : '#f6ffed', 
              borderRadius: 6,
              border: suspendModal.user.is_active ? '1px solid #ffccc7' : '1px solid #b7eb8f'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                {suspendModal.user.is_active ? 
                  <StopOutlined style={{ color: '#ff4d4f', marginTop: 2 }} /> :
                  <PlayCircleOutlined style={{ color: '#52c41a', marginTop: 2 }} />
                }
                <div>
                  <div style={{ 
                    fontWeight: 500, 
                    marginBottom: 4, 
                    color: suspendModal.user.is_active ? '#ff4d4f' : '#52c41a' 
                  }}>
                    {suspendModal.user.is_active ? 'Suspend Account' : 'Activate Account'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#595959', lineHeight: '1.5' }}>
                    {suspendModal.user.is_active ? (
                      <>
                        • User will not be able to log in<br/>
                        • All active sessions will be terminated<br/>
                        • Account can be reactivated later<br/>
                        • User data will be preserved
                      </>
                    ) : (
                      <>
                        • User will be able to log in again<br/>
                        • Full access to system features<br/>
                        • All permissions will be restored<br/>
                        • Account will be fully functional
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete User Modal */}
      <Modal
        title="Delete User Account"
        open={deleteModal.visible}
        onCancel={cancelDeleteUser}
        footer={[
          <Button key="cancel" onClick={cancelDeleteUser}>
            Cancel
          </Button>,
          <Button 
            key="delete" 
            type="primary" 
            icon={<DeleteOutlined />}
            loading={deleteLoading}
            onClick={confirmDeleteUser}
            danger
          >
            Delete User
          </Button>
        ]}
      >
        {deleteModal.user && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ 
              padding: 16, 
              backgroundColor: '#f5f5f5', 
              borderRadius: 6, 
              marginBottom: 16 
            }}>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>
                <UserOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                {deleteModal.user.fullname}
              </div>
              <div style={{ color: '#8c8c8c', marginBottom: 8 }}>
                <MailOutlined style={{ marginRight: 4 }} />
                {deleteModal.user.email}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: '14px' }}>Role:</span>
                <Tag color={ROLE_CONFIG[deleteModal.user.role as keyof typeof ROLE_CONFIG]?.color}>
                  {ROLE_CONFIG[deleteModal.user.role as keyof typeof ROLE_CONFIG]?.label}
                </Tag>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '14px' }}>Status:</span>
                <Tag color={deleteModal.user.is_active ? 'green' : 'red'}>
                  {deleteModal.user.is_active ? 'Active' : 'Inactive'}
                </Tag>
              </div>
            </div>

            <div style={{ 
              padding: 16, 
              backgroundColor: '#fff2f0', 
              borderRadius: 6,
              border: '1px solid #ffccc7'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <DeleteOutlined style={{ color: '#ff4d4f', marginTop: 2 }} />
                <div>
                  <div style={{ 
                    fontWeight: 500, 
                    marginBottom: 4, 
                    color: '#ff4d4f' 
                  }}>
                    Permanent Deletion Warning
                  </div>
                  <div style={{ fontSize: '14px', color: '#595959', lineHeight: '1.5' }}>
                    • This action cannot be undone<br/>
                    • All user data will be permanently removed<br/>
                    • User will lose access immediately<br/>
                    • This includes all activity history and records
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit User Modal */}
      <Modal
        title="Edit User Account"
        open={editModal.visible}
        onCancel={cancelEditUser}
        footer={[
          <Button key="cancel" onClick={cancelEditUser}>
            Cancel
          </Button>,
          <Button 
            key="save" 
            type="primary" 
            icon={<EditOutlined />}
            loading={editLoading}
            onClick={confirmEditUser}
            style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
          >
            Save Changes
          </Button>
        ]}
        width={650}
        style={{ top: 20 }}
        bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
      >
        {editModal.user && (
          <div style={{ marginBottom: 16 }}>
            {/* User Info Header */}
            <div style={{ 
              padding: 16, 
              backgroundColor: '#f5f5f5', 
              borderRadius: 6, 
              marginBottom: 24 
            }}>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>
                <UserOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                Editing User Account
              </div>
              <div style={{ color: '#8c8c8c', fontSize: '12px' }}>
                Make changes to user details, role, and account status
              </div>
            </div>

            {/* Edit Form */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {/* Full Name */}
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '14px' }}>
                  Full Name
                </label>
                <Input
                  value={editModal.newFullname}
                  onChange={(e) => setEditModal({ ...editModal, newFullname: e.target.value })}
                  placeholder="Enter full name"
                  prefix={<UserOutlined />}
                  size="middle"
                />
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '14px' }}>
                  Email Address
                </label>
                <Input
                  value={editModal.newEmail}
                  onChange={(e) => setEditModal({ ...editModal, newEmail: e.target.value })}
                  placeholder="Enter email address"
                  prefix={<MailOutlined />}
                  type="email"
                  size="middle"
                />
              </div>

              {/* Role */}
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '14px' }}>
                  User Role
                </label>
                <Select
                  value={editModal.newRole}
                  onChange={(value) => setEditModal({ ...editModal, newRole: value })}
                  style={{ width: '100%' }}
                  placeholder="Select role"
                  size="middle"
                >
                  {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                    <Select.Option key={role} value={role}>
                      <Tag color={config.color} style={{ marginRight: 6, fontSize: '11px' }}>
                        {config.label}
                      </Tag>
                    </Select.Option>
                  ))}
                </Select>
              </div>

              {/* Status */}
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '14px' }}>
                  Account Status
                </label>
                <Select
                  value={editModal.newStatus}
                  onChange={(value) => setEditModal({ ...editModal, newStatus: value })}
                  style={{ width: '100%' }}
                  placeholder="Select status"
                  size="middle"
                >
                  <Select.Option value={true}>
                    <Tag color="green" style={{ marginRight: 6, fontSize: '11px' }}>Active</Tag>
                    <span style={{ fontSize: '12px' }}>User can access the system</span>
                  </Select.Option>
                  <Select.Option value={false}>
                    <Tag color="red" style={{ marginRight: 6, fontSize: '11px' }}>Inactive</Tag>
                    <span style={{ fontSize: '12px' }}>User cannot access the system</span>
                  </Select.Option>
                </Select>
              </div>
            </div>

            {/* Role Description - Compact */}
            {editModal.newRole && ROLE_CONFIG[editModal.newRole as keyof typeof ROLE_CONFIG] && (
              <div style={{ 
                padding: 10, 
                backgroundColor: '#f0f9ff', 
                borderRadius: 4,
                border: '1px solid #bae6fd',
                fontSize: '12px'
              }}>
                <span style={{ fontWeight: 500, color: '#0284c7' }}>
                  {ROLE_CONFIG[editModal.newRole as keyof typeof ROLE_CONFIG].label}:
                </span>
                <span style={{ color: '#64748b', marginLeft: 6 }}>
                  {ROLE_CONFIG[editModal.newRole as keyof typeof ROLE_CONFIG].description}
                </span>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Custom Success Modal */}
      <Modal
        title={null}
        open={successModal.visible}
        onCancel={() => setSuccessModal({ visible: false, userName: "" })}
        footer={[
          <Button 
            key="close" 
            type="primary" 
            onClick={() => setSuccessModal({ visible: false, userName: "" })}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', minWidth: '100px' }}
          >
            Close
          </Button>
        ]}
        centered
        width={480}
        closable={false}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          {/* Success Icon */}
          <div style={{ 
            width: '60px', 
            height: '60px', 
            backgroundColor: '#f6ffed', 
            border: '2px solid #52c41a',
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 16px auto'
          }}>
            <div style={{ 
              color: '#52c41a', 
              fontSize: '28px', 
              fontWeight: 'bold' 
            }}>
              ✓
            </div>
          </div>
          
          {/* Success Title */}
          <div style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            color: '#262626', 
            marginBottom: '12px' 
          }}>
            User Deleted Successfully
          </div>
          
          {/* Success Message */}
          <div style={{ 
            fontSize: '14px', 
            color: '#595959', 
            marginBottom: '16px',
            lineHeight: '1.5'
          }}>
            The user account for <strong>{successModal.userName}</strong> has been permanently deleted from the system.
          </div>
          
          {/* Additional Info */}
          <div style={{ 
            padding: '12px 16px', 
            backgroundColor: '#f6ffed', 
            borderRadius: '6px',
            border: '1px solid #b7eb8f',
            fontSize: '12px',
            color: '#595959',
            textAlign: 'left'
          }}>
            <div style={{ fontWeight: '500', marginBottom: '4px', color: '#52c41a' }}>
              What happened:
            </div>
            • All user data has been permanently removed<br/>
            • The user no longer has access to the system<br/>
            • All activity history and records have been deleted<br/>
            • This action cannot be undone
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
