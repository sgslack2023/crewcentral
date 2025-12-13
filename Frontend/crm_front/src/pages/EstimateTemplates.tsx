import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Tag, notification, Modal, Dropdown, Space } from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  FileTextOutlined,
  CarOutlined,
  TagsOutlined,
  DollarOutlined,
  ArrowLeftOutlined,
  MoreOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthToken, getEstimateTemplates } from '../utils/functions';
import { EstimateTemplatesUrl, ChargeCategoriesUrl, ChargeDefinitionsUrl } from '../utils/network';
import { EstimateTemplateProps } from '../utils/types';
import { fullname, role, email } from '../utils/data';
import Header from '../components/Header';
import AddEstimateTemplateForm from '../components/AddEstimateTemplateForm';
import AddChargeCategoryForm from '../components/AddChargeCategoryForm';
import AddChargeDefinitionForm from '../components/AddChargeDefinitionForm';

const EstimateTemplates: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<EstimateTemplateProps[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<EstimateTemplateProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EstimateTemplateProps | null>(null);
  
  // Charge management modals
  const [isCategoryFormVisible, setIsCategoryFormVisible] = useState(false);
  const [isDefinitionFormVisible, setIsDefinitionFormVisible] = useState(false);

  const currentUser = {
    role: localStorage.getItem(role) || 'user',
    fullname: localStorage.getItem(fullname) || 'User',
    email: localStorage.getItem(email) || ''
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [searchTerm, templates]);

  const fetchTemplates = async () => {
    getEstimateTemplates(setTemplates, setLoading);
  };

  const filterTemplates = () => {
    let filtered = [...templates];

    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (template.service_type_name && template.service_type_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleDeleteTemplate = async (id: number) => {
    Modal.confirm({
      title: 'Delete Template',
      content: 'Are you sure you want to delete this estimate template?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          const headers = getAuthToken() as any;
          await axios.delete(`${EstimateTemplatesUrl}/${id}`, headers);
          notification.success({
            message: 'Template Deleted',
            description: 'Estimate template has been deleted successfully',
            title: 'Success'
          });
          fetchTemplates();
        } catch (error) {
          notification.error({
            message: 'Delete Error',
            description: 'Failed to delete template',
            title: 'Error'
          });
        }
      }
    });
  };

  const handleDuplicateTemplate = async (template: EstimateTemplateProps) => {
    try {
      const headers = getAuthToken() as any;
      await axios.post(`${EstimateTemplatesUrl}/${template.id}/duplicate`, {
        name: `${template.name} (Copy)`
      }, headers);
      notification.success({
        message: 'Template Duplicated',
        description: 'Template has been duplicated successfully',
        title: 'Success'
      });
      fetchTemplates();
    } catch (error) {
      notification.error({
        message: 'Duplicate Error',
        description: 'Failed to duplicate template',
        title: 'Error'
      });
    }
  };

  const managementMenuItems = [
    {
      key: 'categories',
      label: 'Charge Categories',
      icon: <TagsOutlined />,
      onClick: () => setIsCategoryFormVisible(true)
    },
    {
      key: 'definitions',
      label: 'Charge Definitions',
      icon: <DollarOutlined />,
      onClick: () => setIsDefinitionFormVisible(true)
    }
  ];

  return (
    <div>
      <Header currentUser={currentUser} />
      
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 500, margin: 0, marginBottom: '8px' }}>Estimate Templates</h1>
              <p style={{ color: '#666', margin: 0 }}>
                Manage estimate templates and charge definitions ({filteredTemplates.length} of {templates.length})
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
            placeholder="Search by name, description, or move type..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, minWidth: '250px' }}
            allowClear
          />
          <Dropdown
            menu={{ items: managementMenuItems }}
            placement="bottomRight"
          >
            <Button icon={<SettingOutlined />}>
              Manage Charges
            </Button>
          </Dropdown>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingTemplate(null);
              setIsAddFormVisible(true);
            }}
          >
            Add Template
          </Button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <h3 style={{ marginBottom: '16px' }}>No templates found</h3>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                {searchTerm ? 'No templates match your current filters.' : 'Get started by adding your first estimate template.'}
              </p>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingTemplate(null);
                  setIsAddFormVisible(true);
                }}
              >
                Add Template
              </Button>
            </div>
          </Card>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: '20px' 
          }}>
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
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
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '16px', 
                    fontWeight: 600,
                    color: '#000',
                    marginBottom: '8px'
                  }}>
                    {template.name}
                  </h3>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <Tag color={template.is_active ? 'green' : 'red'} style={{ margin: 0, fontSize: '11px' }}>
                      {template.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </Tag>
                    {template.service_type_name && (
                      <Tag color="blue" style={{ margin: 0, fontSize: '11px' }}>
                        {template.service_type_name}
                      </Tag>
                    )}
                  </div>
                </div>

                {template.description && (
                  <div style={{ 
                    marginBottom: '16px',
                    fontSize: '13px',
                    color: '#666',
                    lineHeight: '1.5'
                  }}>
                    {template.description.length > 100 
                      ? `${template.description.substring(0, 100)}...` 
                      : template.description}
                  </div>
                )}

                <div style={{
                  padding: '12px',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '8px',
                  border: '1px solid #bae6fd',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <FileTextOutlined style={{ fontSize: '12px', color: '#0284c7' }} />
                    <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 500 }}>Line Items</span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#000' }}>
                    {template.items_count || 0} charges configured
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
                  <div>{template.created_by_name || 'System'}</div>
                  <div>
                    {new Date(template.created_at!).toLocaleDateString('en-US', {
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
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: 'manage-items',
                          label: 'Manage Line Items',
                          icon: <SettingOutlined />,
                          onClick: () => navigate(`/template-line-items/${template.id}`)
                        },
                        {
                          key: 'edit',
                          label: 'Edit Template',
                          icon: <EditOutlined />,
                          onClick: () => {
                            setEditingTemplate(template);
                            setIsAddFormVisible(true);
                          }
                        },
                        {
                          key: 'duplicate',
                          label: 'Duplicate',
                          icon: <FileTextOutlined />,
                          onClick: () => handleDuplicateTemplate(template)
                        },
                        {
                          type: 'divider'
                        },
                        {
                          key: 'delete',
                          label: 'Delete',
                          icon: <DeleteOutlined />,
                          danger: true,
                          onClick: () => template.id && handleDeleteTemplate(template.id)
                        }
                      ]
                    }}
                    trigger={['click']}
                  >
                    <Button
                      size="small"
                      type="text"
                      icon={<MoreOutlined />}
                      style={{ 
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                      }}
                    />
                  </Dropdown>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Template Form */}
        <AddEstimateTemplateForm
          isVisible={isAddFormVisible}
          onClose={() => {
            setIsAddFormVisible(false);
            setEditingTemplate(null);
          }}
          onSuccessCallBack={() => {
            setIsAddFormVisible(false);
            setEditingTemplate(null);
            fetchTemplates();
          }}
          editingTemplate={editingTemplate}
        />

        {/* Charge Category Form */}
        <AddChargeCategoryForm
          isVisible={isCategoryFormVisible}
          onClose={() => setIsCategoryFormVisible(false)}
          onSuccessCallBack={() => setIsCategoryFormVisible(false)}
        />

        {/* Charge Definition Form */}
        <AddChargeDefinitionForm
          isVisible={isDefinitionFormVisible}
          onClose={() => setIsDefinitionFormVisible(false)}
          onSuccessCallBack={() => setIsDefinitionFormVisible(false)}
        />
      </div>
    </div>
  );
};

export default EstimateTemplates;
