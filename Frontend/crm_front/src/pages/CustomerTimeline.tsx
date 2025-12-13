import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, notification, Timeline, Empty, Descriptions, Avatar, Space, Modal, Input, Form } from 'antd';
import { 
  ArrowLeftOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  EyeOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  CalendarOutlined,
  TagsOutlined,
  PlusOutlined,
  CommentOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getAuthToken, getCustomerActivities } from '../utils/functions';
import { CustomerActivitiesUrl, CustomersUrl } from '../utils/network';
import { CustomerActivityProps, CustomerProps } from '../utils/types';
import { fullname, role, email } from '../utils/data';
import Header from '../components/Header';

const CustomerTimeline: React.FC = () => {
  const navigate = useNavigate();
  const { customerId } = useParams<{ customerId: string }>();
  const [customer, setCustomer] = useState<CustomerProps | null>(null);
  const [activities, setActivities] = useState<CustomerActivityProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteForm] = Form.useForm();

  const currentUser = {
    role: localStorage.getItem(role) || 'user',
    fullname: localStorage.getItem(fullname) || 'User',
    email: localStorage.getItem(email) || ''
  };

  useEffect(() => {
    if (customerId) {
      fetchCustomer();
      fetchActivities();
    }
  }, [customerId]);

  const fetchCustomer = async () => {
    try {
      const headers = getAuthToken() as any;
      const response = await axios.get(`${CustomersUrl}/${customerId}`, headers);
      setCustomer(response.data);
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Failed to fetch customer details',
        title: 'Error'
      });
    }
  };

  const fetchActivities = async () => {
    if (customerId) {
      getCustomerActivities(customerId, setActivities, setLoading);
    }
  };

  const handleAddNote = async (values: { title: string; description: string }) => {
    if (!customerId) return;

    try {
      const headers = getAuthToken() as any;
      await axios.post(CustomerActivitiesUrl, {
        customer: customerId,
        activity_type: 'note_added',
        title: values.title,
        description: values.description
      }, headers);

      notification.success({
        message: 'Note Added',
        description: 'Note has been added to the timeline',
        title: 'Success'
      });

      setNoteModalVisible(false);
      noteForm.resetFields();
      fetchActivities(); // Refresh timeline
    } catch (error: any) {
      notification.error({
        message: 'Error',
        description: error.response?.data?.error || 'Failed to add note',
        title: 'Error'
      });
    }
  };

  const getActivityIcon = (activityType: string) => {
    const iconStyle = { fontSize: '16px' };
    const icons: Record<string, any> = {
      'estimate_created': <FileTextOutlined style={{ ...iconStyle, color: '#1890ff' }} />,
      'estimate_updated': <EditOutlined style={{ ...iconStyle, color: '#722ed1' }} />,
      'estimate_sent': <SendOutlined style={{ ...iconStyle, color: '#13c2c2' }} />,
      'estimate_approved': <CheckCircleOutlined style={{ ...iconStyle, color: '#52c41a' }} />,
      'estimate_rejected': <CloseCircleOutlined style={{ ...iconStyle, color: '#ff4d4f' }} />,
      'customer_contacted': <UserOutlined style={{ ...iconStyle, color: '#faad14' }} />,
      'note_added': <CommentOutlined style={{ ...iconStyle, color: '#8c8c8c' }} />,
      'status_changed': <ClockCircleOutlined style={{ ...iconStyle, color: '#fa8c16' }} />,
      'other': <FileTextOutlined style={{ ...iconStyle, color: '#1890ff' }} />
    };
    return icons[activityType] || <ClockCircleOutlined style={{ ...iconStyle, color: '#8c8c8c' }} />;
  };

  const getActivityColor = (activityType: string): string => {
    const colors: Record<string, string> = {
      'estimate_created': '#1890ff',
      'estimate_updated': '#722ed1',
      'estimate_sent': '#13c2c2',
      'estimate_approved': '#52c41a',
      'estimate_rejected': '#ff4d4f',
      'customer_contacted': '#faad14',
      'note_added': '#8c8c8c',
      'status_changed': '#fa8c16',
      'other': '#1890ff'
    };
    return colors[activityType] || '#8c8c8c';
  };

  const getActivityBgColor = (activityType: string): string => {
    const bgColors: Record<string, string> = {
      'estimate_created': '#e6f7ff',
      'estimate_updated': '#f9f0ff',
      'estimate_sent': '#e6fffb',
      'estimate_approved': '#f6ffed',
      'estimate_rejected': '#fff1f0',
      'customer_contacted': '#fffbe6',
      'note_added': '#fafafa',
      'status_changed': '#fff7e6',
      'other': '#e6f7ff'
    };
    return bgColors[activityType] || '#fafafa';
  };

  return (
    <div>
      <Header currentUser={currentUser} />
      
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 500, margin: 0, marginBottom: '8px' }}>
                Activity Timeline
              </h1>
              <p style={{ color: '#666', margin: 0 }}>
                Track all activities for: <strong>{customer?.full_name}</strong>
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

        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px' }}>
          {/* Modern Customer Info Card */}
          {customer && (
            <Card 
              style={{ 
                borderRadius: '12px',
                position: 'sticky',
                top: '24px',
                alignSelf: 'start'
              }}
              bodyStyle={{ padding: '20px' }}
            >
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <Avatar 
                  size={72} 
                  style={{ 
                    backgroundColor: '#1890ff',
                    fontSize: '28px',
                    marginBottom: '12px'
                  }}
                >
                  {customer.full_name?.charAt(0) || 'C'}
                </Avatar>
                <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
                  {customer.full_name}
                </div>
                <Tag color="blue" style={{ fontSize: '11px' }}>
                  {customer.stage?.toUpperCase()}
                </Tag>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Email */}
                <div style={{
                  padding: '10px',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '8px',
                  border: '1px solid #bae6fd'
                }}>
                  <div style={{ fontSize: '10px', color: '#0284c7', fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <MailOutlined /> Email
                  </div>
                  <div style={{ fontSize: '13px', color: '#000', wordBreak: 'break-word' }}>
                    {customer.email}
                  </div>
                </div>

                {/* Phone */}
                {customer.phone && (
                  <div style={{
                    padding: '10px',
                    backgroundColor: '#f0fdf4',
                    borderRadius: '8px',
                    border: '1px solid #bbf7d0'
                  }}>
                    <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <PhoneOutlined /> Phone
                    </div>
                    <div style={{ fontSize: '13px', color: '#000' }}>
                      {customer.phone}
                    </div>
                  </div>
                )}

                {/* Location */}
                {(customer.city || customer.state) && (
                  <div style={{
                    padding: '10px',
                    backgroundColor: '#fef3f2',
                    borderRadius: '8px',
                    border: '1px solid #fecaca'
                  }}>
                    <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <HomeOutlined /> Location
                    </div>
                    <div style={{ fontSize: '13px', color: '#000' }}>
                      {[customer.city, customer.state].filter(Boolean).join(', ')}
                    </div>
                  </div>
                )}

                {/* Service Type */}
                {customer.service_type_name && (
                  <div style={{
                    padding: '10px',
                    backgroundColor: '#faf5ff',
                    borderRadius: '8px',
                    border: '1px solid #e9d5ff'
                  }}>
                    <div style={{ fontSize: '10px', color: '#9333ea', fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <TagsOutlined /> Service Type
                    </div>
                    <div style={{ fontSize: '13px', color: '#000' }}>
                      {customer.service_type_name}
                    </div>
                  </div>
                )}

                {/* Move Date */}
                {customer.move_date && (
                  <div style={{
                    padding: '10px',
                    backgroundColor: '#fffbeb',
                    borderRadius: '8px',
                    border: '1px solid #fde68a'
                  }}>
                    <div style={{ fontSize: '10px', color: '#d97706', fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <CalendarOutlined /> Move Date
                    </div>
                    <div style={{ fontSize: '13px', color: '#000' }}>
                      {new Date(customer.move_date).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Timeline Card - Modern but consistent */}
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClockCircleOutlined style={{ fontSize: '18px' }} />
                  <span style={{ fontSize: '16px', fontWeight: 600 }}>
                    Activity Timeline
                  </span>
                  <Tag color="blue" style={{ marginLeft: '8px' }}>{activities.length}</Tag>
                </div>
                <Button 
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setNoteModalVisible(true)}
                  style={{ 
                    backgroundColor: '#52c41a', 
                    borderColor: '#52c41a',
                    fontSize: '12px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  Add Note
                </Button>
              </div>
            }
            style={{ 
              borderRadius: '12px'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>
                <ClockCircleOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                <div style={{ color: '#999' }}>Loading activities...</div>
              </div>
            ) : activities.length === 0 ? (
              <Empty 
                description="No activities yet" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: '60px 0' }}
              />
            ) : (
              <Timeline
                style={{ marginTop: '16px' }}
                items={activities.map(activity => ({
                  key: activity.id,
                  dot: (
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: getActivityBgColor(activity.activity_type),
                      border: `2px solid ${getActivityColor(activity.activity_type)}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      transition: 'all 0.3s ease'
                    }}>
                      {getActivityIcon(activity.activity_type)}
                    </div>
                  ),
                  children: (
                    <Card 
                      size="small"
                      style={{ 
                        marginBottom: '16px',
                        borderRadius: '8px',
                        border: '1px solid #f0f0f0',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        transition: 'all 0.2s ease'
                      }}
                      bodyStyle={{ padding: '16px' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                        e.currentTarget.style.borderColor = '#d9d9d9';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)';
                        e.currentTarget.style.borderColor = '#f0f0f0';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '15px', fontWeight: 600, color: '#000', marginBottom: '6px' }}>
                            {activity.title}
                          </div>
                          <div style={{ fontSize: '12px', color: '#999', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span>
                              <ClockCircleOutlined /> {new Date(activity.created_at!).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <span>
                              <UserOutlined /> {activity.created_by_name}
                            </span>
                          </div>
                        </div>
                          <Tag 
                            style={{ 
                              margin: 0, 
                              fontSize: '10px', 
                              fontWeight: 500,
                              backgroundColor: getActivityBgColor(activity.activity_type),
                              color: getActivityColor(activity.activity_type),
                              border: `1px solid ${getActivityColor(activity.activity_type)}`
                            }}
                          >
                            {activity.activity_type.replace('_', ' ').toUpperCase()}
                          </Tag>
                      </div>
                      
                      {activity.description && (
                        <div style={{ 
                          fontSize: '13px', 
                          color: '#666',
                          marginTop: '12px',
                          padding: '10px',
                          backgroundColor: '#fafafa',
                          borderRadius: '6px',
                          borderLeft: '2px solid #1890ff'
                        }}>
                          {activity.description}
                        </div>
                      )}
                      
                      {activity.estimate_id && (
                        <div style={{ 
                          marginTop: '12px',
                          paddingTop: '12px',
                          borderTop: '1px solid #f0f0f0',
                          display: 'flex',
                          gap: '8px',
                          alignItems: 'center'
                        }}>
                          <Button
                            size="small"
                            type="primary"
                            icon={<EyeOutlined />}
                            onClick={() => navigate(`/estimate-editor/${activity.estimate_id}`)}
                          >
                            View Estimate
                          </Button>
                          <Tag 
                            color="blue"
                            style={{ margin: 0 }}
                          >
                            <FileTextOutlined /> Estimate #{activity.estimate_id}
                          </Tag>
                        </div>
                      )}
                    </Card>
                  )
                }))}
              />
            )}
          </Card>
        </div>
      </div>

      {/* Add Note Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CommentOutlined />
            Add Note to Timeline
          </div>
        }
        open={noteModalVisible}
        onCancel={() => {
          setNoteModalVisible(false);
          noteForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={noteForm}
          layout="vertical"
          onFinish={handleAddNote}
          style={{ marginTop: '16px' }}
        >
          <Form.Item
            name="title"
            label="Note Title"
            rules={[{ required: true, message: 'Please enter a note title' }]}
          >
            <Input 
              placeholder="Enter a brief title for this note..."
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Note Details"
            rules={[{ required: true, message: 'Please enter note details' }]}
          >
            <Input.TextArea
              placeholder="Enter detailed note information..."
              rows={4}
              showCount
              maxLength={500}
            />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
            <Button 
              onClick={() => {
                setNoteModalVisible(false);
                noteForm.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button 
              type="primary" 
              htmlType="submit"
              icon={<PlusOutlined />}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Add Note
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default CustomerTimeline;
