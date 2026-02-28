import React, { useState, useEffect } from 'react';
import { Card, Avatar, Button, Dropdown, Space, notification, Modal, Tooltip, Badge, Spin, Input } from 'antd';
import {
    PlusOutlined,
    MoreOutlined,
    SearchOutlined,
    FilterOutlined,
    UserOutlined,
    DollarOutlined,
    CalendarOutlined,
    PhoneOutlined,
    MailOutlined,
    ClockCircleOutlined,
    CalculatorOutlined,
    FileTextOutlined,
    EditOutlined,
    DeleteOutlined,
    HolderOutlined,
    InboxOutlined,
    CameraOutlined,
    FormOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAuthToken, getCurrentUser } from '../utils/functions';
import { CustomersUrl, FrontendUrl } from '../utils/network';
import { CustomerProps } from '../utils/types';
import AddCustomerForm from '../components/AddCustomerForm';
import CreateEstimateForm from '../components/CreateEstimateForm';
import ScheduleSiteVisitForm from '../components/ScheduleSiteVisitForm';
import { BlackButton, WhiteButton, PageLoader, ThemedSearch } from '../components';

// Map customer stages to Kanban columns
const STAGE_COLUMNS = [
    { id: 'new_lead', title: 'New Lead', color: '#f0f2ff' },
    { id: 'contacted', title: 'Contacted', color: '#c7d2ff' },
    { id: 'opportunity', title: 'Opportunity', color: '#8ea5ff' },
    { id: 'proposal', title: 'Proposal', color: '#5b6cf9' },
    { id: 'closed', title: 'Closed', color: '#3a4491' }
];

// Actual stages from Customers.tsx: 'new_lead', 'in_progress', 'opportunity', 'booked', 'closed', 'bad_lead', 'lost'
// Let's align our columns to these actual stages
const KANBAN_COLUMNS = [
    { id: 'new_lead', title: 'New Lead', color: '#f0f2ff' },
    { id: 'in_progress', title: 'In Progress', color: '#c7d2ff' },
    { id: 'opportunity', title: 'Opportunity', color: '#8ea5ff' },
    { id: 'booked', title: 'Booked', color: '#5b6cf9' },
    { id: 'closed', title: 'Closed', color: '#4a56c4' },
    { id: 'bad_lead', title: 'Bad Lead', color: '#3a4491' },
    { id: 'lost', title: 'Lost', color: '#2a325e' }
];


