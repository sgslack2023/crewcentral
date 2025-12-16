import React, { useState, useEffect } from 'react';
import { Card, Input, Select, Button, Badge, Tag, notification, Modal, Space } from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  TagOutlined,
  TeamOutlined,
  InfoCircleOutlined,
  MoreOutlined,
  CalculatorOutlined,
  ClockCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthToken } from '../utils/functions';
import { CustomersUrl } from '../utils/network';
import { CustomerProps } from '../utils/types';
import { fullname, role, email } from '../utils/data';
import Header from '../components/Header';
import AddCustomerForm from '../components/AddCustomerForm';
import CreateEstimateForm from '../components/CreateEstimateForm';

const { Option } = Select;

const SOURCE_OPTIONS = [
  { value: 'moveit', label: 'Moveit' },
  { value: 'mymovingloads', label: 'MyMovingLoads' },
  { value: 'moving24', label: 'Moving24' },
  { value: 'baltic_website', label: 'Baltic Website' },
  { value: 'n1m_website', label: 'N1M Website' },
  { value: 'google', label: 'Google' },
  { value: 'referral', label: 'Referral' },
  { value: 'other', label: 'Other' },
];

const STAGE_OPTIONS = [
  { value: 'new_lead', label: 'New Lead', color: 'orange' },
  { value: 'in_progress', label: 'In Progress', color: 'blue' },
  { value: 'opportunity', label: 'Opportunity', color: 'cyan' },
  { value: 'booked', label: 'Booked', color: 'purple' },
  { value: 'closed', label: 'Closed', color: 'green' },
  { value: 'bad_lead', label: 'Bad Lead', color: 'volcano' },
  { value: 'lost', label: 'Lost', color: 'red' },
];

