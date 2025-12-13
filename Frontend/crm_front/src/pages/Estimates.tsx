import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Tag, notification, Table, Space } from 'antd';
import { 
  SearchOutlined, 
  EyeOutlined,
  EditOutlined,
  CalculatorOutlined,
  UserOutlined,
  CarOutlined,
  DollarOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthToken, getEstimates, recalculateEstimate } from '../utils/functions';
import { EstimatesUrl } from '../utils/network';
import { EstimateProps } from '../utils/types';
import { fullname, role, email } from '../utils/data';
import Header from '../components/Header';

const Estimates: React.FC = () => {
  const navigate = useNavigate();
  const [estimates, setEstimates] = useState<EstimateProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const currentUser = {
    role: localStorage.getItem(role) || 'user',
    fullname: localStorage.getItem(fullname) || 'User',
    email: localStorage.getItem(email) || ''
  };

  useEffect(() => {
    fetchEstimates();
  }, []);

  const fetchEstimates = async () => {
    getEstimates(setEstimates, setLoading);
  };

  const handleRecalculate = async (estimateId: number) => {
    const success = await recalculateEstimate(estimateId);
    if (success) {
      notification.success({
        message: 'Recalculated',
        description: 'Estimate has been recalculated successfully',
        title: 'Success'
      });
      fetchEstimates();
    } else {
      notification.error({
        message: 'Recalculation Error',
        description: 'Failed to recalculate estimate',
        title: 'Error'
      });
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: number) => <Tag color="blue">#{id}</Tag>
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
      render: (name: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <UserOutlined style={{ color: '#1890ff' }} />
          {name}
        </div>
      )
    },
    {
      title: 'Service Type',
      dataIndex: 'service_type_name',
      key: 'service_type_name',
      width: 120,
      render: (name: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CarOutlined style={{ color: '#52c41a' }} />
          {name}
        </div>
      )
    },
    {
      title: 'Template',
      dataIndex: 'template_name',
      key: 'template_name',
      width: 150
    },
    {
      title: 'Details',
      key: 'details',
      width: 150,
      render: (record: EstimateProps) => (
        <div style={{ fontSize: '12px' }}>
          {record.weight_lbs && <div>Weight: {record.weight_lbs} lbs</div>}
          {record.labour_hours && <div>Hours: {record.labour_hours}</div>}
        </div>
      )
    },
    {
      title: 'Total Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      render: (amount: number) => {
        const amountNum = amount ? Number(amount) : 0;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#52c41a' }}>
            <DollarOutlined />
            ${amountNum.toFixed(2)}
          </div>
        );
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusColors: Record<string, string> = {
          'draft': 'orange',
          'sent': 'blue',
          'approved': 'green',
          'rejected': 'red'
        };
        return <Tag color={statusColors[status] || 'default'}>{status.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 100,
      render: (date: string) => new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (record: EstimateProps) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/estimate-editor/${record.id}`)}
            title="View/Edit Estimate"
          >
            View
          </Button>
          <Button
            size="small"
            icon={<CalculatorOutlined />}
            onClick={() => record.id && handleRecalculate(record.id)}
            title="Recalculate"
          />
        </Space>
      )
    }
  ];

  const filteredEstimates = estimates.filter(estimate =>
    estimate.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.template_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.service_type_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <Header currentUser={currentUser} />
      
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 500, margin: 0, marginBottom: '8px' }}>Estimates</h1>
              <p style={{ color: '#666', margin: 0 }}>
                View and manage customer estimates ({filteredEstimates.length} of {estimates.length})
              </p>
            </div>
            <Button 
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/customers')}
            >
              Back to Customers
            </Button>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <Input
            placeholder="Search by customer, template, or service type..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: '400px' }}
            allowClear
          />
        </div>

        <Card bodyStyle={{ padding: 0 }}>
          <Table
            columns={columns}
            dataSource={filteredEstimates}
            loading={loading}
            rowKey="id"
            size="small"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} estimates`
            }}
            scroll={{ x: 1000 }}
          />
        </Card>
      </div>
    </div>
  );
};

export default Estimates;
