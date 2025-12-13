import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Tag, notification, Modal } from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  CarOutlined,
  ColumnHeightOutlined,
  DashboardOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthToken, getMoveTypes } from '../utils/functions';
import { MoveTypesUrl } from '../utils/network';
import { MoveTypeProps } from '../utils/types';
import { fullname, role, email } from '../utils/data';
import Header from '../components/Header';
import AddMoveTypeForm from '../components/AddMoveTypeForm';

const MoveTypes: React.FC = () => {
  const navigate = useNavigate();
  const [moveTypes, setMoveTypes] = useState<MoveTypeProps[]>([]);
  const [filteredMoveTypes, setFilteredMoveTypes] = useState<MoveTypeProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [editingMoveType, setEditingMoveType] = useState<MoveTypeProps | null>(null);

  const currentUser = {
    role: localStorage.getItem(role) || 'user',
    fullname: localStorage.getItem(fullname) || 'User',
    email: localStorage.getItem(email) || ''
  };

  useEffect(() => {
    fetchMoveTypes();
  }, []);

  useEffect(() => {
    filterMoveTypes();
  }, [searchTerm, moveTypes]);

  const fetchMoveTypes = async () => {
    getMoveTypes(setMoveTypes, setLoading);
  };

  const filterMoveTypes = () => {
    let filtered = [...moveTypes];

    if (searchTerm) {
      filtered = filtered.filter(moveType =>
        moveType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (moveType.description && moveType.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredMoveTypes(filtered);
  };

  const handleDeleteMoveType = async (id: number) => {
    Modal.confirm({
      title: 'Delete Move Type',
      content: 'Are you sure you want to delete this move type?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          const headers = getAuthToken() as any;
          await axios.delete(`${MoveTypesUrl}/${id}`, headers);
          notification.success({
            message: 'Move Type Deleted',
            description: 'Move type has been deleted successfully',
            title: 'Success'
          });
          fetchMoveTypes();
        } catch (error) {
          notification.error({
            message: 'Delete Error',
            description: 'Failed to delete move type',
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
              <h1 style={{ fontSize: '28px', fontWeight: 500, margin: 0, marginBottom: '8px' }}>Move Types</h1>
              <p style={{ color: '#666', margin: 0 }}>
                Manage move types with cubic feet and weight ({filteredMoveTypes.length} of {moveTypes.length})
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
              setEditingMoveType(null);
              setIsAddFormVisible(true);
            }}
          >
            Add Move Type
          </Button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>
        ) : filteredMoveTypes.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <h3 style={{ marginBottom: '16px' }}>No move types found</h3>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                {searchTerm ? 'No move types match your current filters.' : 'Get started by adding your first move type.'}
              </p>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingMoveType(null);
                  setIsAddFormVisible(true);
                }}
              >
                Add Move Type
              </Button>
            </div>
          </Card>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '20px' 
          }}>
            {filteredMoveTypes.map((moveType) => (
              <Card
                key={moveType.id}
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
                      {moveType.name}
                    </h3>
                  </div>
                  <Tag color={moveType.is_active ? 'green' : 'red'} style={{ margin: 0, fontSize: '11px' }}>
                    {moveType.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Tag>
                </div>

                {moveType.description && (
                  <div style={{ 
                    marginBottom: '16px',
                    fontSize: '13px',
                    color: '#666',
                    lineHeight: '1.5'
                  }}>
                    {moveType.description.length > 100 
                      ? `${moveType.description.substring(0, 100)}...` 
                      : moveType.description}
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
                      {moveType.cubic_feet}
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
                      {moveType.weight}
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
                  <div>{moveType.created_by_name || 'System'}</div>
                  <div>
                    {new Date(moveType.created_at!).toLocaleDateString('en-US', {
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
                      setEditingMoveType(moveType);
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
                    onClick={() => moveType.id && handleDeleteMoveType(moveType.id)}
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

        {/* Add/Edit Move Type Form */}
        <AddMoveTypeForm
          isVisible={isAddFormVisible}
          onClose={() => {
            setIsAddFormVisible(false);
            setEditingMoveType(null);
          }}
          onSuccessCallBack={() => {
            setIsAddFormVisible(false);
            setEditingMoveType(null);
            fetchMoveTypes();
          }}
          editingMoveType={editingMoveType}
        />
      </div>
    </div>
  );
};

export default MoveTypes;

