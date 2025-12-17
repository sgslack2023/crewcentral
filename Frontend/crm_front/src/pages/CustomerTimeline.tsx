import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, notification, Timeline, Empty, Descriptions, Avatar, Space, Modal, Input, Form, Select } from 'antd';
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

const STAGE_OPTIONS = [
  { value: 'new_lead', label: 'New Lead', color: '#fa8c16' },
  { value: 'in_progress', label: 'In Progress', color: '#1890ff' },
  { value: 'opportunity', label: 'Opportunity', color: '#13c2c2' },
  { value: 'booked', label: 'Booked', color: '#722ed1' },
  { value: 'closed', label: 'Closed', color: '#52c41a' },
  { value: 'bad_lead', label: 'Bad Lead', color: '#ff7a45' },
  { value: 'lost', label: 'Lost', color: '#ff4d4f' }
];

const CustomerTimeline: React.FC = () => {
  const navigate = useNavigate();
  const { customerId } = useParams<{ customerId: string }>();
  const [customer, setCustomer] = useState<CustomerProps | null>(null);
  const [activities, setActivities] = useState<CustomerActivityProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [viewNotesModalVisible, setViewNotesModalVisible] = useState(false);
  const [noteForm] = Form.useForm();
  const [stageUpdating, setStageUpdating] = useState(false);

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

  const handleStageChange = async (newStage: string) => {
    if (!customerId || !customer) return;

    setStageUpdating(true);
    try {
      const headers = getAuthToken() as any;
      await axios.post(`${CustomersUrl}/${customerId}/change_stage`, {
        stage: newStage
      }, headers);

      notification.success({
        message: 'Stage Updated',
        description: `Customer stage has been changed to ${STAGE_OPTIONS.find(s => s.value === newStage)?.label}`,
        title: 'Success'
      });

      // Update local customer state
      setCustomer({ ...customer, stage: newStage });

      // Refresh activities to show the stage change
      fetchActivities();
    } catch (error: any) {
      notification.error({
        message: 'Error',
        description: error.response?.data?.error || 'Failed to update stage',
        title: 'Error'
      });
    } finally {
      setStageUpdating(false);
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

  const getStageColor = (stage: string): string => {
    const stageOption = STAGE_OPTIONS.find(s => s.value === stage);
    return stageOption?.color || '#8c8c8c';
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
              Back
            </Button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px' }}>
          {/* Modern Customer Info Card */}
          {customer && (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              position: 'sticky',
              top: '24px',
              alignSelf: 'start',
              overflow: 'hidden'
            }}>
              {/* Header with Avatar */}
              <div style={{
                background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                padding: '24px',
                textAlign: 'center'
              }}>
                <Avatar 
                  size={80} 
                  style={{ 
                    backgroundColor: '#2563eb',
                    fontSize: '32px',
                    marginBottom: '12px',
                    border: '4px solid #fff',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                >
                  {customer.full_name?.charAt(0) || 'C'}
                </Avatar>
                <h3 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 12px 0', color: '#111827' }}>
                  {customer.full_name}
                </h3>
                <Select
                  value={customer.stage}
                  onChange={handleStageChange}
                  loading={stageUpdating}
                  style={{
                    width: '180px',
                    borderRadius: '8px'
                  }}
                  size="middle"
                  suffixIcon={<EditOutlined style={{ fontSize: '12px', color: '#6b7280' }} />}
                  dropdownStyle={{ borderRadius: '8px' }}
                  options={STAGE_OPTIONS.map(stage => ({
                    value: stage.value,
                    label: (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: stage.color,
                          flexShrink: 0
                        }} />
                        <span style={{ fontWeight: 500 }}>{stage.label}</span>
                      </div>
                    )
                  }))}
                  placeholder="Select stage"
                  disabled={stageUpdating}
                />
              </div>

              {/* Contact Information */}
              <div style={{ padding: '20px' }}>
                <h4 style={{ 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  margin: '0 0 16px 0'
                }}>
                  Contact Information
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Email */}
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#2563eb', 
                      fontWeight: 500, 
                      marginBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <MailOutlined style={{ fontSize: '12px' }} />
                      EMAIL
                    </div>
                    <div style={{ fontSize: '13px', color: '#111827', wordBreak: 'break-word', lineHeight: '1.4' }}>
                      {customer.email}
                    </div>
                  </div>

                  {/* Phone */}
                  {customer.phone && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      transition: 'all 0.2s ease'
                    }}>
                      <div style={{ 
                        fontSize: '11px', 
                        color: '#16a34a', 
                        fontWeight: 500, 
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <PhoneOutlined style={{ fontSize: '12px' }} />
                        PHONE
                      </div>
                      <div style={{ fontSize: '13px', color: '#111827' }}>
                        {customer.phone}
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  {(customer.city || customer.state) && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      transition: 'all 0.2s ease'
                    }}>
                      <div style={{ 
                        fontSize: '11px', 
                        color: '#ea580c', 
                        fontWeight: 500, 
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <HomeOutlined style={{ fontSize: '12px' }} />
                        LOCATION
                      </div>
                      <div style={{ fontSize: '13px', color: '#111827' }}>
                        {[customer.city, customer.state].filter(Boolean).join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Details */}
              {(customer.service_type_name || customer.move_date) && (
                <>
                  <div style={{ 
                    height: '1px', 
                    backgroundColor: '#e5e7eb',
                    margin: '0 20px'
                  }} />
                  
                  <div style={{ padding: '20px' }}>
                    <h4 style={{ 
                      fontSize: '12px', 
                      fontWeight: 600, 
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      margin: '0 0 16px 0'
                    }}>
                      Move Details
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Service Type */}
                      {customer.service_type_name && (
                        <div style={{
                          padding: '12px',
                          backgroundColor: '#f9fafb',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          transition: 'all 0.2s ease'
                        }}>
                          <div style={{ 
                            fontSize: '11px', 
                            color: '#9333ea', 
                            fontWeight: 500, 
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <TagsOutlined style={{ fontSize: '12px' }} />
                            SERVICE TYPE
                          </div>
                          <div style={{ fontSize: '13px', color: '#111827' }}>
                            {customer.service_type_name}
                          </div>
                        </div>
                      )}

                      {/* Move Date */}
                      {customer.move_date && (
                        <div style={{
                          padding: '12px',
                          backgroundColor: '#f9fafb',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          transition: 'all 0.2s ease'
                        }}>
                          <div style={{ 
                            fontSize: '11px', 
                            color: '#d97706', 
                            fontWeight: 500, 
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <CalendarOutlined style={{ fontSize: '12px' }} />
                            MOVE DATE
                          </div>
                          <div style={{ fontSize: '13px', color: '#111827' }}>
                            {new Date(customer.move_date).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Timeline Card - Modern */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ClockCircleOutlined style={{ fontSize: '18px', color: '#2563eb' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: '#111827' }}>
                    Activity Timeline
                  </h2>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                    {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => setViewNotesModalVisible(true)}
                  style={{
                    backgroundColor: '#e0f2fe',
                    color: '#0284c7',
                    border: '1px solid #7dd3fc',
                    borderRadius: '8px',
                    fontWeight: 500,
                    height: '36px',
                    padding: '0 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  View Notes
                </Button>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => setNoteModalVisible(true)}
                  style={{
                    backgroundColor: '#dcfce7',
                    color: '#16a34a',
                    border: '1px solid #86efac',
                    borderRadius: '8px',
                    fontWeight: 500,
                    height: '36px',
                    padding: '0 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  Add Note
                </Button>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '16px' }}>
                {activities.map((activity, index) => (
                  <div 
                    key={activity.id}
                    style={{
                      display: 'flex',
                      gap: '20px',
                      position: 'relative',
                      paddingBottom: index !== activities.length - 1 ? '24px' : '0'
                    }}
                  >
                    {/* Timeline line connector */}
                    {index !== activities.length - 1 && (
                      <div style={{
                        position: 'absolute',
                        left: '23px',
                        top: '52px',
                        bottom: '-24px',
                        width: '2px',
                        background: 'linear-gradient(to bottom, #e5e7eb 0%, #f3f4f6 100%)',
                        zIndex: 0
                      }} />
                    )}

                    {/* Icon Badge */}
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: getActivityBgColor(activity.activity_type),
                      border: `2px solid ${getActivityColor(activity.activity_type)}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      zIndex: 1,
                      position: 'relative'
                    }}>
                      {getActivityIcon(activity.activity_type)}
                    </div>

                    {/* Activity Content Card */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          padding: '20px',
                          backgroundColor: '#fff',
                          borderRadius: '12px',
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          transition: 'all 0.2s ease',
                          cursor: 'default'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ 
                              fontSize: '16px', 
                              fontWeight: 600, 
                              color: '#111827',
                              margin: '0 0 8px 0'
                            }}>
                              {activity.title}
                            </h3>
                            <div style={{ 
                              fontSize: '13px', 
                              color: '#6b7280', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '16px',
                              flexWrap: 'wrap'
                            }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <ClockCircleOutlined style={{ fontSize: '12px' }} />
                                {new Date(activity.created_at!).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <UserOutlined style={{ fontSize: '12px' }} />
                                {activity.created_by_name}
                              </span>
                            </div>
                          </div>
                          <Tag 
                            style={{ 
                              margin: 0, 
                              fontSize: '11px', 
                              fontWeight: 500,
                              padding: '4px 12px',
                              borderRadius: '6px',
                              backgroundColor: getActivityBgColor(activity.activity_type),
                              color: getActivityColor(activity.activity_type),
                              border: `1px solid ${getActivityColor(activity.activity_type)}`
                            }}
                          >
                            {activity.activity_type.replace('_', ' ').toUpperCase()}
                          </Tag>
                        </div>

                        {/* Description */}
                        {activity.description && (
                          <div style={{ 
                            fontSize: '14px', 
                            color: '#4b5563',
                            lineHeight: '1.6',
                            marginTop: '12px',
                            padding: '14px',
                            backgroundColor: '#f9fafb',
                            borderRadius: '8px',
                            borderLeft: `3px solid ${getActivityColor(activity.activity_type)}`
                          }}>
                            {activity.description}
                          </div>
                        )}

                        {/* Estimate Link */}
                        {activity.estimate_id && (
                          <div style={{ 
                            marginTop: '16px',
                            paddingTop: '16px',
                            borderTop: '1px solid #e5e7eb',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'center'
                          }}>
                            <Button
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => navigate(`/estimate-editor/${activity.estimate_id}`)}
                              style={{
                                backgroundColor: '#dbeafe',
                                color: '#2563eb',
                                border: '1px solid #93c5fd',
                                borderRadius: '8px',
                                fontWeight: 500,
                                height: '32px',
                                padding: '0 16px'
                              }}
                            >
                              View Estimate
                            </Button>
                            <Tag 
                              style={{ 
                                margin: 0,
                                backgroundColor: '#eff6ff',
                                color: '#1e40af',
                                border: '1px solid #bfdbfe',
                                borderRadius: '6px',
                                padding: '4px 10px',
                                fontSize: '12px'
                              }}
                            >
                              <FileTextOutlined /> Estimate #{activity.estimate_id}
                            </Tag>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
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

      {/* View Notes Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CommentOutlined />
            View All Notes
          </div>
        }
        open={viewNotesModalVisible}
        onCancel={() => setViewNotesModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewNotesModalVisible(false)}>
            Close
          </Button>
        ]}
        width={700}
        style={{
          borderRadius: '16px',
          overflow: 'hidden'
        }}
        bodyStyle={{
          maxHeight: '600px',
          overflowY: 'auto'
        }}
      >
        {activities.filter(a => a.activity_type === 'note_added').length === 0 ? (
          <Empty
            description="No notes found"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '60px 0' }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activities
              .filter(activity => activity.activity_type === 'note_added')
              .map((activity) => (
                <div
                  key={activity.id}
                  style={{
                    padding: '20px',
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: '#111827',
                        margin: '0 0 8px 0'
                      }}>
                        {activity.title}
                      </h3>
                      <div style={{
                        fontSize: '13px',
                        color: '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ClockCircleOutlined style={{ fontSize: '12px' }} />
                          {new Date(activity.created_at!).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <UserOutlined style={{ fontSize: '12px' }} />
                          {activity.created_by_name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {activity.description && (
                    <div style={{
                      fontSize: '14px',
                      color: '#4b5563',
                      lineHeight: '1.6',
                      marginTop: '12px',
                      padding: '14px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      borderLeft: '3px solid #8c8c8c'
                    }}>
                      {activity.description}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomerTimeline;
