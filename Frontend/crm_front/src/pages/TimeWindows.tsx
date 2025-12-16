import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Tag, notification, Modal, Form, TimePicker, Switch, InputNumber } from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  ClockCircleOutlined,
  ArrowLeftOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthToken } from '../utils/functions';
import { BaseUrl } from '../utils/network';
import { fullname, role, email } from '../utils/data';
import Header from '../components/Header';
import dayjs from 'dayjs';

const TimeWindowsUrl = BaseUrl + 'transactiondata/time-windows';

interface TimeWindowProps {
  id?: number;
  name: string;
  start_time: string;
  end_time: string;
  time_display?: string;
  is_active?: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  created_by_name?: string;
}

const TimeWindows: React.FC = () => {
  const navigate = useNavigate();
  const [timeWindows, setTimeWindows] = useState<TimeWindowProps[]>([]);
  const [filteredTimeWindows, setFilteredTimeWindows] = useState<TimeWindowProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingWindow, setEditingWindow] = useState<TimeWindowProps | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const currentUser = {
    role: localStorage.getItem(role) || 'user',
    fullname: localStorage.getItem(fullname) || 'User',
    email: localStorage.getItem(email) || ''
  };

  useEffect(() => {
    fetchTimeWindows();
  }, []);

  useEffect(() => {
    filterTimeWindows();
  }, [searchTerm, timeWindows]);

  const fetchTimeWindows = async () => {
    setLoading(true);
    try {
      const headers = getAuthToken() as any;
      const response = await axios.get(TimeWindowsUrl, headers);
      setTimeWindows(response.data);
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Failed to fetch time windows',
        title: 'Error'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTimeWindows = () => {
    let filtered = [...timeWindows];

    if (searchTerm) {
      filtered = filtered.filter(window =>
        window.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTimeWindows(filtered);
  };

  const handleOpenForm = (window?: TimeWindowProps) => {
    if (window) {
      setEditingWindow(window);
      form.setFieldsValue({
        name: window.name,
        start_time: dayjs(window.start_time, 'HH:mm:ss'),
        end_time: dayjs(window.end_time, 'HH:mm:ss'),
        is_active: window.is_active !== false,
        display_order: window.display_order || 0
      });
    } else {
      setEditingWindow(null);
      form.resetFields();
    }
    setIsFormVisible(true);
  };

  const handleCloseForm = () => {
    setIsFormVisible(false);
    setEditingWindow(null);
    form.resetFields();
  };

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      const headers = getAuthToken() as any;
      
      const data = {
        name: values.name,
        start_time: values.start_time.format('HH:mm:ss'),
        end_time: values.end_time.format('HH:mm:ss'),
        is_active: values.is_active !== false,
        display_order: values.display_order || 0
      };

      if (editingWindow) {
        await axios.put(`${TimeWindowsUrl}/${editingWindow.id}`, data, headers);
        notification.success({
          message: 'Time Window Updated',
          description: 'Time window has been updated successfully',
          title: 'Success'
        });
      } else {
        await axios.post(TimeWindowsUrl, data, headers);
        notification.success({
          message: 'Time Window Created',
          description: 'Time window has been created successfully',
          title: 'Success'
        });
      }

      fetchTimeWindows();
      handleCloseForm();
    } catch (error) {
      notification.error({
        message: 'Save Error',
        description: 'Failed to save time window',
        title: 'Error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (windowId: number) => {
    Modal.confirm({
      title: 'Delete Time Window',
      content: 'Are you sure you want to delete this time window?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          const headers = getAuthToken() as any;
          await axios.delete(`${TimeWindowsUrl}/${windowId}`, headers);
          notification.success({
            message: 'Time Window Deleted',
            description: 'Time window has been deleted successfully',
            title: 'Success'
          });
          fetchTimeWindows();
        } catch (error) {
          notification.error({
            message: 'Delete Error',
            description: 'Failed to delete time window',
            title: 'Error'
          });
        }
      }
    });
  };

  return (
    <div>
      <Header currentUser={currentUser} />
      
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 500, margin: 0, marginBottom: '8px' }}>
                <ClockCircleOutlined style={{ marginRight: '12px', color: '#fa541c' }} />
                Time Windows
              </h1>
              <p style={{ color: '#666', margin: 0 }}>
                Configure arrival time windows for pickups and deliveries ({filteredTimeWindows.length} of {timeWindows.length})
              </p>
            </div>
            <Button 
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/settings')}
            >
              Back to Settings
            </Button>
          </div>
        </div>

        <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Input
            placeholder="Search by name..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, minWidth: '250px' }}
            allowClear
          />
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => handleOpenForm()}
          >
            Add Time Window
          </Button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>
        ) : filteredTimeWindows.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <ClockCircleOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
              <h3 style={{ marginBottom: '16px' }}>No time windows found</h3>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                {searchTerm ? 'No time windows match your search.' : 'Get started by adding your first time window.'}
              </p>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => handleOpenForm()}
              >
                Add Time Window
              </Button>
            </div>
          </Card>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: '20px' 
          }}>
            {filteredTimeWindows.map((window) => (
              <Card 
                key={window.id}
                hoverable
                style={{ 
                  borderRadius: '12px',
                  border: '1px solid #e8e8e8',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <ClockCircleOutlined style={{ fontSize: '20px', color: '#fa541c' }} />
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{window.name}</h3>
                    </div>
                    <Tag color={window.is_active ? 'green' : 'red'} style={{ fontSize: '11px' }}>
                      {window.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </Tag>
                  </div>
                </div>

                <div style={{ 
                  padding: '12px', 
                  backgroundColor: '#fff7e6', 
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#fa541c', textAlign: 'center' }}>
                    {window.time_display}
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  gap: '8px',
                  paddingTop: '12px',
                  borderTop: '1px solid #f0f0f0'
                }}>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleOpenForm(window)}
                    style={{ flex: 1 }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => window.id && handleDelete(window.id)}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Form Modal */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClockCircleOutlined />
              {editingWindow ? 'Edit Time Window' : 'Add Time Window'}
            </div>
          }
          open={isFormVisible}
          onCancel={handleCloseForm}
          footer={null}
          width={500}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            initialValues={{ is_active: true, display_order: 0 }}
          >
            <Form.Item
              label="Name"
              name="name"
              rules={[{ required: true, message: 'Please enter a name' }]}
            >
              <Input placeholder="e.g., Morning, Afternoon, Evening" />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Form.Item
                label="Start Time"
                name="start_time"
                rules={[{ required: true, message: 'Please select start time' }]}
              >
                <TimePicker 
                  format="HH:mm"
                  style={{ width: '100%' }}
                  placeholder="Select time"
                />
              </Form.Item>

              <Form.Item
                label="End Time"
                name="end_time"
                rules={[{ required: true, message: 'Please select end time' }]}
              >
                <TimePicker 
                  format="HH:mm"
                  style={{ width: '100%' }}
                  placeholder="Select time"
                />
              </Form.Item>
            </div>

            <Form.Item
              label="Display Order"
              name="display_order"
              help="Lower numbers appear first"
            >
              <InputNumber 
                style={{ width: '100%' }}
                min={0}
                placeholder="0"
              />
            </Form.Item>

            <Form.Item
              label="Active"
              name="is_active"
              valuePropName="checked"
            >
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <Button onClick={handleCloseForm}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                  {editingWindow ? 'Update' : 'Create'}
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
};

export default TimeWindows;

