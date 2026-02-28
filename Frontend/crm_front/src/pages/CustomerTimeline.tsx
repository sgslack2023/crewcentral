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
import { getAuthToken, getCustomerActivities, getCurrentUser } from '../utils/functions';
import { CustomerActivitiesUrl, CustomersUrl } from '../utils/network';
import { CustomerActivityProps, CustomerProps } from '../utils/types';
import { fullname, role, email } from '../utils/data';
import Header from '../components/Header';
import { BlackButton, WhiteButton, SearchBar, PageLoader } from '../components';

const STAGE_OPTIONS = [
  { value: 'new_lead', label: 'New Lead', color: '#c7d2ff' },
  { value: 'in_progress', label: 'In Progress', color: '#8ea5ff' },
  { value: 'opportunity', label: 'Opportunity', color: '#7c8cfb' },
  { value: 'booked', label: 'Booked', color: '#5b6cf9' },
  { value: 'closed', label: 'Closed', color: '#4a56c4' },
  { value: 'bad_lead', label: 'Bad Lead', color: '#8e8ea8' },
  { value: 'lost', label: 'Lost', color: '#6b7280' }
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

  const currentUser = getCurrentUser();

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
    const iconStyle = { fontSize: '14px' };
    const icons: Record<string, any> = {
      'estimate_created': <FileTextOutlined style={{ ...iconStyle, color: '#5b6cf9' }} />,
      'estimate_updated': <EditOutlined style={{ ...iconStyle, color: '#5b6cf9' }} />,
      'estimate_sent': <SendOutlined style={{ ...iconStyle, color: '#5b6cf9' }} />,
      'estimate_approved': <CheckCircleOutlined style={{ ...iconStyle, color: '#5b6cf9' }} />,
      'estimate_rejected': <CloseCircleOutlined style={{ ...iconStyle, color: '#8e8ea8' }} />,
      'customer_contacted': <UserOutlined style={{ ...iconStyle, color: '#5b6cf9' }} />,
      'note_added': <CommentOutlined style={{ ...iconStyle, color: '#5b6cf9' }} />,
      'status_changed': <ClockCircleOutlined style={{ ...iconStyle, color: '#5b6cf9' }} />,
      'email_sent': <MailOutlined style={{ ...iconStyle, color: '#5b6cf9' }} />,
      'email_opened': <EyeOutlined style={{ ...iconStyle, color: '#10b981' }} />,
      'other': <FileTextOutlined style={{ ...iconStyle, color: '#5b6cf9' }} />
    };
    return icons[activityType] || <ClockCircleOutlined style={{ ...iconStyle, color: '#8e8ea8' }} />;
  };

  const getActivityColor = (activityType: string): string => {
    const blueStates = ['estimate_created', 'estimate_updated', 'estimate_sent', 'estimate_approved', 'customer_contacted', 'status_changed', 'email_sent'];
    if (blueStates.includes(activityType)) return '#5b6cf9';
    if (activityType === 'email_opened') return '#10b981';
    return '#8e8ea8';
  };

  const getActivityBgColor = (activityType: string): string => {
    const blueStates = ['estimate_created', 'estimate_updated', 'estimate_sent', 'estimate_approved', 'customer_contacted', 'status_changed', 'email_sent'];
    if (blueStates.includes(activityType)) return '#f0f2ff';
    if (activityType === 'email_opened') return '#ecfdf5';
    return '#f4f4f7';
  };

  const getStageColor = (stage: string): string => {
    const stageOption = STAGE_OPTIONS.find(s => s.value === stage);
    return stageOption?.color || '#8c8c8c';
  };

  return (
    <>
      <div style={{ padding: '8px 16px 24px 16px', height: '100%', display: 'flex', flexDirection: 'column' }}>    {/* Header */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1a1a2e' }}>
                Activity Timeline
              </h1>
              <p style={{ color: '#8e8ea8', margin: '4px 0 0 0', fontSize: '13px' }}>
                Track all activities for: <strong>{customer?.full_name}</strong>
              </p>
            </div>
            <WhiteButton
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
            >
              Back
            </WhiteButton>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '16px', flex: 1, minHeight: 0 }}>
          {/* Modern Customer Info Card */}
          {customer && (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '100%',
              overflowY: 'auto',
              alignSelf: 'start'
            }}>
              {/* Header with Avatar - Compact Side-by-Side */}
              <div style={{
                background: 'linear-gradient(135deg, #f0f2ff 0%, #c7d2ff 100%)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Avatar
                  size={48}
                  style={{
                    backgroundColor: '#5b6cf9',
                    fontSize: '20px',
                    border: '2px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    flexShrink: 0
                  }}
                >
                  {customer.full_name?.charAt(0) || 'C'}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px 0', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {customer.full_name}
                  </h3>
                  <Select
                    value={customer.stage}
                    onChange={handleStageChange}
                    loading={stageUpdating}
                    style={{ width: '100%', maxWidth: '130px' }}
                    size="small"
                    suffixIcon={<EditOutlined style={{ fontSize: '10px', color: '#6b7280' }} />}
                    options={STAGE_OPTIONS.map(stage => ({
                      value: stage.value,
                      label: (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: stage.color }} />
                          <span style={{ fontSize: '12px' }}>{stage.label}</span>
                        </div>
                      )
                    }))}
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div style={{ padding: '16px' }}>
                <h4 style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  margin: '0 0 10px 0'
                }}>
                  Contact
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Email */}
                  <div style={{
                    padding: '8px 10px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{
                      fontSize: '10px',
                      color: '#5b6cf9',
                      fontWeight: 600,
                      marginBottom: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <MailOutlined style={{ fontSize: '11px' }} />
                      EMAIL
                    </div>
                    <div style={{ fontSize: '12px', color: '#111827', wordBreak: 'break-all' }}>
                      {customer.email}
                    </div>
                  </div>

                  {/* Phone */}
                  {customer.phone && (
                    <div style={{
                      padding: '8px 10px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{
                        fontSize: '10px',
                        color: '#5b6cf9',
                        fontWeight: 600,
                        marginBottom: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <PhoneOutlined style={{ fontSize: '11px' }} />
                        PHONE
                      </div>
                      <div style={{ fontSize: '12px', color: '#111827' }}>
                        {customer.phone}
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  {(customer.city || customer.state) && (
                    <div style={{
                      padding: '8px 10px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{
                        fontSize: '10px',
                        color: '#5b6cf9',
                        fontWeight: 600,
                        marginBottom: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <HomeOutlined style={{ fontSize: '11px' }} />
                        LOCATION
                      </div>
                      <div style={{ fontSize: '12px', color: '#111827' }}>
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

                  <div style={{ padding: '4px 16px 16px 16px' }}>
                    <h4 style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      margin: '0 0 10px 0'
                    }}>
                      Move Info
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {/* Service Type */}
                      {customer.service_type_name && (
                        <div style={{
                          padding: '6px 8px',
                          backgroundColor: '#f9fafb',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{
                            fontSize: '9px',
                            color: '#5b6cf9',
                            fontWeight: 600,
                            marginBottom: '1px',
                            display: 'flex', whiteSpace: 'nowrap'
                          }}>
                            SERVICE
                          </div>
                          <div style={{ fontSize: '11px', color: '#111827', fontWeight: 500 }}>
                            {customer.service_type_name}
                          </div>
                        </div>
                      )}

                      {/* Move Date */}
                      {customer.move_date && (
                        <div style={{
                          padding: '6px 8px',
                          backgroundColor: '#f9fafb',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{
                            fontSize: '9px',
                            color: '#5b6cf9',
                            fontWeight: 600,
                            marginBottom: '1px',
                            display: 'flex', whiteSpace: 'nowrap'
                          }}>
                            DATE
                          </div>
                          <div style={{ fontSize: '11px', color: '#111827', fontWeight: 500 }}>
                            {new Date(customer.move_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
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
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}>
            {/* Header */}
            <div style={{
              padding: '12px 20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #f0f2ff 0%, #c7d2ff 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ClockCircleOutlined style={{ fontSize: '16px', color: '#5b6cf9' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
                    Activities
                  </h2>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => setViewNotesModalVisible(true)}
                  size="small"
                  style={{
                    backgroundColor: '#f0f2ff',
                    color: '#5b6cf9',
                    border: '1px solid #c7d2ff',
                    borderRadius: '6px',
                    fontSize: '12px',
                    height: '28px'
                  }}
                >
                  View Notes
                </Button>
                <BlackButton
                  icon={<PlusOutlined />}
                  onClick={() => setNoteModalVisible(true)}
                  size="small"
                  style={{
                    fontSize: '12px',
                    height: '28px',
                    borderRadius: '6px'
                  }}
                >
                  Add Note
                </BlackButton>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '8px 16px', overflowY: 'auto', flex: 1 }}>
              {loading ? (
                <PageLoader text="Loading activities..." />
              ) : activities.length === 0 ? (
                <Empty
                  description="No activities yet"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ padding: '32px 0' }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  {activities.map((activity, index) => (
                    <div
                      key={activity.id}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        position: 'relative',
                        paddingBottom: index !== activities.length - 1 ? '8px' : '0'
                      }}
                    >
                      {/* Timeline line connector */}
                      {index !== activities.length - 1 && (
                        <div style={{
                          position: 'absolute',
                          left: '15px',
                          top: '32px',
                          bottom: '-8px',
                          width: '1px',
                          background: '#e5e7eb',
                          zIndex: 0
                        }} />
                      )}

                      {/* Icon Badge */}
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: getActivityBgColor(activity.activity_type),
                        border: `1px solid ${getActivityColor(activity.activity_type)}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        zIndex: 1,
                        position: 'relative'
                      }}>
                        {getActivityIcon(activity.activity_type)}
                      </div>

                      {/* Activity Content Card */}
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                            transition: 'all 0.2s ease',
                            cursor: 'default'
                          }}
                        >
                          {/* Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <div style={{ flex: 1 }}>
                              <h3 style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: '#111827',
                                margin: '0 0 2px 0'
                              }}>
                                {activity.title}
                              </h3>
                              <div style={{
                                fontSize: '11px',
                                color: '#6b7280',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                flexWrap: 'wrap'
                              }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <ClockCircleOutlined style={{ fontSize: '11px' }} />
                                  {new Date(activity.created_at!).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <UserOutlined style={{ fontSize: '11px' }} />
                                  {activity.created_by_name}
                                </span>
                              </div>
                            </div>
                            <Tag
                              style={{
                                margin: 0,
                                fontSize: '10px',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '4px',
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
                              fontSize: '12px',
                              color: '#4b5563',
                              lineHeight: '1.5',
                              marginTop: '6px',
                              padding: '8px 10px',
                              backgroundColor: '#f9fafb',
                              borderRadius: '6px',
                              borderLeft: `2px solid ${getActivityColor(activity.activity_type)}`
                            }}>
                              {activity.description}
                            </div>
                          )}

                          {/* Estimate Link */}
                          {activity.estimate_id && (
                            <div style={{
                              marginTop: '10px',
                              paddingTop: '8px',
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
            <WhiteButton
              onClick={() => {
                setNoteModalVisible(false);
                noteForm.resetFields();
              }}
            >
              Cancel
            </WhiteButton>
            <BlackButton
              htmlType="submit"
              icon={<PlusOutlined />}
            >
              Add Note
            </BlackButton>
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
          <WhiteButton key="close" onClick={() => setViewNotesModalVisible(false)}>
            Close
          </WhiteButton>
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
    </>
  );
};

export default CustomerTimeline;
