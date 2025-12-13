import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, notification, Modal, Table, Space } from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  ArrowLeftOutlined,
  DollarOutlined,
  PercentageOutlined,
  OrderedListOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getAuthToken } from '../utils/functions';
import { TemplateLineItemsUrl, EstimateTemplatesUrl } from '../utils/network';
import { TemplateLineItemProps, EstimateTemplateProps } from '../utils/types';
import { fullname, role, email } from '../utils/data';
import Header from '../components/Header';
import AddTemplateLineItemForm from '../components/AddTemplateLineItemForm';

const TemplateLineItems: React.FC = () => {
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId: string }>();
  const [template, setTemplate] = useState<EstimateTemplateProps | null>(null);
  const [lineItems, setLineItems] = useState<TemplateLineItemProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [editingLineItem, setEditingLineItem] = useState<TemplateLineItemProps | null>(null);

  const currentUser = {
    role: localStorage.getItem(role) || 'user',
    fullname: localStorage.getItem(fullname) || 'User',
    email: localStorage.getItem(email) || ''
  };

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
      fetchLineItems();
    }
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      const headers = getAuthToken() as any;
      const response = await axios.get(`${EstimateTemplatesUrl}/${templateId}`, headers);
      setTemplate(response.data);
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Failed to fetch template details',
        title: 'Error'
      });
    }
  };

  const fetchLineItems = async () => {
    setLoading(true);
    try {
      const headers = getAuthToken() as any;
      const response = await axios.get(`${TemplateLineItemsUrl}?template=${templateId}`, headers);
      setLineItems(response.data);
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Failed to fetch line items',
        title: 'Error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLineItem = async (id: number) => {
    Modal.confirm({
      title: 'Delete Line Item',
      content: 'Are you sure you want to delete this line item?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          const headers = getAuthToken() as any;
          await axios.delete(`${TemplateLineItemsUrl}/${id}`, headers);
          notification.success({
            message: 'Line Item Deleted',
            description: 'Line item has been deleted successfully',
            title: 'Success'
          });
          fetchLineItems();
        } catch (error) {
          notification.error({
            message: 'Delete Error',
            description: 'Failed to delete line item',
            title: 'Error'
          });
        }
      }
    });
  };

  const columns = [
    {
      title: 'Order',
      dataIndex: 'display_order',
      key: 'display_order',
      width: 80,
      render: (order: number) => (
        <Tag color="blue">{order}</Tag>
      )
    },
    {
      title: 'Charge Name',
      dataIndex: 'charge_name',
      key: 'charge_name',
      render: (name: string, record: TemplateLineItemProps) => (
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
      render: (type: string) => {
        const typeColors: Record<string, string> = {
          'per_lb': 'orange',
          'percent': 'purple',
          'flat': 'green',
          'hourly': 'blue'
        };
        return <Tag color={typeColors[type] || 'default'}>{type.replace('_', ' ').toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Rate/Percentage',
      key: 'pricing',
      width: 150,
      render: (record: TemplateLineItemProps) => (
        <div>
          {record.charge_type === 'percent' ? (
            <span style={{ color: '#722ed1' }}>
              <PercentageOutlined /> {record.percentage || 0}%
            </span>
          ) : (
            <span style={{ color: '#52c41a' }}>
              <DollarOutlined /> {record.rate || 0}
            </span>
          )}
        </div>
      )
    },
    {
      title: 'Editable',
      dataIndex: 'is_editable',
      key: 'is_editable',
      width: 100,
      render: (editable: boolean) => (
        <Tag color={editable ? 'green' : 'red'}>
          {editable ? 'YES' : 'NO'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (record: TemplateLineItemProps) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingLineItem(record);
              setIsAddFormVisible(true);
            }}
          />
          <Button
            size="small"
            icon={<DeleteOutlined />}
            danger
            onClick={() => record.id && handleDeleteLineItem(record.id)}
          />
        </Space>
      )
    }
  ];

  return (
    <div>
      <Header currentUser={currentUser} />
      
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 500, margin: 0, marginBottom: '8px' }}>
                Template Line Items
              </h1>
              <p style={{ color: '#666', margin: 0, marginBottom: '8px' }}>
                Manage line items for: <strong>{template?.name}</strong>
              </p>
              {template && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Tag color="blue">{template.service_type_name}</Tag>
                  <Tag color={template.is_active ? 'green' : 'red'}>
                    {template.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Tag>
                </div>
              )}
            </div>
            <Button 
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/estimate-templates')}
            >
              Back to Templates
            </Button>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingLineItem(null);
              setIsAddFormVisible(true);
            }}
          >
            Add Line Item
          </Button>
        </div>

        <Card bodyStyle={{ padding: 0 }}>
          <Table
            columns={columns}
            dataSource={lineItems}
            loading={loading}
            rowKey="id"
            size="small"
            pagination={false}
            locale={{
              emptyText: (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <OrderedListOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                  <p style={{ color: '#999', marginBottom: '16px' }}>No line items configured</p>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditingLineItem(null);
                      setIsAddFormVisible(true);
                    }}
                  >
                    Add First Line Item
                  </Button>
                </div>
              )
            }}
          />
        </Card>

        {/* Add/Edit Line Item Form */}
        <AddTemplateLineItemForm
          isVisible={isAddFormVisible}
          templateId={templateId ? parseInt(templateId) : null}
          onClose={() => {
            setIsAddFormVisible(false);
            setEditingLineItem(null);
          }}
          onSuccessCallBack={() => {
            setIsAddFormVisible(false);
            setEditingLineItem(null);
            fetchLineItems();
          }}
          editingLineItem={editingLineItem}
        />
      </div>
    </div>
  );
};

export default TemplateLineItems;
