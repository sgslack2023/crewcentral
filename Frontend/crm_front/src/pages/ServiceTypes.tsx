import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, notification, Modal, Dropdown } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TagsOutlined,
  BgColorsOutlined,
  PercentageOutlined,
  InfoCircleOutlined,
  MoreOutlined,
  ArrowLeftOutlined,
  DownOutlined,
  UploadOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthToken, getCurrentUser, downloadExcelTemplate } from '../utils/functions';
import { ServiceTypesUrl } from '../utils/network';
import { ServiceTypeProps } from '../utils/types';
import AddServiceTypeForm from '../components/AddServiceTypeForm';
import { BlackButton, WhiteButton, SettingsCard, SearchBar, PageLoader, BulkUploadModal } from '../components';

interface ServiceTypesProps {
  hideHeader?: boolean;
}

const ServiceTypes: React.FC<ServiceTypesProps> = ({ hideHeader = false }) => {
  const navigate = useNavigate();
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeProps[]>([]);
  const [filteredServiceTypes, setFilteredServiceTypes] = useState<ServiceTypeProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [editingServiceType, setEditingServiceType] = useState<ServiceTypeProps | null>(null);
  const [isBulkUploadVisible, setIsBulkUploadVisible] = useState(false);

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

  const handleDownload = async () => {
    const success = await downloadExcelTemplate(ServiceTypesUrl, 'service_types_export.xlsx');
    if (!success) {
      notification.error({ message: 'Download Failed', description: 'Failed to download service types data', title: 'Error' });
    }
  };

  const bulkActionsMenuItems = {
    items: [
      {
        key: 'download',
        icon: <DownloadOutlined />,
        label: 'Download',
        onClick: handleDownload
      },
      {
        key: 'upload',
        icon: <UploadOutlined />,
        label: 'Upload',
        onClick: () => setIsBulkUploadVisible(true)
      }
    ]
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
    <div style={{
      padding: hideHeader ? '0' : '24px 32px',
      height: '100%',
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: '#f8f9fa'
    }}>
      {!hideHeader && (
        <div style={{ marginBottom: '16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1a1a2e' }}>Service Types</h1>
              <p style={{ color: '#8e8ea8', margin: '4px 0 0 0', fontSize: '13px' }}>
                Manage types of services you provide ({filteredServiceTypes.length} of {serviceTypes.length})
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
          placeholder="Search by service type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: '250px' }}
          allowClear
        />
        <Dropdown menu={bulkActionsMenuItems} trigger={['click']}>
          <Button style={{
            backgroundColor: '#ffffff',
            borderColor: '#d9d9d9',
            color: '#000000',
            fontWeight: 500,
            height: '32px',
            padding: '4px 15px',
            fontSize: '14px',
            borderRadius: '6px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          }}>
            Data Utilities <DownOutlined />
          </Button>
        </Dropdown>
        <BlackButton
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingServiceType(null);
            setIsAddFormVisible(true);
          }}
        >
          New Service Type
        </BlackButton>
      </div>

      {loading ? (
        <PageLoader text="Loading service types..." />
      ) : filteredServiceTypes.length === 0 ? (
        <Card style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h3 style={{ marginBottom: '16px' }}>No service types found</h3>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              {searchTerm ? 'No service types match your current filters.' : 'Get started by adding your first service type.'}
            </p>
            <BlackButton
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingServiceType(null);
                setIsAddFormVisible(true);
              }}
            >
              New Service Type
            </BlackButton>
          </div>
        </Card>
      ) : (
        <div style={{
          flex: 1,
          overflow: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px',
          alignContent: 'flex-start',
          padding: '8px 4px 24px 4px'
        }}>
          {filteredServiceTypes.map((st) => (
            <SettingsCard
              key={st.id}
              title={st.service_type}
              statusTag={{ label: st.enabled ? 'ENABLED' : 'DISABLED', color: st.enabled ? 'green' : 'red' }}
              fields={[
                {
                  label: 'Scaling Factor',
                  value: st.scaling_factor,
                  icon: <PercentageOutlined />
                },
                {
                  label: 'Color',
                  value: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: st.color || '#d1d5db',
                        border: '1px solid #e5e7eb'
                      }} />
                      {st.color || 'None'}
                    </span>
                  ),
                  icon: <BgColorsOutlined />
                }
              ]}
              footerLeft={st.created_by_name || 'System'}
              footerRight={new Date(st.created_at!).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
              actions={[
                {
                  icon: <EditOutlined />,
                  tooltip: 'Edit',
                  onClick: () => {
                    setEditingServiceType(st);
                    setIsAddFormVisible(true);
                  }
                },
                {
                  icon: <DeleteOutlined />,
                  tooltip: 'Delete',
                  danger: true,
                  onClick: () => st.id && handleDeleteServiceType(st.id)
                }
              ]}
              fieldColumns={2}
            />
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

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isVisible={isBulkUploadVisible}
        entityType="service_type"
        entityLabel="Service Types"
        apiUrl={ServiceTypesUrl}
        onClose={() => setIsBulkUploadVisible(false)}
        onSuccess={fetchServiceTypes}
      />
    </div>
  );
};

export default ServiceTypes;

