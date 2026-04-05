import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, notification, Modal, Dropdown } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CarOutlined,
  ColumnHeightOutlined,
  DashboardOutlined,
  ArrowLeftOutlined,
  DownOutlined,
  UploadOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthToken, getMoveTypes, getCurrentUser, downloadExcelTemplate } from '../utils/functions';
import { MoveTypesUrl } from '../utils/network';
import { MoveTypeProps } from '../utils/types';
import { fullname, role, email } from '../utils/data';
import Header from '../components/Header';
import AddMoveTypeForm from '../components/AddMoveTypeForm';
import { BlackButton, WhiteButton, SettingsCard, SearchBar, PageLoader, BulkUploadModal } from '../components';

interface MoveTypesProps {
  hideHeader?: boolean;
}

const MoveTypes: React.FC<MoveTypesProps> = ({ hideHeader = false }) => {
  const navigate = useNavigate();
  const [moveTypes, setMoveTypes] = useState<MoveTypeProps[]>([]);
  const [filteredMoveTypes, setFilteredMoveTypes] = useState<MoveTypeProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [editingMoveType, setEditingMoveType] = useState<MoveTypeProps | null>(null);
  const [isBulkUploadVisible, setIsBulkUploadVisible] = useState(false);

  const currentUser = getCurrentUser();

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

  const handleDownload = async () => {
    const success = await downloadExcelTemplate(MoveTypesUrl, 'move_types_export.xlsx');
    if (!success) {
      notification.error({ message: 'Download Failed', description: 'Failed to download move types data', title: 'Error' });
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
              <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1a1a2e' }}>Move Types</h1>
              <p style={{ color: '#8e8ea8', margin: '4px 0 0 0', fontSize: '13px' }}>
                Manage move types with cubic feet and weight ({filteredMoveTypes.length} of {moveTypes.length})
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
            setEditingMoveType(null);
            setIsAddFormVisible(true);
          }}
        >
          New Move Type
        </BlackButton>
      </div>

      {loading ? (
        <PageLoader text="Loading move types..." />
      ) : filteredMoveTypes.length === 0 ? (
        <Card style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h3 style={{ marginBottom: '16px' }}>No move types found</h3>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              {searchTerm ? 'No move types match your current filters.' : 'Get started by adding your first move type.'}
            </p>
            <BlackButton
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingMoveType(null);
                setIsAddFormVisible(true);
              }}
            >
              New Move Type
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
          {filteredMoveTypes.map((moveType) => (
            <SettingsCard
              key={moveType.id}
              title={moveType.name}
              statusTag={{ label: moveType.is_active ? 'ACTIVE' : 'INACTIVE', color: moveType.is_active ? 'green' : 'red' }}
              description={moveType.description ? (moveType.description.length > 100 ? `${moveType.description.substring(0, 100)}...` : moveType.description) : undefined}
              fields={[
                { label: 'Cubic Feet', value: moveType.cubic_feet, icon: <ColumnHeightOutlined /> },
                { label: 'Weight (lbs)', value: moveType.weight, icon: <DashboardOutlined /> }
              ]}
              footerLeft={moveType.created_by_name || 'System'}
              footerRight={new Date(moveType.created_at!).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
              actions={[
                {
                  icon: <EditOutlined />,
                  tooltip: 'Edit',
                  onClick: () => {
                    setEditingMoveType(moveType);
                    setIsAddFormVisible(true);
                  }
                },
                {
                  icon: <DeleteOutlined />,
                  tooltip: 'Delete',
                  danger: true,
                  onClick: () => moveType.id && handleDeleteMoveType(moveType.id)
                }
              ]}
              fieldColumns={2}
            />
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

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isVisible={isBulkUploadVisible}
        entityType="move_type"
        entityLabel="Move Types"
        apiUrl={MoveTypesUrl}
        onClose={() => setIsBulkUploadVisible(false)}
        onSuccess={fetchMoveTypes}
      />
    </div>
  );
};

export default MoveTypes;

