import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Tag, notification, Modal } from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  TagsOutlined,
  BgColorsOutlined,
  PercentageOutlined,
  InfoCircleOutlined,
  MoreOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthToken } from '../utils/functions';
import { ServiceTypesUrl } from '../utils/network';
import { ServiceTypeProps } from '../utils/types';
import { fullname, role, email } from '../utils/data';
import Header from '../components/Header';
import AddServiceTypeForm from '../components/AddServiceTypeForm';

const ServiceTypes: React.FC = () => {
  const navigate = useNavigate();
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeProps[]>([]);
  const [filteredServiceTypes, setFilteredServiceTypes] = useState<ServiceTypeProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [editingServiceType, setEditingServiceType] = useState<ServiceTypeProps | null>(null);

  const currentUser = {
    role: localStorage.getItem(role) || 'user',
    fullname: localStorage.getItem(fullname) || 'User',
    email: localStorage.getItem(email) || ''
  };

  useEffect(() => {
    fetchServiceTypes();
  }, []);

  useEffect(() => {
    filterServiceTypes();
  }, [searchTerm, serviceTypes]);

  const fetchServiceTypes = async () => {
    setLoading(true);
    try {
      const headers = getAuthToken() as any;
      const response = await axios.get(ServiceTypesUrl, headers);
      setServiceTypes(response.data);
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Failed to fetch service types',
        title: 'Error'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterServiceTypes = () => {
    let filtered = [...serviceTypes];

    if (searchTerm) {
      filtered = filtered.filter(st =>
        st.service_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredServiceTypes(filtered);
  };

  const handleDeleteServiceType = async (id: number) => {
    Modal.confirm({
      title: 'Delete Service Type',
      content: 'Are you sure you want to delete this service type?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          const headers = getAuthToken() as any;
          await axios.delete(`${ServiceTypesUrl}/${id}`, headers);
          notification.success({
            message: 'Service Type Deleted',
            description: 'Service type has been deleted successfully',
            title: 'Success'
          });
          fetchServiceTypes();
        } catch (error) {
          notification.error({
            message: 'Delete Error',
            description: 'Failed to delete service type',
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
              <h1 style={{ fontSize: '28px', fontWeight: 500, margin: 0, marginBottom: '8px' }}>Service Types</h1>
              <p style={{ color: '#666', margin: 0 }}>
                Manage service types and scaling factors ({filteredServiceTypes.length} of {serviceTypes.length})
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
            placeholder="Search by service type..."
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
              setEditingServiceType(null);
              setIsAddFormVisible(true);
            }}
          >
            Add Service Type
          </Button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>
        ) : filteredServiceTypes.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <h3 style={{ marginBottom: '16px' }}>No service types found</h3>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                {searchTerm ? 'No service types match your current filters.' : 'Get started by adding your first service type.'}
              </p>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingServiceType(null);
                  setIsAddFormVisible(true);
                }}
              >
                Add Service Type
              </Button>
            </div>
          </Card>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '20px' 
          }}>
            {filteredServiceTypes.map((st) => (
              <Card
                key={st.id}
                style={{ 
                  borderRadius: '12px',
                  overflow: 'hidden',
                  position: 'relative',
                  border: '1px solid rgba(0,0,0,0.1)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  transition: 'all 0.3s ease',
                  borderTop: `4px solid ${st.color || '#1890ff'}`
                }}
                bodyStyle={{ padding: '16px' }}
                hoverable
              >
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '16px', 
                    fontWeight: 600,
                    color: '#000',
                    marginBottom: '8px'
                  }}>
                    {st.service_type}
                  </h3>
                  <Tag color={st.enabled ? 'green' : 'red'} style={{ margin: 0, fontSize: '11px' }}>
                    {st.enabled ? 'ENABLED' : 'DISABLED'}
                  </Tag>
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#f6ffed',
                    borderRadius: '8px',
                    border: '1px solid #b7eb8f'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <PercentageOutlined style={{ fontSize: '12px', color: '#52c41a' }} />
                      <span style={{ fontSize: '11px', color: '#52c41a', fontWeight: 500 }}>Scaling Factor</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#000' }}>
                      {st.scaling_factor}
                    </div>
                  </div>

                  <div style={{
                    padding: '12px',
                    backgroundColor: st.color ? `${st.color}15` : '#f5f5f5',
                    borderRadius: '8px',
                    border: `1px solid ${st.color || '#d9d9d9'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <BgColorsOutlined style={{ fontSize: '12px', color: st.color || '#666' }} />
                      <span style={{ fontSize: '11px', color: st.color || '#666', fontWeight: 500 }}>Color</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#000' }}>
                      {st.color || 'None'}
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
                  <div>{st.created_by_name || 'System'}</div>
                  <div>
                    {new Date(st.created_at!).toLocaleDateString('en-US', {
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
                      setEditingServiceType(st);
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
                    onClick={() => st.id && handleDeleteServiceType(st.id)}
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

        {/* Add/Edit Service Type Form */}
        <AddServiceTypeForm
          isVisible={isAddFormVisible}
          onClose={() => {
            setIsAddFormVisible(false);
            setEditingServiceType(null);
          }}
          onSuccessCallBack={() => {
            setIsAddFormVisible(false);
            setEditingServiceType(null);
            fetchServiceTypes();
          }}
          editingServiceType={editingServiceType}
        />
      </div>
    </div>
  );
};

export default ServiceTypes;