const Customers: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerProps[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerProps | null>(null);
  const [isCreateEstimateVisible, setIsCreateEstimateVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProps | null>(null);

  // Get current user info from localStorage
  const currentUser = {
    role: localStorage.getItem(role) || 'user',
    fullname: localStorage.getItem(fullname) || 'User',
    email: localStorage.getItem(email) || ''
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchTerm, selectedStage, selectedSource, customers]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const headers = getAuthToken() as any;
      const response = await axios.get(CustomersUrl, headers);
      setCustomers(response.data);
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Failed to fetch customers',
        title: 'Error'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = [...customers];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.company && customer.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.phone && customer.phone.includes(searchTerm))
      );
    }

    // Filter by stage
    if (selectedStage !== 'all') {
      filtered = filtered.filter(customer => customer.stage === selectedStage);
    }

    // Filter by source
    if (selectedSource !== 'all') {
      filtered = filtered.filter(customer => customer.source === selectedSource);
    }

    setFilteredCustomers(filtered);
  };

  const handleDeleteCustomer = async (customerId: number) => {
    Modal.confirm({
      title: 'Delete Customer',
      content: 'Are you sure you want to delete this customer?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          const headers = getAuthToken() as any;
          await axios.delete(`${CustomersUrl}/${customerId}`, headers);
          notification.success({
            message: 'Customer Deleted',
            description: 'Customer has been deleted successfully',
            title: 'Success'
          });
          fetchCustomers();
        } catch (error) {
          notification.error({
            message: 'Delete Error',
            description: 'Failed to delete customer',
            title: 'Error'
          });
        }
      }
    });
  };

  const getStageColor = (stage: string) => {
    const option = STAGE_OPTIONS.find(opt => opt.value === stage);
    return option?.color || 'default';
  };

  const getSourceLabel = (source: string) => {
    const option = SOURCE_OPTIONS.find(opt => opt.value === source);
    return option?.label || source;
  };

  const handleEstimateCreated = (estimateId: number) => {
    notification.success({
      message: 'Estimate Created',
      description: `Estimate #${estimateId} has been created. Opening editor to review...`,
      title: 'Success'
    });
    // Navigate to estimate editor to review and modify
    setTimeout(() => {
      navigate(`/estimate-editor/${estimateId}`);
    }, 1000);
  };

  return (
    <div>
      {/* Header */}
      <Header currentUser={currentUser} />
      
      <div style={{ padding: '24px' }}>
        {/* Page Title */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 500, margin: 0, marginBottom: '8px' }}>Customers</h1>
              <p style={{ color: '#666', margin: 0 }}>
                Manage your customers and leads ({filteredCustomers.length} of {customers.length})
              </p>
            </div>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingCustomer(null);
                setIsAddFormVisible(true);
              }}
            >
              Add Customer
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Input
            placeholder="Search by name, email, company, or phone..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, minWidth: '250px' }}
            allowClear
          />
          <Select
            value={selectedStage}
            onChange={setSelectedStage}
            style={{ width: 180 }}
            placeholder="Filter by Stage"
          >
            <Option value="all">All Stages</Option>
            {STAGE_OPTIONS.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
          <Select
            value={selectedSource}
            onChange={setSelectedSource}
            style={{ width: 180 }}
            placeholder="Filter by Source"
          >
            <Option value="all">All Sources</Option>
            {SOURCE_OPTIONS.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </div>

        {/* Customer Cards Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>
        ) : filteredCustomers.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <h3 style={{ marginBottom: '16px' }}>No customers found</h3>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                {searchTerm || selectedStage !== 'all' || selectedSource !== 'all'
                  ? 'No customers match your current filters.'
                  : 'Get started by adding your first customer.'}
              </p>
              <Button type="primary" icon={<PlusOutlined />}>
                Add Customer
              </Button>
            </div>
          </Card>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '20px' 
          }}>
            {filteredCustomers.map((customer) => {
              const stageOption = STAGE_OPTIONS.find(opt => opt.value === customer.stage);
              const stageColor = stageOption?.color || 'default';
              
              return (
                <Card
                  key={customer.id}
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
                  {/* Header with Title */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{
                          margin: 0,
                          fontSize: '16px',
                          fontWeight: 600,
                          color: '#000',
                          marginBottom: '4px'
                        }}>
                          {customer.full_name}
                        </h3>
                        {customer.job_number && (
                          <div style={{
                            fontSize: '12px',
                            color: '#666',
                            fontWeight: 500,
                            marginBottom: '8px'
                          }}>
                            Job #{customer.job_number}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <Button
                          type="text"
                          size="small"
                          icon={<InfoCircleOutlined />}
                          style={{ padding: '4px' }}
                        />
                        <Button
                          type="text"
                          size="small"
                          icon={<MoreOutlined />}
                          style={{ padding: '4px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Could add dropdown menu here
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <Tag color={stageColor} style={{ margin: 0, fontSize: '11px' }}>
                        {customer.stage.toUpperCase()}
                      </Tag>
                      <Tag color="blue" style={{ margin: 0, fontSize: '11px' }}>
                        {getSourceLabel(customer.source)}
                      </Tag>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ 
                      fontSize: '12px', 
                      color: '#999', 
                      margin: '0 0 8px 0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Contact Information
                    </p>
                    <div style={{ fontSize: '13px', color: '#666', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {customer.email && <div>{customer.email}</div>}
                      {customer.phone && <div>{customer.phone}</div>}
                    </div>
                  </div>

                  {/* Info Grid - 2x2 colored boxes */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    marginBottom: '16px'
                  }}>
                    {/* Company */}
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#e6f7ff',
                      borderRadius: '8px',
                      border: '1px solid #91d5ff'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <TeamOutlined style={{ fontSize: '12px', color: '#1890ff' }} />
                        <span style={{ fontSize: '11px', color: '#1890ff', fontWeight: 500 }}>Company</span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#000' }}>
                        {customer.company || 'N/A'}
                      </div>
                    </div>

                    {/* Stage */}
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#fff7e6',
                      borderRadius: '8px',
                      border: '1px solid #ffd591'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <TagOutlined style={{ fontSize: '12px', color: '#fa8c16' }} />
                        <span style={{ fontSize: '11px', color: '#fa8c16', fontWeight: 500 }}>Stage</span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#000' }}>
                        {customer.stage.charAt(0).toUpperCase() + customer.stage.slice(1)}
                      </div>
                    </div>

                    {/* Location */}
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#e6f7ff',
                      borderRadius: '8px',
                      border: '1px solid #91d5ff'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <HomeOutlined style={{ fontSize: '12px', color: '#1890ff' }} />
                        <span style={{ fontSize: '11px', color: '#1890ff', fontWeight: 500 }}>Location</span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#000' }}>
                        {customer.city || customer.state 
                          ? [customer.city, customer.state].filter(Boolean).join(', ')
                          : 'N/A'}
                      </div>
                    </div>

                    {/* Assigned To */}
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#f6ffed',
                      borderRadius: '8px',
                      border: '1px solid #b7eb8f'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <UserOutlined style={{ fontSize: '12px', color: '#52c41a' }} />
                        <span style={{ fontSize: '11px', color: '#52c41a', fontWeight: 500 }}>Assigned To</span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#000' }}>
                        {customer.assigned_to_name || 'Unassigned'}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    color: '#999',
                    paddingTop: '12px',
                    borderTop: '1px solid #f0f0f0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <UserOutlined style={{ fontSize: '10px' }} />
                      <span>{customer.created_by_name || 'System'}</span>
                    </div>
                    <div>
                      {new Date(customer.created_at!).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </div>

                  {/* Action Buttons Overlay */}
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
                      icon={<ClockCircleOutlined />}
                      onClick={() => navigate(`/customer-timeline/${customer.id}`)}
                      style={{ 
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                        color: '#722ed1'
                      }}
                      title="Activity Timeline"
                    />
                    <Button
                      size="small"
                      type="text"
                      icon={<CalculatorOutlined />}
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setIsCreateEstimateVisible(true);
                      }}
                      style={{ 
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                        color: '#52c41a'
                      }}
                      title="Create Estimate"
                    />
                    <Button
                      size="small"
                      type="text"
                      icon={<FileTextOutlined />}
                      onClick={() => navigate(`/estimates?customer=${customer.id}`)}
                      style={{ 
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                        color: '#1890ff'
                      }}
                      title="View Estimates"
                    />
                    <Button
                      size="small"
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => {
                        setEditingCustomer(customer);
                        setIsAddFormVisible(true);
                      }}
                      style={{ 
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                        color: '#faad14'
                      }}
                      title="Edit Customer"
                    />
                    <Button
                      size="small"
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={() => customer.id && handleDeleteCustomer(customer.id)}
                      danger
                      style={{ 
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                      }}
                      title="Delete Customer"
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Add/Edit Customer Form */}
        <AddCustomerForm
          isVisible={isAddFormVisible}
          onClose={() => {
            setIsAddFormVisible(false);
            setEditingCustomer(null);
          }}
          onSuccessCallBack={() => {
            setIsAddFormVisible(false);
            setEditingCustomer(null);
            fetchCustomers();
          }}
          editingCustomer={editingCustomer}
        />

        {/* Create Estimate Form */}
        <CreateEstimateForm
          isVisible={isCreateEstimateVisible}
          customer={selectedCustomer}
          onClose={() => {
            setIsCreateEstimateVisible(false);
            setSelectedCustomer(null);
          }}
          onSuccessCallBack={handleEstimateCreated}
        />
      </div>
    </div>
  );
};

export default Customers;

