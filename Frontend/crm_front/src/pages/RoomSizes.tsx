import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Tag, notification, Modal } from 'antd';
import { 
  SearchOutlined, 
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
import { getAuthToken, getRoomSizes } from '../utils/functions';
import { RoomSizesUrl } from '../utils/network';
import { RoomSizeProps } from '../utils/types';
import { fullname, role, email } from '../utils/data';
import Header from '../components/Header';
import AddRoomSizeForm from '../components/AddRoomSizeForm';

const RoomSizes: React.FC = () => {
  const navigate = useNavigate();
  const [roomSizes, setRoomSizes] = useState<RoomSizeProps[]>([]);
  const [filteredRoomSizes, setFilteredRoomSizes] = useState<RoomSizeProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [editingRoomSize, setEditingRoomSize] = useState<RoomSizeProps | null>(null);

  const currentUser = {
    role: localStorage.getItem(role) || 'user',
    fullname: localStorage.getItem(fullname) || 'User',
    email: localStorage.getItem(email) || ''
  };

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
    <div>
      <Header currentUser={currentUser} />
      
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 500, margin: 0, marginBottom: '8px' }}>Room Sizes</h1>
              <p style={{ color: '#666', margin: 0 }}>
                Manage room sizes with cubic feet and weight ({filteredRoomSizes.length} of {roomSizes.length})
              </p>
            </div>
            <Button 
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/settings')}
            >
              Back
            </Button>
          </div>
        </div>

        <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Input
            placeholder="Search by name or description..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, minWidth: '250px' }}
            allowClear
          />
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingRoomSize(null);
              setIsAddFormVisible(true);
            }}
          >
            Add Room Size
          </Button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>
        ) : filteredRoomSizes.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <h3 style={{ marginBottom: '16px' }}>No room sizes found</h3>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                {searchTerm ? 'No room sizes match your current filters.' : 'Get started by adding your first room size.'}
              </p>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingRoomSize(null);
                  setIsAddFormVisible(true);
                }}
              >
                Add Room Size
              </Button>
            </div>
          </Card>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '20px' 
          }}>
            {filteredRoomSizes.map((roomSize) => (
              <Card
                key={roomSize.id}
                style={{ 
                  borderRadius: '12px',
                  overflow: 'hidden',
                  position: 'relative',
                  border: '1px solid rgba(0,0,0,0.1)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  transition: 'all 0.3s ease'
                }}
                bodyStyle={{ padding: '16px' }}
                hoverable
              >
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: '16px', 
                      fontWeight: 600,
                      color: '#000',
                      marginBottom: '8px'
                    }}>
                      {roomSize.name}
                    </h3>
                  </div>
                  <Tag color={roomSize.is_active ? 'green' : 'red'} style={{ margin: 0, fontSize: '11px' }}>
                    {roomSize.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Tag>
                </div>

                {roomSize.description && (
                  <div style={{ 
                    marginBottom: '16px',
                    fontSize: '13px',
                    color: '#666',
                    lineHeight: '1.5'
                  }}>
                    {roomSize.description.length > 100 
                      ? `${roomSize.description.substring(0, 100)}...` 
                      : roomSize.description}
                  </div>
                )}

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#e6f7ff',
                    borderRadius: '8px',
                    border: '1px solid #91d5ff'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <ColumnHeightOutlined style={{ fontSize: '12px', color: '#1890ff' }} />
                      <span style={{ fontSize: '11px', color: '#1890ff', fontWeight: 500 }}>Cubic Feet</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#000' }}>
                      {roomSize.cubic_feet}
                    </div>
                  </div>

                  <div style={{
                    padding: '12px',
                    backgroundColor: '#fff7e6',
                    borderRadius: '8px',
                    border: '1px solid #ffd591'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <DashboardOutlined style={{ fontSize: '12px', color: '#fa8c16' }} />
                      <span style={{ fontSize: '11px', color: '#fa8c16', fontWeight: 500 }}>Weight (lbs)</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#000' }}>
                      {roomSize.weight}
                    </div>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  color: '#999',
                  paddingTop: '12px',
                  borderTop: '1px solid #f0f0f0'
                }}>
                  <div>{roomSize.created_by_name || 'System'}</div>
                  <div>
                    {new Date(roomSize.created_at!).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>

                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  display: 'flex',
                  gap: '4px'
                }}>
                  <Button
                    size="small"
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditingRoomSize(roomSize);
                      setIsAddFormVisible(true);
                    }}
                    style={{ 
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Button
                    size="small"
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => roomSize.id && handleDeleteRoomSize(roomSize.id)}
                    danger
                    style={{ 
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                    }}
                  />
                </div>
              </Card>
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
    </div>
  );
};

export default RoomSizes;

