import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, notification, Modal } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
  EnvironmentOutlined,
  SendOutlined,
  InfoCircleOutlined,
  MoreOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthToken, getBranches, getCurrentUser } from '../utils/functions';
import { BranchesUrl } from '../utils/network';
import { BranchProps } from '../utils/types';
import { fullname, role, email } from '../utils/data';
import Header from '../components/Header';
import AddBranchForm from '../components/AddBranchForm';
import { BlackButton, WhiteButton, SearchBar, SettingsCard, PageLoader } from '../components';

interface BranchesProps {
  hideHeader?: boolean;
}

const Branches: React.FC<BranchesProps> = ({ hideHeader = false }) => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<BranchProps[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<BranchProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchProps | null>(null);

  const currentUser = getCurrentUser();

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    filterBranches();
  }, [searchTerm, branches]);

  const fetchBranches = async () => {
    getBranches(setBranches, setLoading);
  };

  const filterBranches = () => {
    let filtered = [...branches];

    if (searchTerm) {
      filtered = filtered.filter(branch =>
        branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (branch.destination && branch.destination.toLowerCase().includes(searchTerm.toLowerCase())) ||
        branch.dispatch_location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredBranches(filtered);
  };

  const handleDeleteBranch = async (branchId: number) => {
    Modal.confirm({
      title: 'Delete Branch',
      content: 'Are you sure you want to delete this branch?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          const headers = getAuthToken() as any;
          await axios.delete(`${BranchesUrl}/${branchId}`, headers);
          notification.success({
            message: 'Branch Deleted',
            description: 'Branch has been deleted successfully',
            title: 'Success'
          });
          fetchBranches();
        } catch (error) {
          notification.error({
            message: 'Delete Error',
            description: 'Failed to delete branch',
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
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1a1a2e' }}>Branches</h1>
              <p style={{ color: '#8e8ea8', margin: '4px 0 0 0', fontSize: '13px' }}>
                Manage branch locations and dispatch centers ({filteredBranches.length} of {branches.length})
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
          placeholder="Search by name, destination, or dispatch location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: '250px' }}
          allowClear
        />
        <BlackButton
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingBranch(null);
            setIsAddFormVisible(true);
          }}
        >
          New Branch
        </BlackButton>
      </div>

      {loading ? (
        <PageLoader text="Loading branches..." />
      ) : filteredBranches.length === 0 ? (
        <Card style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h3 style={{ marginBottom: '16px' }}>No branches found</h3>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              {searchTerm ? 'No branches match your current filters.' : 'Get started by adding your first branch.'}
            </p>
            <BlackButton
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingBranch(null);
                setIsAddFormVisible(true);
              }}
            >
              New Branch
            </BlackButton>
          </div>
        </Card>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '12px',
          flex: 1,
          overflow: 'auto',
          alignContent: 'flex-start'
        }}>
          {filteredBranches.map((branch) => (
            <SettingsCard
              key={branch.id}
              title={branch.name}
              statusTag={{ label: branch.is_active ? 'ACTIVE' : 'INACTIVE', color: branch.is_active ? 'green' : 'red' }}
              fields={[
                ...(branch.destination ? [{
                  label: 'Destination',
                  value: branch.destination,
                  icon: <EnvironmentOutlined />
                }] : []),
                {
                  label: 'Dispatch',
                  value: branch.dispatch_location,
                  icon: <SendOutlined />
                },
                {
                  label: 'Sales Tax',
                  value: `${branch.sales_tax_percentage || 0}%`,
                  icon: <InfoCircleOutlined />
                }
              ]}
              footerLeft={branch.created_by_name || 'System'}
              footerRight={new Date(branch.created_at!).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
              actions={[
                {
                  icon: <EditOutlined />,
                  tooltip: 'Edit',
                  onClick: () => {
                    setEditingBranch(branch);
                    setIsAddFormVisible(true);
                  }
                },
                {
                  icon: <DeleteOutlined />,
                  tooltip: 'Delete',
                  danger: true,
                  onClick: () => branch.id && handleDeleteBranch(branch.id)
                }
              ]}
              fieldColumns={2}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Branch Form */}
      <AddBranchForm
        isVisible={isAddFormVisible}
        onClose={() => {
          setIsAddFormVisible(false);
          setEditingBranch(null);
        }}
        onSuccessCallBack={() => {
          setIsAddFormVisible(false);
          setEditingBranch(null);
          fetchBranches();
        }}
        editingBranch={editingBranch}
      />
    </div>
  );
};

export default Branches;

