import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Tag, notification, Modal } from 'antd';
import { 
  SearchOutlined, 
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
import { getAuthToken, getBranches } from '../utils/functions';
import { BranchesUrl } from '../utils/network';
import { BranchProps } from '../utils/types';
import { fullname, role, email } from '../utils/data';
import Header from '../components/Header';
import AddBranchForm from '../components/AddBranchForm';

const Branches: React.FC = () => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<BranchProps[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<BranchProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchProps | null>(null);

  const currentUser = {
    role: localStorage.getItem(role) || 'user',
    fullname: localStorage.getItem(fullname) || 'User',
    email: localStorage.getItem(email) || ''
  };

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
    <div>
      <Header currentUser={currentUser} />
      
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 500, margin: 0, marginBottom: '8px' }}>Branches</h1>
              <p style={{ color: '#666', margin: 0 }}>
                Manage branch locations and dispatch centers ({filteredBranches.length} of {branches.length})
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
            placeholder="Search by name, destination, or dispatch location..."
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
              setEditingBranch(null);
              setIsAddFormVisible(true);
            }}
          >
            Add Branch
          </Button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>
        ) : filteredBranches.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <h3 style={{ marginBottom: '16px' }}>No branches found</h3>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                {searchTerm ? 'No branches match your current filters.' : 'Get started by adding your first branch.'}
              </p>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingBranch(null);
                  setIsAddFormVisible(true);
                }}
              >
                Add Branch
              </Button>
            </div>
          </Card>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '20px' 
          }}>
            {filteredBranches.map((branch) => (
              <Card
                key={branch.id}
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
                      {branch.name}
                    </h3>
                  </div>
                  <Tag color={branch.is_active ? 'green' : 'red'} style={{ margin: 0, fontSize: '11px' }}>
                    {branch.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Tag>
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  {branch.destination && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#e6f7ff',
                      borderRadius: '8px',
                      border: '1px solid #91d5ff'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <EnvironmentOutlined style={{ fontSize: '12px', color: '#1890ff' }} />
                        <span style={{ fontSize: '11px', color: '#1890ff', fontWeight: 500 }}>Destination</span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#000' }}>
                        {branch.destination}
                      </div>
                    </div>
                  )}

                  <div style={{
                    padding: '12px',
                    backgroundColor: '#fff7e6',
                    borderRadius: '8px',
                    border: '1px solid #ffd591'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <SendOutlined style={{ fontSize: '12px', color: '#fa8c16' }} />
                      <span style={{ fontSize: '11px', color: '#fa8c16', fontWeight: 500 }}>Dispatch Location</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#000' }}>
                      {branch.dispatch_location}
                    </div>
                  </div>

                  {/* Sales Tax */}
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#f9f0ff',
                    borderRadius: '8px',
                    border: '1px solid #d3adf7'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#722ed1' }}>📊</span>
                      <span style={{ fontSize: '11px', color: '#722ed1', fontWeight: 500 }}>Sales Tax</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#000' }}>
                      {branch.sales_tax_percentage || 0}%
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
                  <div>{branch.created_by_name || 'System'}</div>
                  <div>
                    {new Date(branch.created_at!).toLocaleDateString('en-US', {
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
                      setEditingBranch(branch);
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
                    onClick={() => branch.id && handleDeleteBranch(branch.id)}
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
    </div>
  );
};

export default Branches;

