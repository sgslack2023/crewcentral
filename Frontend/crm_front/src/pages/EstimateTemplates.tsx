import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, notification, Modal, Dropdown, Space } from 'antd';
import {
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
import { getAuthToken, getEstimateTemplates, getCurrentUser } from '../utils/functions';
import { EstimateTemplatesUrl, ChargeCategoriesUrl, ChargeDefinitionsUrl } from '../utils/network';
import { EstimateTemplateProps } from '../utils/types';
import { fullname, role, email } from '../utils/data';
import Header from '../components/Header';
import AddEstimateTemplateForm from '../components/AddEstimateTemplateForm';
import AddChargeCategoryForm from '../components/AddChargeCategoryForm';
import AddChargeDefinitionForm from '../components/AddChargeDefinitionForm';
import { BlackButton, WhiteButton, SearchBar, PageLoader, SettingsCard } from '../components';

interface EstimateTemplatesProps {
  hideHeader?: boolean;
}

const EstimateTemplates: React.FC<EstimateTemplatesProps> = ({ hideHeader = false }) => {
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

  const currentUser = getCurrentUser();

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
    <div style={{ padding: hideHeader ? '0' : '8px 16px 24px 16px' }}>
      {!hideHeader && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1a1a2e' }}>Estimate Templates</h1>
              <p style={{ color: '#8e8ea8', margin: '4px 0 0 0', fontSize: '13px' }}>
                Manage estimate templates and charge definitions ({filteredTemplates.length} of {templates.length})
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

      <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <SearchBar
          placeholder="Search by name, description, or move type..."
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
        <BlackButton
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingTemplate(null);
            setIsAddFormVisible(true);
          }}
        >
          New Template
        </BlackButton>
      </div>

      {loading ? (
        <PageLoader text="Loading templates..." />
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h3 style={{ marginBottom: '16px' }}>No templates found</h3>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              {searchTerm ? 'No templates match your current filters.' : 'Get started by adding your first estimate template.'}
            </p>
            <BlackButton
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingTemplate(null);
                setIsAddFormVisible(true);
              }}
            >
              New Template
            </BlackButton>
          </div>
        </Card>
      ) : (
        <div style={{
          flex: 1,
          overflow: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '12px',
          alignContent: 'flex-start'
        }}>
          {filteredTemplates.map((template) => (
            <SettingsCard
              key={template.id}
              title={template.name}
              statusTag={{ label: template.is_active ? 'ACTIVE' : 'INACTIVE', color: template.is_active ? 'green' : 'red' }}
              tags={template.service_type_name ? [{ label: template.service_type_name, color: 'blue' }] : []}
              description={template.description ? (template.description.length > 100 ? `${template.description.substring(0, 100)}...` : template.description) : undefined}
              fields={[
                {
                  label: 'Line Items',
                  value: `${template.items_count || 0} charges`,
                  icon: <FileTextOutlined />
                }
              ]}
              footerLeft={template.created_by_name || 'System'}
              footerRight={new Date(template.created_at!).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
              actionNode={(
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
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      background: '#ffffff'
                    }}
                  />
                </Dropdown>
              )}
              fieldColumns={1}
            />
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
  );
};

export default EstimateTemplates;
