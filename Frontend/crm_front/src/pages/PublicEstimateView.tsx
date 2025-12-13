import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, notification, Table, Modal, Input, Result } from 'antd';
import { 
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  UserOutlined,
  TagsOutlined,
  TeamOutlined,
  CalculatorOutlined
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { EstimatesUrl } from '../utils/network';
import { EstimateProps, EstimateLineItemProps } from '../utils/types';

const { TextArea } = Input;

const PublicEstimateView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [estimate, setEstimate] = useState<EstimateProps | null>(null);
  const [lineItems, setLineItems] = useState<EstimateLineItemProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetchEstimate();
    }
  }, [token]);

  const fetchEstimate = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${EstimatesUrl}/public_view?token=${token}`);
      setEstimate(response.data);
      setLineItems(response.data.items || []);
      setError(null);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load estimate');
      notification.error({
        message: 'Error',
        description: error.response?.data?.error || 'Failed to load estimate',
        title: 'Error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    Modal.confirm({
      title: 'Approve Estimate',
      content: 'Are you sure you want to approve this estimate? This action cannot be undone.',
      okText: 'Approve',
      okType: 'primary',
      onOk: async () => {
        setActionLoading(true);
        try {
          await axios.post(`${EstimatesUrl}/customer_approve`, { token });
          notification.success({
            message: 'Estimate Approved',
            description: 'Thank you! Your estimate has been approved.',
            title: 'Success'
          });
          fetchEstimate();
        } catch (error: any) {
          notification.error({
            message: 'Approval Error',
            description: error.response?.data?.error || 'Failed to approve estimate',
            title: 'Error'
          });
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await axios.post(`${EstimatesUrl}/customer_reject`, { 
        token,
        reason: rejectionReason 
      });
      notification.success({
        message: 'Estimate Rejected',
        description: 'We have received your response. Thank you for your time.',
        title: 'Success'
      });
      setIsRejectModalVisible(false);
      fetchEstimate();
    } catch (error: any) {
      notification.error({
        message: 'Rejection Error',
        description: error.response?.data?.error || 'Failed to reject estimate',
        title: 'Error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      title: 'Charge',
      dataIndex: 'charge_name',
      key: 'charge_name',
      render: (name: string, record: EstimateLineItemProps) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.category_name}
          </div>
        </div>
      )
    },
    {
      title: 'Type',
      dataIndex: 'charge_type',
      key: 'charge_type',
      width: 120,
      render: (type: string) => (
        <Tag color="purple">{type.replace('_', ' ').toUpperCase()}</Tag>
      )
    },
    {
      title: 'Rate',
      dataIndex: 'rate',
      key: 'rate',
      width: 120,
      render: (rate: number, record: EstimateLineItemProps) => {
        if (record.charge_type === 'percent') return '-';
        return <span>${rate ? Number(rate).toFixed(2) : '0.00'}</span>;
      }
    },
    {
      title: 'Percentage',
      dataIndex: 'percentage',
      key: 'percentage',
      width: 120,
      render: (percentage: number, record: EstimateLineItemProps) => {
        if (record.charge_type !== 'percent') return '-';
        return <span>{percentage ? Number(percentage).toFixed(2) : '0.00'}%</span>;
      }
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (quantity: number) => <span>{quantity ? Number(quantity).toFixed(2) : '1.00'}</span>
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number) => {
        const amountNum = amount ? Number(amount) : 0;
        return (
          <span style={{ fontWeight: 600, color: '#52c41a' }}>
            ${amountNum.toFixed(2)}
          </span>
        );
      }
    }
  ];

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <FileTextOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
        <div>Loading estimate...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '60px' }}>
        <Result
          status="error"
          title="Unable to Load Estimate"
          subTitle={error}
        />
      </div>
    );
  }

  if (!estimate) {
    return null;
  }

  const isAlreadyResponded = estimate.status === 'approved' || estimate.status === 'rejected';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '24px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
          borderRadius: '12px',
          padding: '32px',
          marginBottom: '24px',
          color: '#fff'
        }}>
          <div style={{ textAlign: 'center' }}>
            <FileTextOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#fff', marginBottom: '8px' }}>
              BVL Movers - Estimate #{estimate.id}
            </h1>
            <Tag 
              color={
                estimate.status === 'approved' ? 'green' : 
                estimate.status === 'rejected' ? 'red' : 
                estimate.status === 'sent' ? 'blue' : 'orange'
              }
              style={{ fontSize: '12px' }}
            >
              {estimate.status?.toUpperCase()}
            </Tag>
          </div>
        </div>

        {/* Customer & Estimate Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <Card style={{ borderRadius: '12px' }}>
            <h3 style={{ marginTop: 0, fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserOutlined style={{ color: '#1890ff' }} /> Customer Information
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>Name</div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{estimate.customer_name}</div>
              </div>
              {estimate.service_type_name && (
                <div>
                  <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>Service Type</div>
                  <Tag color="purple">{estimate.service_type_name}</Tag>
                </div>
              )}
            </div>
          </Card>

          <Card style={{ borderRadius: '12px' }}>
            <h3 style={{ marginTop: 0, fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalculatorOutlined style={{ color: '#52c41a' }} /> Estimate Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {estimate.weight_lbs && (
                <div>
                  <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>Weight</div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{estimate.weight_lbs} lbs</div>
                </div>
              )}
              {estimate.labour_hours && (
                <div>
                  <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>Labour Hours</div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{Number(estimate.labour_hours).toFixed(1)} hours</div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Line Items */}
        <Card 
          style={{ borderRadius: '12px', marginBottom: '24px' }}
          bodyStyle={{ padding: 0 }}
        >
          <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>
              <FileTextOutlined /> Estimate Breakdown
            </h3>
          </div>
          <Table
            columns={columns}
            dataSource={lineItems}
            loading={loading}
            rowKey="id"
            size="small"
            pagination={false}
            summary={() => {
              const totalAmount = estimate.total_amount ? Number(estimate.total_amount) : 0;
              return (
                <Table.Summary>
                  <Table.Summary.Row style={{ backgroundColor: '#fafafa' }}>
                    <Table.Summary.Cell index={0} colSpan={5}>
                      <strong style={{ fontSize: '16px' }}>Total Amount</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <strong style={{ fontSize: '20px', color: '#52c41a' }}>
                        ${totalAmount.toFixed(2)}
                      </strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              );
            }}
          />
        </Card>

        {/* Action Buttons or Response Message */}
        {isAlreadyResponded ? (
          <Result
            status={estimate.status === 'approved' ? 'success' : 'warning'}
            title={estimate.status === 'approved' ? 'Estimate Approved' : 'Estimate Rejected'}
            subTitle={
              estimate.status === 'approved'
                ? 'Thank you for approving this estimate. We will contact you shortly to proceed.'
                : 'This estimate has been rejected. Thank you for your time.'
            }
          />
        ) : (
          <Card style={{ borderRadius: '12px' }}>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                Do you approve this estimate?
              </h3>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                Please review the details above and let us know your decision.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<CheckCircleOutlined />}
                  onClick={handleApprove}
                  loading={actionLoading}
                  style={{ minWidth: '150px' }}
                >
                  Approve Estimate
                </Button>
                <Button
                  danger
                  size="large"
                  icon={<CloseCircleOutlined />}
                  onClick={() => setIsRejectModalVisible(true)}
                  loading={actionLoading}
                  style={{ minWidth: '150px' }}
                >
                  Reject Estimate
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Reject Modal */}
        <Modal
          title="Reject Estimate"
          open={isRejectModalVisible}
          onCancel={() => setIsRejectModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setIsRejectModalVisible(false)}>
              Cancel
            </Button>,
            <Button 
              key="submit" 
              danger 
              type="primary"
              onClick={handleReject}
              loading={actionLoading}
            >
              Reject Estimate
            </Button>
          ]}
        >
          <p>Please let us know why you're rejecting this estimate (optional):</p>
          <TextArea
            rows={4}
            placeholder="Enter reason for rejection..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </Modal>
      </div>
    </div>
  );
};

export default PublicEstimateView;

