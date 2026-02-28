import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Tag, notification, Modal, Form, TimePicker, Switch, InputNumber } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  ArrowLeftOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthToken, getCurrentUser } from '../utils/functions';
import { BaseUrl } from '../utils/network';
import { fullname, role, email } from '../utils/data';
import Header from '../components/Header';
import dayjs from 'dayjs';
import { BlackButton, WhiteButton, SettingsCard, SearchBar, AddTimeWindowForm, PageLoader } from '../components';

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

interface TimeWindowsProps {
  hideHeader?: boolean;
}

const TimeWindows: React.FC<TimeWindowsProps> = ({ hideHeader = false }) => {
  const navigate = useNavigate();
  const [timeWindows, setTimeWindows] = useState<TimeWindowProps[]>([]);
  const [filteredTimeWindows, setFilteredTimeWindows] = useState<TimeWindowProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingWindow, setEditingWindow] = useState<TimeWindowProps | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const currentUser = getCurrentUser();

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
    } else {
      setEditingWindow(null);
    }
    setIsFormVisible(true);
  };

  const handleCloseForm = () => {
    setIsFormVisible(false);
    setEditingWindow(null);
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
    <div style={{
      padding: hideHeader ? '0' : '8px 16px 24px 16px',
      height: '100%',
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {!hideHeader && (
        <div style={{ marginBottom: '16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1a1a2e' }}>
                Time Windows
              </h1>
              <p style={{ color: '#8e8ea8', margin: '4px 0 0 0', fontSize: '13px' }}>
                Configure arrival time windows for pickups and deliveries ({filteredTimeWindows.length} of {timeWindows.length})
              </p>
            </div>
            <WhiteButton
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/settings')}
            >
              Back to Settings
            </WhiteButton>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', flexShrink: 0 }}>
        <SearchBar
          placeholder="Search by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: '250px' }}
          allowClear
        />
        <BlackButton
          icon={<PlusOutlined />}
          onClick={() => handleOpenForm()}
        >
          New Time Window
        </BlackButton>
      </div>

      {loading ? (
        <PageLoader text="Loading time windows..." />
      ) : filteredTimeWindows.length === 0 ? (
        <Card style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <ClockCircleOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
            <h3 style={{ marginBottom: '16px' }}>No time windows found</h3>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              {searchTerm ? 'No time windows match your search.' : 'Get started by adding your first time window.'}
            </p>
            <BlackButton
              icon={<PlusOutlined />}
              onClick={() => handleOpenForm()}
            >
              New Time Window
            </BlackButton>
          </div>
        </Card>
      ) : (
        <div style={{
          flex: 1,
          overflow: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '12px',
          alignContent: 'flex-start'
        }}>
          {filteredTimeWindows.map((window) => (
            <SettingsCard
              key={window.id}
              title={window.name}
              statusTag={{ label: window.is_active ? 'ACTIVE' : 'INACTIVE', color: window.is_active ? 'green' : 'red' }}
              fields={[
                { label: 'Window', value: window.time_display || '-', icon: <ClockCircleOutlined /> }
              ]}
              footerLeft={window.created_by_name || 'System'}
              footerRight={window.created_at ? new Date(window.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              }) : undefined}
              actions={[
                { icon: <EditOutlined />, tooltip: 'Edit', onClick: () => handleOpenForm(window) },
                { icon: <DeleteOutlined />, tooltip: 'Delete', danger: true, onClick: () => window.id && handleDelete(window.id) }
              ]}
              fieldColumns={1}
            />
          ))}
        </div>
      )}
      <AddTimeWindowForm
        isVisible={isFormVisible}
        onClose={handleCloseForm}
        onSuccessCallBack={fetchTimeWindows}
        editingWindow={editingWindow}
      />
    </div >
  );
};

export default TimeWindows;
