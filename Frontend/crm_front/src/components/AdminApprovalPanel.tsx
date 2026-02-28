import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Modal,
  notification,
  Tag,
  Card,
  Alert,
  Select,
  Input,
  Space,
  Typography
} from 'antd';
import { BlackButton, WhiteButton } from './';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { UserProps, AuthTokenType } from '../utils/types';
import { getAuthToken } from '../utils/functions';
import { UsersUrl } from '../utils/network';
import axios from 'axios';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface AdminApprovalPanelProps {
  pendingUsers: UserProps[];
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

const AdminApprovalPanel: React.FC<AdminApprovalPanelProps> = ({
  pendingUsers,
  onRefreshUsers,
  loading,
  searchTerm = '',
  selectedRole = 'all'
}) => {
  const navigate = useNavigate();
  const [approvalModal, setApprovalModal] = useState<{
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

  const [denyModal, setDenyModal] = useState<{
    visible: boolean;
    user: UserProps | null;
    reason: string;
  }>({
    visible: false,
    user: null,
    reason: ''
  });

  const [processing, setProcessing] = useState(false);

  const handleApprove = (user: UserProps) => {
    setApprovalModal({
      visible: true,
      user,
      assignedRole: user.role || 'User',
      notes: ''
    });
  };

  const handleDeny = (user: UserProps) => {
    setDenyModal({
      visible: true,
      user,
      reason: ''
    });
  };

  const submitApproval = async () => {
    if (!approvalModal.user) return;

    setProcessing(true);
    try {
      const headers = getAuthToken() as AuthTokenType;
      const response = await axios.put(`${UsersUrl}/${approvalModal.user.id}`, {
        ...approvalModal.user,
        approved: true,
        is_active: true,
        role: approvalModal.assignedRole,
        approval_notes: approvalModal.notes
      }, headers);

      if (response) {
        notification.success({
          message: "User Approved",
          description: `Account for ${approvalModal.user.fullname} has been approved successfully.`,
          title: "User Approved"
        });

        setApprovalModal({ visible: false, user: null, assignedRole: '', notes: '' });
        onRefreshUsers();
      }
    } catch (error) {
      notification.error({
        message: "Approval Error",
        description: "Failed to approve user account.",
        title: "Approval Error"
      });
    } finally {
      setProcessing(false);
    }
  };

  const submitDeny = async () => {
    if (!denyModal.user || !denyModal.reason.trim()) return;

    setProcessing(true);
    try {
      const headers = getAuthToken() as AuthTokenType;
      const response = await axios.put(`${UsersUrl}/${denyModal.user.id}`, {
        ...denyModal.user,
        approved: false,
        is_active: false,
        denial_reason: denyModal.reason
      }, headers);

      if (response) {
        notification.success({
          message: "User Request Denied",
          description: `Request from ${denyModal.user.fullname} has been denied.`,
          title: "User Request Denied"
        });

        setDenyModal({ visible: false, user: null, reason: '' });
        onRefreshUsers();
      }
    } catch (error) {
      notification.error({
        message: "Denial Error",
        description: "Failed to deny user request.",
        title: "Denial Error"
      });
    } finally {
      setProcessing(false);
    }
  };

  // Filter pending users based on search and role
  const filteredPendingUsers = pendingUsers.filter(user => {
    const matchesSearch = !searchTerm ||
      user.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = selectedRole === "all" || user.role === selectedRole;

    return matchesSearch && matchesRole;
  });

  return (
    <div>
      {/* Pending Requests Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>
      ) : filteredPendingUsers.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h3 style={{ marginBottom: '16px' }}>No pending requests</h3>
            <p style={{ color: '#666' }}>
              {searchTerm || selectedRole !== 'all'
                ? 'No pending requests match your current filters.'
                : 'There are no pending approval requests at this time.'}
            </p>
          </div>
        </Card>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '24px'
        }}>
          {filteredPendingUsers.map((user) => (
            <Card
              key={user.id}
              style={{
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
                borderLeft: '4px solid #faad14'
              }}
              hoverable
              actions={[
                <BlackButton
                  key="approve"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleApprove(user)}
                  disabled={loading}
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                >
                  Approve
                </BlackButton>,
                <WhiteButton
                  key="deny"
                  size="small"
                  icon={<CloseCircleOutlined />}
                  onClick={() => handleDeny(user)}
                  disabled={loading}
                  danger
                >
                  Deny
                </WhiteButton>
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
                  <Tag color="orange" icon={<ClockCircleOutlined />}>
                    Pending Approval
                  </Tag>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MailOutlined style={{ color: '#666' }} />
                  <span style={{ fontSize: '14px', color: '#333' }}>{user.email}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClockCircleOutlined style={{ color: '#666' }} />
                  <span style={{ fontSize: '14px', color: '#333' }}>
                    Requested: {dayjs(user.created_at).format('MMM DD, YYYY')}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Approval Modal */}
      <Modal
        title="Approve User Request"
        open={approvalModal.visible}
        onCancel={() => setApprovalModal({ visible: false, user: null, assignedRole: '', notes: '' })}
        footer={[
          <WhiteButton key="cancel" onClick={() => setApprovalModal({ visible: false, user: null, assignedRole: '', notes: '' })}>
            Cancel
          </WhiteButton>,
          <BlackButton
            key="approve"
            icon={<CheckCircleOutlined />}
            loading={processing}
            onClick={submitApproval}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          >
            Approve User
          </BlackButton>
        ]}
      >
        {approvalModal.user && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              padding: 16,
              backgroundColor: '#f5f5f5',
              borderRadius: 6,
              marginBottom: 16
            }}>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>
                {approvalModal.user.fullname}
              </div>
              <div style={{ color: '#8c8c8c', marginBottom: 8 }}>
                {approvalModal.user.email}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '14px' }}>Requested Role:</span>
                <Tag color={ROLE_CONFIG[approvalModal.user.role as keyof typeof ROLE_CONFIG]?.color}>
                  {ROLE_CONFIG[approvalModal.user.role as keyof typeof ROLE_CONFIG]?.label}
                </Tag>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Assign Role
              </label>
              <Select
                style={{ width: '100%' }}
                value={approvalModal.assignedRole}
                onChange={(value) => setApprovalModal(prev => ({ ...prev, assignedRole: value }))}
              >
                {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                  <Select.Option key={key} value={key}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Tag color={config.color}>{config.label}</Tag>
                      <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        {config.description}
                      </span>
                    </div>
                  </Select.Option>
                ))}
              </Select>

              {approvalModal.assignedRole !== approvalModal.user.role && (
                <Alert
                  message="You are assigning a different role than requested. The user will be notified."
                  type="info"
                  style={{ marginTop: 8 }}
                  showIcon
                />
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Notes (Optional)
              </label>
              <TextArea
                rows={3}
                value={approvalModal.notes}
                onChange={(e) => setApprovalModal(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any notes about this approval..."
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Deny Modal */}
      <Modal
        title="Deny User Request"
        open={denyModal.visible}
        onCancel={() => setDenyModal({ visible: false, user: null, reason: '' })}
        footer={[
          <WhiteButton key="cancel" onClick={() => setDenyModal({ visible: false, user: null, reason: '' })}>
            Cancel
          </WhiteButton>,
          <BlackButton
            key="deny"
            icon={<CloseCircleOutlined />}
            loading={processing}
            onClick={submitDeny}
            disabled={!denyModal.reason.trim()}
            style={{ backgroundColor: '#ff4d4f', borderColor: '#ff4d4f' }}
          >
            Deny Request
          </BlackButton>
        ]}
      >
        {denyModal.user && (
          <div>
            <div style={{
              padding: 16,
              backgroundColor: '#f5f5f5',
              borderRadius: 6,
              marginBottom: 16
            }}>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>
                {denyModal.user.fullname}
              </div>
              <div style={{ color: '#8c8c8c' }}>
                {denyModal.user.email}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Reason for Denial <span style={{ color: '#ff4d4f' }}>*</span>
              </label>
              <TextArea
                rows={4}
                value={denyModal.reason}
                onChange={(e) => setDenyModal(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Explain why this request is being denied..."
                required
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminApprovalPanel;
