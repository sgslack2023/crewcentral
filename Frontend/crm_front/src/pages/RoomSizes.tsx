import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, notification, Modal } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
  ColumnHeightOutlined,
  DashboardOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthToken, getRoomSizes, getCurrentUser } from '../utils/functions';
import { RoomSizesUrl } from '../utils/network';
import { RoomSizeProps } from '../utils/types';
import { fullname, role, email } from '../utils/data';
import Header from '../components/Header';
import AddRoomSizeForm from '../components/AddRoomSizeForm';
import { BlackButton, WhiteButton, SearchBar, PageLoader, SettingsCard } from '../components';

interface RoomSizesProps {
  hideHeader?: boolean;
}

const RoomSizes: React.FC<RoomSizesProps> = ({ hideHeader = false }) => {
  const navigate = useNavigate();
  const [roomSizes, setRoomSizes] = useState<RoomSizeProps[]>([]);
  const [filteredRoomSizes, setFilteredRoomSizes] = useState<RoomSizeProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [editingRoomSize, setEditingRoomSize] = useState<RoomSizeProps | null>(null);

  const currentUser = getCurrentUser();

  useEffect(() => {
    fetchRoomSizes();
  }, []);

  useEffect(() => {
    filterRoomSizes();
  }, [searchTerm, roomSizes]);

  const fetchRoomSizes = async () => {
    getRoomSizes(setRoomSizes, setLoading);
  };

  const filterRoomSizes = () => {
    let filtered = [...roomSizes];

    if (searchTerm) {
      filtered = filtered.filter(roomSize =>
        roomSize.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (roomSize.description && roomSize.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredRoomSizes(filtered);
  };

  const handleDeleteRoomSize = async (id: number) => {
    Modal.confirm({
      title: 'Delete Room Size',
      content: 'Are you sure you want to delete this room size?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          const headers = getAuthToken() as any;
          await axios.delete(`${RoomSizesUrl}/${id}`, headers);
          notification.success({
            message: 'Room Size Deleted',
            description: 'Room size has been deleted successfully',
            title: 'Success'
          });
          fetchRoomSizes();
        } catch (error) {
          notification.error({
            message: 'Delete Error',
            description: 'Failed to delete room size',
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
              <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1a1a2e' }}>Room Sizes</h1>
              <p style={{ color: '#8e8ea8', margin: '4px 0 0 0', fontSize: '13px' }}>
                Manage room sizes with cubic feet and weight ({filteredRoomSizes.length} of {roomSizes.length})
              </p>
            </div>
            <WhiteButton
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/settings')}
            >
              Back
            </WhiteButton>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', flexShrink: 0 }}>
        <SearchBar
          placeholder="Search by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: '250px' }}
          allowClear
        />
        <BlackButton
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingRoomSize(null);
            setIsAddFormVisible(true);
          }}
        >
          New Room Size
        </BlackButton>
      </div>

      {loading ? (
        <PageLoader text="Loading room sizes..." />
      ) : filteredRoomSizes.length === 0 ? (
        <Card style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h3 style={{ marginBottom: '16px' }}>No room sizes found</h3>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              {searchTerm ? 'No room sizes match your current filters.' : 'Get started by adding your first room size.'}
            </p>
            <BlackButton
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingRoomSize(null);
                setIsAddFormVisible(true);
              }}
            >
              New Room Size
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
          {filteredRoomSizes.map((roomSize) => (
            <SettingsCard
              key={roomSize.id}
              title={roomSize.name}
              statusTag={{ label: roomSize.is_active ? 'ACTIVE' : 'INACTIVE', color: roomSize.is_active ? 'green' : 'red' }}
              description={roomSize.description ? (roomSize.description.length > 100 ? `${roomSize.description.substring(0, 100)}...` : roomSize.description) : undefined}
              fields={[
                { label: 'Cubic Feet', value: roomSize.cubic_feet, icon: <ColumnHeightOutlined /> },
                { label: 'Weight (lbs)', value: roomSize.weight, icon: <DashboardOutlined /> }
              ]}
              footerLeft={roomSize.created_by_name || 'System'}
              footerRight={new Date(roomSize.created_at!).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
              actions={[
                {
                  icon: <EditOutlined />,
                  tooltip: 'Edit',
                  onClick: () => {
                    setEditingRoomSize(roomSize);
                    setIsAddFormVisible(true);
                  }
                },
                {
                  icon: <DeleteOutlined />,
                  tooltip: 'Delete',
                  danger: true,
                  onClick: () => roomSize.id && handleDeleteRoomSize(roomSize.id)
                }
              ]}
              fieldColumns={2}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Room Size Form */}
      <AddRoomSizeForm
        isVisible={isAddFormVisible}
        onClose={() => {
          setIsAddFormVisible(false);
          setEditingRoomSize(null);
        }}
        onSuccessCallBack={() => {
          setIsAddFormVisible(false);
          setEditingRoomSize(null);
          fetchRoomSizes();
        }}
        editingRoomSize={editingRoomSize}
      />
    </div>
  );
};

export default RoomSizes;

