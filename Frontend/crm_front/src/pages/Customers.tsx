import React, { useState, useEffect, useMemo } from 'react';
import {
  SearchOutlined,
  PlusOutlined,
  MailOutlined,
  PhoneOutlined,
  FileTextOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  EnvironmentOutlined,
  AimOutlined,
  CameraOutlined,
  InboxOutlined,
  UndoOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { Card, Input, Select, Button, Tag, notification, Modal, Tooltip, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthToken, getCurrentUser } from '../utils/functions';
import { CustomersUrl } from '../utils/network';
import { CustomerProps } from '../utils/types';
import { fullname, role, email } from '../utils/data';
import AddCustomerForm from '../components/AddCustomerForm';
import CreateEstimateForm from '../components/CreateEstimateForm';
import ScheduleSiteVisitForm from "../components/ScheduleSiteVisitForm";
import FixedTable from '../components/FixedTable';
import { BlackButton, WhiteButton, ThemedSearch, ThemedSelect } from '../components';

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
  { value: 'booked', label: 'Booked', color: 'blue' },
  { value: 'closed', label: 'Closed', color: 'green' },
  { value: 'bad_lead', label: 'Bad Lead', color: 'volcano' },
  { value: 'lost', label: 'Lost', color: 'red' },
];



const Customers: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerProps | null>(null);
  const [isCreateEstimateVisible, setIsCreateEstimateVisible] = useState(false);
  const [isScheduleVisitVisible, setIsScheduleVisitVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProps | null>(null);
  const [isNotesModalVisible, setIsNotesModalVisible] = useState(false);
  const [notesCustomer, setNotesCustomer] = useState<CustomerProps | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string | undefined>(undefined);
  const [sourceFilter, setSourceFilter] = useState<string | undefined>(undefined);

  const currentUser = getCurrentUser();

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = search === '' ||
        c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.toLowerCase().includes(search.toLowerCase());

      const matchesStage = !stageFilter || c.stage === stageFilter;
      const matchesSource = !sourceFilter || c.source === sourceFilter;

      return matchesSearch && matchesStage && matchesSource;
    });
  }, [customers, search, stageFilter, sourceFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [showArchived]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const headers = getAuthToken() as any;
      const response = await axios.get(`${CustomersUrl}?show_archived=${showArchived}`, headers);
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
      },
      footer: (_, { OkBtn, CancelBtn }) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
          <WhiteButton onClick={() => Modal.destroyAll()}>Cancel</WhiteButton>
          <BlackButton
            danger
            onClick={async () => {
              const headers = getAuthToken() as any;
              await axios.delete(`${CustomersUrl}/${customerId}`, headers);
              notification.success({ message: 'Customer Deleted', title: 'Success' });
              fetchCustomers();
              Modal.destroyAll();
            }}
          >
            Delete
          </BlackButton>
        </div>
      )
    });
  };

  const handleArchiveCustomer = async (customerId: number) => {
    Modal.confirm({
      title: 'Archive Customer',
      content: 'Are you sure you want to archive this customer? They will be moved to the archives.',
      okText: 'Archive',
      okType: 'danger',
      onOk: async () => {
        const headers = getAuthToken() as any;
        await axios.post(`${CustomersUrl}/${customerId}/archive`, {}, headers);
        notification.success({
          message: 'Customer Archived',
          description: 'Customer has been moved to archives',
          title: 'Success'
        });
        fetchCustomers();
      },
      footer: (_, { OkBtn, CancelBtn }) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
          <WhiteButton onClick={() => Modal.destroyAll()}>Cancel</WhiteButton>
          <BlackButton
            onClick={async () => {
              const headers = getAuthToken() as any;
              await axios.post(`${CustomersUrl}/${customerId}/archive`, {}, headers);
              notification.success({ message: 'Customer Archived', title: 'Success' });
              fetchCustomers();
              Modal.destroyAll();
            }}
          >
            Archive
          </BlackButton>
        </div>
      )
    });
  };

  const handleUnarchiveCustomer = async (customerId: number) => {
    Modal.confirm({
      title: 'Unarchive Customer',
      content: 'Are you sure you want to restore this customer to the active list?',
      okText: 'Unarchive',
      onOk: async () => {
        const headers = getAuthToken() as any;
        await axios.post(`${CustomersUrl}/${customerId}/unarchive`, {}, headers);
        notification.success({
          message: 'Customer Restored',
          description: 'Customer has been restored from archives',
          title: 'Success'
        });
        fetchCustomers();
      },
      footer: (_, { OkBtn, CancelBtn }) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
          <WhiteButton onClick={() => Modal.destroyAll()}>Cancel</WhiteButton>
          <BlackButton
            onClick={async () => {
              const headers = getAuthToken() as any;
              await axios.post(`${CustomersUrl}/${customerId}/unarchive`, {}, headers);
              notification.success({ message: 'Customer Restored', title: 'Success' });
              fetchCustomers();
              Modal.destroyAll();
            }}
          >
            Unarchive
          </BlackButton>
        </div>
      )
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

  const columns = [
    {
      id: 'full_name',
      label: 'Customer',
      width: 200,
      fixed: true,
      render: (value: any, record: CustomerProps) => (
        <div style={{ textAlign: 'left', padding: '4px 8px' }}>
          <div style={{ fontWeight: 600, color: '#1a1a2e' }}>{record.full_name}</div>
          {record.job_number && (
            <div style={{ fontSize: '11px', color: '#8e8ea8' }}>Job #{record.job_number}</div>
          )}
        </div>
      )
    },
    {
      id: 'stage',
      label: 'Status',
      width: 150,
      render: (value: any, record: CustomerProps) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', padding: '4px' }}>
          <Tag color={getStageColor(record.stage)} style={{ margin: 0, fontSize: '10px', borderRadius: '4px' }}>
            {record.stage.toUpperCase()}
          </Tag>
          <Tag color="geekblue" style={{ margin: 0, fontSize: '10px', borderRadius: '4px' }}>
            {getSourceLabel(record.source)}
          </Tag>
        </div>
      )
    },
    {
      id: 'email',
      label: 'Contact',
      width: 250,
      render: (value: any, record: CustomerProps) => (
        <div style={{ fontSize: '12px', textAlign: 'left', padding: '4px 8px' }}>
          <div style={{ marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <MailOutlined style={{ marginRight: '6px', color: '#bfbfbf' }} />{record.email}
          </div>
          <div><PhoneOutlined style={{ marginRight: '6px', color: '#bfbfbf' }} />{record.phone}</div>
        </div>
      )
    },
    {
      id: 'company',
      label: 'Details',
      width: 200,
      render: (value: any, record: CustomerProps) => (
        <div style={{ fontSize: '12px', textAlign: 'left', padding: '4px 8px' }}>
          <div style={{ fontWeight: 500, color: '#434343' }}>{record.company || 'Personal'}</div>
          <div style={{ color: '#8e8ea8' }}>{[record.city, record.state].filter(Boolean).join(', ') || 'N/A'}</div>
        </div>
      )
    },
    {
      id: 'created_at',
      label: 'Created At',
      width: 140,
      render: (value: any) => (
        <span style={{ fontSize: '12px', color: '#595959' }}>
          {new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      )
    },
    {
      id: 'actions',
      label: 'Actions',
      width: 100,
      render: (value: any, record: CustomerProps) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          {record.is_archived ? (
            <Tooltip title="Unarchive">
              <Button
                size="small"
                icon={<UndoOutlined />}
                onClick={(e) => { e.stopPropagation(); handleUnarchiveCustomer(record.id!); }}
              />
            </Tooltip>
          ) : (
            <>
              <Tooltip title="Schedule Site Visit">
                <Button
                  size="small"
                  type="text"
                  icon={<CameraOutlined style={{ fontSize: '14px' }} />}
                  onClick={(e) => { e.stopPropagation(); setSelectedCustomer(record); setIsScheduleVisitVisible(true); }}
                  style={{ color: '#eb2f96' }}
                />
              </Tooltip>
              <Tooltip title="Archive">
                <Button
                  size="small"
                  icon={<InboxOutlined />}
                  onClick={(e) => { e.stopPropagation(); handleArchiveCustomer(record.id!); }}
                />
              </Tooltip>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div style={{ padding: '12px 16px 20px 16px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1a1a2e' }}>Customers</h1>
          <p style={{ color: '#8e8ea8', margin: '4px 0 0 0', fontSize: '13px' }}>Manage and view all your leads and customer data</p>
        </div>
        <Space size="middle">
          <ThemedSearch
            placeholder="Search customers..."
            onSearch={setSearch}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 200 }}
          />
          <ThemedSelect
            placeholder="Filter by Stage"
            style={{ width: 160 }}
            allowClear
            value={stageFilter}
            onChange={setStageFilter}
            prefixIcon={<FilterOutlined />}
            options={STAGE_OPTIONS}
          />
          <ThemedSelect
            placeholder="Filter by Source"
            style={{ width: 160 }}
            allowClear
            value={sourceFilter}
            onChange={setSourceFilter}
            prefixIcon={<AimOutlined />}
            options={SOURCE_OPTIONS}
          />
          <WhiteButton
            icon={showArchived ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? 'Active' : 'Archived'}
          </WhiteButton>
          <BlackButton
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingCustomer(null);
              setIsAddFormVisible(true);
            }}
          >
            New Customer
          </BlackButton>
        </Space>
      </div>

      {/* Customer Table */}
      <Card style={{ borderRadius: '12px', overflow: 'hidden', height: 'calc(100vh - 150px)' }} bodyStyle={{ padding: 0, height: '100%' }}>
        <FixedTable
          columns={columns}
          data={filteredCustomers}
          loading={loading}
          tableName="customers_table"
          onRowClick={(record) => {
            setEditingCustomer(record);
            setIsAddFormVisible(true);
          }}
        />
      </Card>

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

      {/* Schedule Site Visit Form */}
      <ScheduleSiteVisitForm
        isVisible={isScheduleVisitVisible}
        customer_id={selectedCustomer?.id || 0}
        customer_name={selectedCustomer?.full_name}
        onClose={() => {
          setIsScheduleVisitVisible(false);
          setSelectedCustomer(null);
        }}
        onSuccessCallBack={() => {
          setIsScheduleVisitVisible(false);
          setSelectedCustomer(null);
          fetchCustomers();
        }}
      />

      {/* Notes Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileTextOutlined />
            <span>Customer Notes</span>
          </div>
        }
        open={isNotesModalVisible}
        onCancel={() => {
          setIsNotesModalVisible(false);
          setNotesCustomer(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setIsNotesModalVisible(false);
              setNotesCustomer(null);
            }}
          >
            Close
          </Button>
        ]}
        width={600}
      >
        {notesCustomer && (
          <div>
            <div style={{
              marginBottom: '12px',
              padding: '12px',
              backgroundColor: '#f0f2ff',
              borderRadius: '8px',
              border: '1px solid #bae6fd'
            }}>
              <div style={{ fontWeight: 600, marginBottom: '4px', color: '#0284c7' }}>
                {notesCustomer.full_name}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Job #{notesCustomer.job_number}
              </div>
            </div>
            <div style={{
              padding: '16px',
              backgroundColor: '#fafafa',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              whiteSpace: 'pre-wrap',
              fontSize: '14px',
              lineHeight: '1.6',
              minHeight: '100px'
            }}>
              {notesCustomer.notes || 'No notes available'}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
export default Customers;
