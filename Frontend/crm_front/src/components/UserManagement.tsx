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
import { BlackButton, WhiteButton, PageLoader } from './';
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
import FixedTable from './FixedTable';
import { Tooltip } from 'antd';

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

  // Filter users based on search and filters
  const filteredUsers = approvedUsers.filter(user => {
    const matchesSearch = !searchTerm ||
      user.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    return matchesSearch && matchesRole;
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
    onEditUser(user);
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
      onClick: ({ domEvent }) => { domEvent.stopPropagation(); handleEditUser(user); }
    },
    {
      key: 'reset-password',
      label: 'Reset Password',
      icon: <KeyOutlined />,
      onClick: ({ domEvent }) => { domEvent.stopPropagation(); handleResetPassword(user); }
    },
    {
      key: 'toggle-status',
      label: user.is_active ? 'Suspend User' : 'Activate User',
      icon: user.is_active ? <StopOutlined /> : <PlayCircleOutlined />,
      onClick: ({ domEvent }) => { domEvent.stopPropagation(); handleToggleUserStatus(user); }
    },
    {
      type: 'divider'
    },
    {
      key: 'delete',
      label: 'Delete User',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: ({ domEvent }) => { domEvent.stopPropagation(); handleDeleteUser(user); }
    }
  ];

  const columns = [
    {
      id: 'fullname',
      label: 'Full Name',
      width: 200,
      fixed: true,
      render: (value: any, record: UserProps) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 8px' }}>
          <UserOutlined style={{ fontSize: '16px', color: record.is_superuser ? '#f5222d' : '#1890ff' }} />
          <div style={{ fontWeight: 600, color: '#1a1a2e' }}>{record.fullname}</div>
        </div>
      )
    },
    {
      id: 'email',
      label: 'Email',
      width: 250,
      render: (value: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px' }}>
          <MailOutlined style={{ color: '#8e8ea8', fontSize: '12px' }} />
          <span style={{ fontSize: '12px' }}>{value}</span>
        </div>
      )
    },
    {
      id: 'role',
      label: 'Role',
      width: 120,
      render: (value: any) => (
        <Tag color={ROLE_CONFIG[value as keyof typeof ROLE_CONFIG]?.color || 'default'} style={{ margin: 0 }}>
          {ROLE_CONFIG[value as keyof typeof ROLE_CONFIG]?.label || value}
        </Tag>
      )
    },
    {
      id: 'is_active',
      label: 'Status',
      width: 100,
      render: (value: any) => (
        <Tag color={value ? 'green' : 'red'} style={{ margin: 0 }}>
          {value ? 'Active' : 'Inactive'}
        </Tag>
      )
    },
    {
      id: 'created_at',
      label: 'Joined',
      width: 140,
      render: (value: any) => (
        <span style={{ fontSize: '12px', color: '#595959' }}>
          {dayjs(value).format('MMM DD, YYYY')}
        </span>
      )
    },
    {
      id: 'actions',
      label: 'Actions',
      width: 80,
      render: (value: any, record: UserProps) => (
        <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
        </Dropdown>
      )
    }
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      <div style={{ flex: 1, minHeight: 0 }}>
        {loading ? (
          <PageLoader text="Fetching users..." />
        ) : filteredUsers.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <h3 style={{ marginBottom: '16px' }}>No users found</h3>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                {searchTerm || selectedRole !== 'all'
                  ? 'No users match your current filters.'
                  : 'Get started by adding your first user.'}
              </p>
            </div>
          </Card>
        ) : (
          <Card style={{ borderRadius: '12px', overflow: 'hidden', height: 'calc(100vh - 320px)' }} bodyStyle={{ padding: 0, height: '100%' }}>
            <FixedTable
              columns={columns}
              data={filteredUsers}
              tableName="users_management_table"
              onRowClick={(record) => handleEditUser(record)}
            />
          </Card>
        )}
      </div>

      {/* Reset Password Modal */}
      <Modal
        title="Reset User Password"
        open={resetPasswordModal.visible}
        onCancel={cancelResetPassword}
        footer={[
          <WhiteButton key="cancel" onClick={cancelResetPassword}>
            Cancel
          </WhiteButton>,
          <BlackButton
            key="confirm"
            icon={<KeyOutlined />}
            loading={resetLoading}
            onClick={confirmResetPassword}
          >
            Reset Password
          </BlackButton>
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
                    • A secure reset link will be sent to the user's email<br />
                    • The link will expire in 1 hour for security<br />
                    • User will be able to set a new password<br />
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
          <WhiteButton key="cancel" onClick={cancelToggleStatus}>
            Cancel
          </WhiteButton>,
          <BlackButton
            key="confirm"
            icon={suspendModal.user?.is_active ? <StopOutlined /> : <PlayCircleOutlined />}
            loading={suspendLoading}
            onClick={confirmToggleStatus}
            style={{
              backgroundColor: suspendModal.user?.is_active ? '#ff4d4f' : '#52c41a',
              borderColor: suspendModal.user?.is_active ? '#ff4d4f' : '#52c41a'
            }}
          >
            {suspendModal.user?.is_active ? "Suspend User" : "Activate User"}
          </BlackButton>
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
                        • User will not be able to log in<br />
                        • All active sessions will be terminated<br />
                        • Account can be reactivated later<br />
                        • User data will be preserved
                      </>
                    ) : (
                      <>
                        • User will be able to log in again<br />
                        • Full access to system features<br />
                        • All permissions will be restored<br />
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
          <WhiteButton key="cancel" onClick={cancelDeleteUser}>
            Cancel
          </WhiteButton>,
          <BlackButton
            key="confirm"
            icon={<DeleteOutlined />}
            loading={deleteLoading}
            onClick={confirmDeleteUser}
            style={{ backgroundColor: '#ff4d4f', borderColor: '#ff4d4f' }}
          >
            Delete User
          </BlackButton>
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
                    • This action cannot be undone<br />
                    • All user data will be permanently removed<br />
                    • User will lose access immediately<br />
                    • This includes all activity history and records
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>



      {/* Custom Success Modal */}
      <Modal
        title={null}
        open={successModal.visible}
        onCancel={() => setSuccessModal({ visible: false, userName: "" })}
        footer={[
          <BlackButton
            key="close"
            onClick={() => setSuccessModal({ visible: false, userName: "" })}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', minWidth: '100px' }}
          >
            Close
          </BlackButton>
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
            • All user data has been permanently removed<br />
            • The user no longer has access to the system<br />
            • All activity history and records have been deleted<br />
            • This action cannot be undone
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