const Deals: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialSearch = queryParams.get('search') || '';

    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [customers, setCustomers] = useState<CustomerProps[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal states
    const [isAddFormVisible, setIsAddFormVisible] = useState(false);
    const [isCreateEstimateVisible, setIsCreateEstimateVisible] = useState(false);
    const [isScheduleVisitVisible, setIsScheduleVisitVisible] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<CustomerProps | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerProps | null>(null);

    // Drag and drop states
    const [draggedDeal, setDraggedDeal] = useState<CustomerProps | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        setSearchTerm(initialSearch);
    }, [initialSearch]);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const headers = getAuthToken() as any;
            const response = await axios.get(CustomersUrl, headers);
            setCustomers(response.data);
        } catch (error) {
            notification.error({
                message: 'Error',
                description: 'Failed to fetch deals',
                title: 'Error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCustomer = (id: number) => {
        Modal.confirm({
            title: 'Are you sure you want to delete this customer?',
            content: 'This action cannot be undone.',
            okText: 'Yes, Delete',
            okType: 'danger',
            cancelText: 'No',
            onOk: async () => {
                try {
                    const headers = getAuthToken() as any;
                    await axios.delete(`${CustomersUrl}/${id}`, headers);
                    notification.success({ message: 'Customer deleted successfully', title: 'Deleted' });
                    fetchCustomers();
                } catch (error) {
                    notification.error({ message: 'Failed to delete customer', title: 'Error' });
                }
            }
        });
    };

    const handleEstimateCreated = () => {
        setIsCreateEstimateVisible(false);
        setSelectedCustomer(null);
        fetchCustomers();
        notification.success({ message: 'Estimate created successfully', title: 'Success' });
    };

    // Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent, deal: CustomerProps) => {
        setDraggedDeal(deal);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(deal.id));
        // Add a slight delay to allow the drag image to be set
        setTimeout(() => {
            (e.target as HTMLElement).style.opacity = '0.5';
        }, 0);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        (e.target as HTMLElement).style.opacity = '1';
        setDraggedDeal(null);
        setDragOverColumn(null);
    };

    const handleDragOver = (e: React.DragEvent, columnId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverColumn !== columnId) {
            setDragOverColumn(columnId);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Only reset if we're leaving the column entirely
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
            setDragOverColumn(null);
        }
    };

    const handleDrop = async (e: React.DragEvent, newStage: string) => {
        e.preventDefault();
        setDragOverColumn(null);

        if (!draggedDeal || draggedDeal.stage === newStage) {
            setDraggedDeal(null);
            return;
        }

        const dealId = draggedDeal.id;
        const oldStage = draggedDeal.stage;

        // Optimistically update UI
        setCustomers(prev => prev.map(c =>
            c.id === dealId ? { ...c, stage: newStage } : c
        ));

        try {
            const headers = getAuthToken() as any;
            await axios.post(`${CustomersUrl}/${dealId}/change_stage`, { stage: newStage, frontend_url: FrontendUrl }, headers);
            notification.success({
                message: 'Stage Updated',
                description: `Moved to ${KANBAN_COLUMNS.find(c => c.id === newStage)?.title}`,
                duration: 2,
                title: 'Success'
            });
        } catch (error) {
            // Revert on error
            setCustomers(prev => prev.map(c =>
                c.id === dealId ? { ...c, stage: oldStage } : c
            ));
            notification.error({
                message: 'Error',
                description: 'Failed to update stage',
                title: 'Error'
            });
        }

        setDraggedDeal(null);
    };

    const getColumnDeals = (stageId: string) => {
        return customers.filter(c => c.stage === stageId &&
            (c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.company?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    };

    // Calculate total pipeline value (using a mock function since CustomerProps might not have value yet, or we use a field)
    // For now, we'll just count deals
    const totalDeals = customers.length;

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: '12px 16px 20px 16px' }}>
            {/* Header */}
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1a1a2e' }}>Deals Pipeline</h1>
                    <p style={{ color: '#8e8ea8', margin: '4px 0 0 0', fontSize: '13px' }}>
                        <span style={{ color: '#5b6cf9', fontWeight: 600 }}>{totalDeals}</span> Active Deals
                    </p>
                </div>
                <Space size="middle">
                    <ThemedSearch
                        placeholder="Search deals..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.currentTarget.value)}
                        style={{ width: 200 }}
                        allowClear
                    />
                    <BlackButton
                        icon={<PlusOutlined />}
                        onClick={() => {
                            setEditingCustomer(null);
                            setIsAddFormVisible(true);
                        }}
                    >
                        New Lead
                    </BlackButton>
                </Space>
            </div>

            {/* Kanban Board Container */}
            {loading ? (
                <PageLoader text="Loading deals..." />
            ) : (
                <div style={{
                    flex: 1,
                    display: 'flex',
                    gap: '4px',
                    overflowX: 'auto',
                    paddingBottom: '8px',
                    alignItems: 'flex-start'
                }}>
                    {KANBAN_COLUMNS.map(column => {
                        const deals = getColumnDeals(column.id);
                        const isDropTarget = dragOverColumn === column.id && draggedDeal?.stage !== column.id;
                        return (
                            <div
                                key={column.id}
                                onDragOver={(e) => handleDragOver(e, column.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, column.id)}
                                style={{
                                    minWidth: '168px',
                                    maxWidth: '168px',
                                    backgroundColor: isDropTarget ? '#e0f2fe' : '#f3f4f6',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    maxHeight: '100%',
                                    transition: 'background-color 0.2s ease',
                                    border: isDropTarget ? '2px dashed #3b82f6' : '2px solid transparent',
                                }}
                            >
                                {/* Column Header */}
                                <div style={{
                                    padding: '6px 8px',
                                    borderBottom: '1px solid #e5e7eb',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderTop: `3px solid ${column.color}`,
                                    borderTopLeftRadius: '4px',
                                    borderTopRightRadius: '4px',
                                    backgroundColor: '#fff'
                                }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: '#374151' }}>{column.title}</h3>
                                        <span style={{ fontSize: '9px', color: '#6b7280' }}>
                                            {deals.length} deals
                                        </span>
                                    </div>
                                </div>

                                {/* Deals List */}
                                <div style={{
                                    padding: '5px 6px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    overflowY: 'auto',
                                    scrollbarWidth: 'thin',
                                    flex: 1,
                                    minHeight: '100px',
                                }}>
                                    {deals.map(deal => (
                                        <Card
                                            key={deal.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, deal)}
                                            onDragEnd={handleDragEnd}
                                            style={{
                                                borderRadius: '4px',
                                                boxShadow: draggedDeal?.id === deal.id ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 2px rgba(0,0,0,0.04)',
                                                cursor: 'grab',
                                                border: '1px solid #e5e7eb',
                                                opacity: draggedDeal?.id === deal.id ? 0.5 : 1,
                                                transition: 'box-shadow 0.2s ease, opacity 0.2s ease',
                                            }}
                                            bodyStyle={{ padding: '3px 5px' }}
                                            hoverable
                                            className="kanban-deal-card"
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', flex: 1 }}>
                                                    <HolderOutlined style={{
                                                        color: '#d1d5db',
                                                        fontSize: '10px',
                                                        cursor: 'grab',
                                                        marginTop: '2px',
                                                        flexShrink: 0,
                                                    }} />
                                                    <div style={{ fontWeight: 600, color: '#1f2937', fontSize: '10px', lineHeight: '1.2' }}>
                                                        {deal.full_name}
                                                    </div>
                                                </div>
                                                <Dropdown menu={{
                                                    items: [
                                                        { key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => { setEditingCustomer(deal); setIsAddFormVisible(true); } },
                                                        { key: 'delete', label: 'Delete', danger: true, icon: <DeleteOutlined />, onClick: () => deal.id && handleDeleteCustomer(deal.id) }
                                                    ]
                                                }}>
                                                    <MoreOutlined style={{ color: '#9ca3af', transform: 'rotate(90deg)', cursor: 'pointer', fontSize: '10px' }} onClick={(e) => e.stopPropagation()} />
                                                </Dropdown>
                                            </div>

                                            {deal.company && (
                                                <div style={{ fontSize: '9px', color: '#6b7280', marginBottom: '2px' }}>{deal.company}</div>
                                            )}

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                {deal.phone && (
                                                    <div style={{ fontSize: '9px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                        <PhoneOutlined style={{ fontSize: '8px' }} /> {deal.phone}
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{
                                                marginTop: '4px',
                                                display: 'flex',
                                                gap: '1px',
                                                padding: '2px 0',
                                                borderTop: '1px dashed #f0f0f0'
                                            }} onClick={(e) => e.stopPropagation()}>
                                                <Tooltip title="Timeline">
                                                    <Button
                                                        size="small"
                                                        type="text"
                                                        icon={<ClockCircleOutlined style={{ fontSize: '10px' }} />}
                                                        onClick={() => navigate(`/customer-timeline/${deal.id}`)}
                                                        style={{ color: '#722ed1', padding: '0 1px', height: '16px', minWidth: '18px' }}
                                                    />
                                                </Tooltip>
                                                <Tooltip title="Schedule Site Visit">
                                                    <Button
                                                        size="small"
                                                        type="text"
                                                        icon={<CameraOutlined style={{ fontSize: '10px' }} />}
                                                        onClick={() => { setSelectedCustomer(deal); setIsScheduleVisitVisible(true); }}
                                                        style={{ color: '#eb2f96', padding: '0 1px', height: '16px', minWidth: '18px' }}
                                                    />
                                                </Tooltip>
                                                {deal.upcoming_visit_id && (
                                                    <Tooltip title="Record Site Visit">
                                                        <Button
                                                            size="small"
                                                            type="text"
                                                            icon={<FormOutlined style={{ fontSize: '10px' }} />}
                                                            onClick={() => navigate(`/site-visit-capture/${deal.upcoming_visit_id}`)}
                                                            style={{ color: '#fa8c16', padding: '0 1px', height: '16px', minWidth: '18px' }}
                                                        />
                                                    </Tooltip>
                                                )}
                                                <Tooltip title="Estimate">
                                                    <Button
                                                        size="small"
                                                        type="text"
                                                        icon={<CalculatorOutlined style={{ fontSize: '10px' }} />}
                                                        onClick={() => { setSelectedCustomer(deal); setIsCreateEstimateVisible(true); }}
                                                        style={{ color: '#52c41a', padding: '0 1px', height: '16px', minWidth: '18px' }}
                                                    />
                                                </Tooltip>
                                                <Tooltip title="Docs">
                                                    <Button
                                                        size="small"
                                                        type="text"
                                                        icon={<FileTextOutlined style={{ fontSize: '10px' }} />}
                                                        onClick={() => navigate(`/estimates?customer=${deal.id}`)}
                                                        style={{ color: '#1890ff', padding: '0 1px', height: '16px', minWidth: '18px' }}
                                                    />
                                                </Tooltip>
                                                <Tooltip title="Edit">
                                                    <Button
                                                        size="small"
                                                        type="text"
                                                        icon={<EditOutlined style={{ fontSize: '10px' }} />}
                                                        onClick={() => { setEditingCustomer(deal); setIsAddFormVisible(true); }}
                                                        style={{ color: '#faad14', padding: '0 1px', height: '16px', minWidth: '18px' }}
                                                    />
                                                </Tooltip>
                                                <Tooltip title="Delete">
                                                    <Button
                                                        size="small"
                                                        type="text"
                                                        icon={<DeleteOutlined style={{ fontSize: '10px' }} />}
                                                        onClick={() => deal.id && handleDeleteCustomer(deal.id)}
                                                        danger
                                                        style={{ padding: '0 1px', height: '16px', minWidth: '18px' }}
                                                    />
                                                </Tooltip>
                                            </div>

                                            <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                    <Avatar size={14} style={{ backgroundColor: column.color, fontSize: '8px', fontWeight: 600 }}>
                                                        {deal.assigned_to_name ? deal.assigned_to_name.charAt(0) : 'U'}
                                                    </Avatar>
                                                    <span style={{ fontSize: '8px', color: '#9ca3af' }}>{deal.assigned_to_name || 'Unassigned'}</span>
                                                </div>
                                                <div style={{ fontSize: '8px', color: '#9ca3af' }}>
                                                    {new Date(deal.created_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Modals from Customers page logic */}
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

            <CreateEstimateForm
                isVisible={isCreateEstimateVisible}
                customer={selectedCustomer}
                onClose={() => {
                    setIsCreateEstimateVisible(false);
                    setSelectedCustomer(null);
                }}
                onSuccessCallBack={handleEstimateCreated}
            />

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
        </div>
    );
};

export default Deals;
