import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Button, 
  Space, 
  Tag, 
  Modal, 
  notification, 
  Card,
  Typography,
  Tooltip,
  Popconfirm
} from 'antd';
import { 
  CheckCircleOutlined, 
  DeleteOutlined,
  ExclamationCircleOutlined,
  UserDeleteOutlined,
  UndoOutlined,
  UserOutlined,
  MailOutlined
} from '@ant-design/icons';
import { UserProps, AuthTokenType } from '../utils/types';
import { getAuthToken } from '../utils/functions';
import { UsersUrl } from '../utils/network';
import axios from 'axios';

const { Text } = Typography;

interface DeniedUsersPanelProps {
  deniedUsers: UserProps[];
  onRefreshUsers: () => void;
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

const DeniedUsersPanel: React.FC<DeniedUsersPanelProps> = ({ 
  deniedUsers, 
  onRefreshUsers, 
  loading,
  searchTerm = '',
  selectedRole = 'all'
}) => {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [reapprovalModal, setReapprovalModal] = useState<{
    visible: boolean;
    user: UserProps | null;
    assignedRole: string;
    notes: string;
  }>({
    visible: false,
    user: null,
    assignedRole: '',
    notes: ''
  });

  const handleReapprove = (user: UserProps) => {
    setReapprovalModal({
      visible: true,
      user,
      assignedRole: user.role || 'User',
      notes: ''
    });
  };

  const submitReapproval = async () => {
    if (!reapprovalModal.user) return;

    setProcessing(true);
    try {
      const headers = getAuthToken() as AuthTokenType;
      const response = await axios.put(`${UsersUrl}/${reapprovalModal.user.id}`, {
        ...reapprovalModal.user,
        role: reapprovalModal.assignedRole,
        approved: true,
        is_active: true,
        denial_reason: null, // Clear the denial reason
        approval_notes: reapprovalModal.notes
      }, headers);

      if (response) {
        notification.success({
          message: "User Re-approved",
          description: `${reapprovalModal.user.fullname} has been successfully approved and can now access the system.`,
          title: "User Re-approved"
        });

        setReapprovalModal({ visible: false, user: null, assignedRole: '', notes: '' });
        onRefreshUsers();
      }
    } catch (error) {
      notification.error({
        message: "Re-approval Error",
        description: "Failed to re-approve user. Please try again.",
        title: "Re-approval Error"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteUser = async (user: UserProps) => {
    setProcessing(true);
    try {
      const headers = getAuthToken() as AuthTokenType;
      const response = await axios.delete(`${UsersUrl}/${user.id}`, headers);

      if (response) {
        notification.success({
          message: "User Deleted",
          description: `${user.fullname} has been deleted. They can now submit a new account request.`,
          title: "User Deleted"
        });

        onRefreshUsers();
      }
    } catch (error) {
      notification.error({
        message: "Delete Error",
        description: "Failed to delete user. Please try again.",
        title: "Delete Error"
      });
    } finally {
      setProcessing(false);
    }
  };

  // Filter denied users based on search and role
  const filteredDeniedUsers = deniedUsers.filter(user => {
    const matchesSearch = !searchTerm || 
      user.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    
    return matchesSearch && matchesRole;
  });

  return (
    <>
      {/* Denied Requests Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>
      ) : filteredDeniedUsers.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h3 style={{ marginBottom: '16px' }}>No denied requests</h3>
            <p style={{ color: '#666' }}>
              {searchTerm || selectedRole !== 'all'
                ? 'No denied requests match your current filters.'
                : 'There are no denied requests at this time.'}
            </p>
          </div>
        </Card>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
          gap: '24px' 
        }}>
          {filteredDeniedUsers.map((user) => (
            <Card
              key={user.id}
              style={{ 
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
                borderLeft: '4px solid #ff4d4f'
              }}
              hoverable
              actions={[
                <Button
                  key="reapprove"
                  type="primary"
                  size="small"
                  icon={<UndoOutlined />}
                  onClick={() => handleReapprove(user)}
                  disabled={loading || processing}
                >
                  Re-approve
                </Button>,
                <Button
                  key="delete"
                  size="small"
                  icon={<UserDeleteOutlined />}
                  onClick={() => handleDeleteUser(user)}
                  disabled={loading || processing}
                  danger
                >
                  Delete
                </Button>
              ]}
            >
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <UserOutlined style={{ fontSize: '20px', color: '#ff4d4f' }} />
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                    {user.fullname}
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Tag color={ROLE_CONFIG[user.role as keyof typeof ROLE_CONFIG]?.color || 'default'}>
                    {ROLE_CONFIG[user.role as keyof typeof ROLE_CONFIG]?.label || user.role}
                  </Tag>
                  <Tag color="red">
                    Denied
                  </Tag>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MailOutlined style={{ color: '#666' }} />
                  <span style={{ fontSize: '14px', color: '#333' }}>{user.email}</span>
                </div>

                {user.denial_reason && (
                  <div style={{ 
                    marginTop: '8px', 
                    padding: '12px', 
                    backgroundColor: '#fff1f0', 
                    borderRadius: '8px',
                    border: '1px solid #ffccc7'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#cf1322', marginBottom: '4px' }}>
                      Denial Reason:
                    </div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      {user.denial_reason}
                    </div>
                  </div>
                )}

                <div style={{ 
                  marginTop: '8px', 
                  paddingTop: '12px', 
                  borderTop: '1px solid #f0f0f0',
                  fontSize: '12px',
                  color: '#999'
                }}>
                  Requested: {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Re-approval Modal */}
      <Modal
        title="Re-approve User Request"
        open={reapprovalModal.visible}
        onCancel={() => setReapprovalModal({ visible: false, user: null, assignedRole: '', notes: '' })}
        footer={[
          <Button key="cancel" onClick={() => setReapprovalModal({ visible: false, user: null, assignedRole: '', notes: '' })}>
            Cancel
          </Button>,
          <Button 
            key="approve" 
            type="primary" 
            icon={<CheckCircleOutlined />}
            loading={processing}
            onClick={submitReapproval}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          >
            Re-approve User
          </Button>
        ]}
      >
        {reapprovalModal.user && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ 
              padding: 16, 
              backgroundColor: '#f5f5f5', 
              borderRadius: 6, 
              marginBottom: 16 
            }}>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>
                {reapprovalModal.user.fullname}
              </div>
              <div style={{ color: '#8c8c8c', marginBottom: 8 }}>
                {reapprovalModal.user.email}
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text strong>Previous Denial Reason:</Text>
                <div style={{ 
                  marginTop: 4, 
                  padding: 8, 
                  backgroundColor: '#fff2f0', 
                  borderRadius: 4,
                  border: '1px solid #ffccc7'
                }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {reapprovalModal.user.denial_reason || 'No reason provided'}
                  </Text>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Assign Role
              </label>
              <select
                value={reapprovalModal.assignedRole}
                onChange={(e) => setReapprovalModal(prev => ({ ...prev, assignedRole: e.target.value }))}
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  border: '1px solid #d9d9d9', 
                  borderRadius: 6,
                  fontSize: '14px'
                }}
              >
                {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label} - {config.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Approval Notes (Optional)
              </label>
              <textarea
                value={reapprovalModal.notes}
                onChange={(e) => setReapprovalModal(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any notes about this re-approval..."
                style={{ 
                  width: '100%', 
                  minHeight: 80, 
                  padding: '8px 12px', 
                  border: '1px solid #d9d9d9', 
                  borderRadius: 6,
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default DeniedUsersPanel;
