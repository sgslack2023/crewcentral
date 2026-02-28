import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, notification, Modal, Space } from 'antd';
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
import { getAuthToken, getCurrentUser } from '../utils/functions';
import { TemplateLineItemsUrl, EstimateTemplatesUrl } from '../utils/network';
import { TemplateLineItemProps, EstimateTemplateProps } from '../utils/types';
import { fullname, role, email } from '../utils/data';
import Header from '../components/Header';
import AddTemplateLineItemForm from '../components/AddTemplateLineItemForm';
import { WhiteButton, BlackButton } from '../components';
import FixedTable from '../components/FixedTable';

const TemplateLineItems: React.FC = () => {
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId: string }>();
  const [template, setTemplate] = useState<EstimateTemplateProps | null>(null);
  const [lineItems, setLineItems] = useState<TemplateLineItemProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [editingLineItem, setEditingLineItem] = useState<TemplateLineItemProps | null>(null);

  const currentUser = getCurrentUser();

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
      id: 'display_order',
      label: 'Order',
      width: 80,
      fixed: true,
      render: (value: any, record: TemplateLineItemProps) => (
        <Tag color="blue">{record.display_order}</Tag>
      )
    },
    {
      id: 'charge_name',
      label: 'Charge Name',
      width: 250,
      render: (value: any, record: TemplateLineItemProps) => (
        <div style={{ textAlign: 'left', padding: '4px 8px' }}>
          <div style={{ fontWeight: 600 }}>{record.charge_name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.category_name}
          </div>
        </div>
      )
    },
    {
      id: 'charge_type',
      label: 'Type',
      width: 120,
      render: (value: any, record: any) => {
        const chargeType = record.charge_type || 'flat';
        const typeColors: Record<string, string> = {
          'per_lb': 'orange',
          'percent': 'blue',
          'flat': 'green',
          'hourly': 'blue'
        };
        return <Tag color={typeColors[chargeType] || 'default'}>{chargeType.replace('_', ' ').toUpperCase()}</Tag>;
      }
    },
    {
      id: 'pricing',
      label: 'Rate/Percentage',
      width: 150,
      render: (value: any, record: TemplateLineItemProps) => (
        <div>
          {record.charge_type === 'percent' ? (
            <span style={{ color: '#5b6cf9' }}>
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
      id: 'is_editable',
      label: 'Editable',
      width: 100,
      render: (value: any, record: TemplateLineItemProps) => (
        <Tag color={record.is_editable ? 'green' : 'red'}>
          {record.is_editable ? 'YES' : 'NO'}
        </Tag>
      )
    },
    {
      id: 'actions',
      label: 'Actions',
      width: 120,
      render: (value: any, record: TemplateLineItemProps) => (
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
    <div style={{ padding: '8px 16px 24px 16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1a1a2e' }}>
              Template Line Items
            </h1>
            <p style={{ color: '#8e8ea8', margin: '4px 0 0 0', fontSize: '13px' }}>
              Manage line items for: <strong>{template?.name}</strong>
            </p>
            {template && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <Tag color="blue">{template.service_type_name}</Tag>
                <Tag color={template.is_active ? 'green' : 'red'}>
                  {template.is_active ? 'ACTIVE' : 'INACTIVE'}
                </Tag>
              </div>
            )}
          </div>
          <WhiteButton
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/estimate-templates')}
          >
            Back to Templates
          </WhiteButton>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <BlackButton
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingLineItem(null);
            setIsAddFormVisible(true);
          }}
        >
          New Line Item
        </BlackButton>
      </div>

      <Card
        style={{
          borderRadius: '12px',
          overflow: 'hidden',
          height: 'calc(100vh - 260px)',
          display: 'flex',
          flexDirection: 'column'
        }}
        bodyStyle={{
          padding: 0,
          height: '100%',
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {lineItems.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <OrderedListOutlined style={{ fontSize: '48px', color: '#a5affd', marginBottom: '16px' }} />
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
        ) : (
          <FixedTable
            columns={columns}
            data={lineItems}
            tableName="template_line_items_table"
          />
        )}
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
  );
};

export default TemplateLineItems;
