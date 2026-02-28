import React, { useState, useEffect } from 'react';
import { Modal, Steps, Card, Row, Col, Typography, Space, Button, Select, Divider, Checkbox, InputNumber, Radio, message, Popconfirm, Tabs, Input, Form, DatePicker } from 'antd';
import {
    LineChartOutlined, BarChartOutlined, PieChartOutlined, TableOutlined,
    DashboardOutlined, CalendarOutlined, FunnelPlotOutlined, AimOutlined,
    SafetyCertificateOutlined, FunctionOutlined, PlusOutlined, DeleteOutlined,
    CheckOutlined, SettingOutlined, EyeOutlined, ShoppingOutlined, AuditOutlined,
    FilterOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { getAuthToken } from '../../utils/functions';
import CustomMetricBuilder from './CustomMetricBuilder';

const { Title, Text, Paragraph } = Typography;

interface WidgetWizardProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (config: any) => void;
}

const METRICS = [
    // KPIs (Metrics + Trends + Comparisons)
    { key: 'total_leads', title: 'Total Leads', category: 'kpis', icon: <DashboardOutlined /> },
    { key: 'total_revenue', title: 'Total Revenue', category: 'kpis', icon: <DashboardOutlined /> },
    { key: 'win_rate', title: 'Win Rate', category: 'kpis', icon: <DashboardOutlined /> },
    { key: 'active_jobs', title: 'Active Jobs', category: 'kpis', icon: <CalendarOutlined /> },
    { key: 'average_deal_size', title: 'Avg Deal Size', category: 'kpis', icon: <DashboardOutlined /> },
    { key: 'payment_count', title: 'Payment Count', category: 'kpis', icon: <DashboardOutlined /> },
    { key: 'average_payment', title: 'Avg Payment', category: 'kpis', icon: <DashboardOutlined /> },
    { key: 'due_invoices_amount', title: 'Due Invoices', category: 'kpis', icon: <DashboardOutlined /> },
    { key: 'total_expenses', title: 'Total Expenses', category: 'kpis', icon: <AuditOutlined /> },
    { key: 'total_purchases', title: 'Total Purchases', category: 'kpis', icon: <ShoppingOutlined /> },
    { key: 'revenue_trends', title: 'Revenue Trends', category: 'kpis', icon: <LineChartOutlined /> },
    { key: 'lead_volume', title: 'Lead Volume', category: 'kpis', icon: <LineChartOutlined /> },
    { key: 'pipeline_value', title: 'Pipeline Value', category: 'kpis', icon: <LineChartOutlined /> },
    { key: 'branch_performance', title: 'Branch Performance', category: 'kpis', icon: <BarChartOutlined /> },
    { key: 'deals_by_stage', title: 'Deals by Stage', category: 'kpis', icon: <FunnelPlotOutlined /> },
    { key: 'lead_source_distribution', title: 'Lead Source', category: 'kpis', icon: <PieChartOutlined /> },
    { key: 'revenue_by_service_type', title: 'Revenue by Service', category: 'kpis', icon: <BarChartOutlined /> },
    { key: 'service_funnel', title: 'Service Funnel', category: 'kpis', icon: <FunnelPlotOutlined /> },

    // Lists (Activities)
    { key: 'upcoming_jobs', title: 'Upcoming Jobs', category: 'lists', icon: <TableOutlined /> },
    { key: 'recent_activities', title: 'Recent Activities', category: 'lists', icon: <TableOutlined /> },
    { key: 'recent_invoices', title: 'Recent Invoices', category: 'lists', icon: <TableOutlined /> },
    { key: 'recent_payments', title: 'Recent Payments', category: 'lists', icon: <TableOutlined /> },
    { key: 'recent_expenses', title: 'Recent Expenses', category: 'lists', icon: <TableOutlined /> },
    { key: 'recent_purchases', title: 'Recent Purchases', category: 'lists', icon: <TableOutlined /> },
    { key: 'accounts_receivable', title: 'Accounts Receivable', category: 'lists', icon: <TableOutlined /> },
    { key: 'due_invoices', title: 'Due Invoices List', category: 'lists', icon: <TableOutlined /> },
    { key: 'site_visits', title: 'Site Visits', category: 'lists', icon: <CalendarOutlined /> },

    // Filters
    { key: 'rep_id', title: 'Sales Rep', category: 'filters', icon: <FilterOutlined /> },
    { key: 'branch_id', title: 'Branch', category: 'filters', icon: <FilterOutlined /> },
    { key: 'customer_id', title: 'Customer', category: 'filters', icon: <FilterOutlined /> },
    { key: 'source', title: 'Lead Source', category: 'filters', icon: <FilterOutlined /> },
    { key: 'date_range', title: 'Date Range', category: 'filters', icon: <CalendarOutlined /> },
];

const VISUALIZATIONS: Record<string, any[]> = {
    kpis: [
        { type: 'kpi', title: 'KPI Card', icon: <DashboardOutlined /> },
        { type: 'trend', chartType: 'line', library: 'recharts', title: 'Line Chart', icon: <LineChartOutlined /> },
        { type: 'trend', chartType: 'bar', library: 'recharts', title: 'Bar Chart', icon: <BarChartOutlined /> },
        { type: 'trend', chartType: 'area', library: 'recharts', title: 'Area Chart', icon: <LineChartOutlined /> },
        { type: 'breakdown', chartType: 'pie', library: 'recharts', title: 'Pie Chart', icon: <PieChartOutlined /> },
        { type: 'breakdown', chartType: 'bar', library: 'recharts', title: 'Bar Chart', icon: <BarChartOutlined /> },
        { type: 'funnel', chartType: 'Funnel', library: 'google_charts', title: 'Funnel', icon: <FunnelPlotOutlined /> },
    ],
    lists: [
        { type: 'activity', title: 'Activity List', icon: <TableOutlined /> },
        { type: 'table', title: 'Data Table', icon: <TableOutlined /> },
        { type: 'Calendar', library: 'recharts', title: 'Calendar', icon: <CalendarOutlined /> },
    ],
    filters: [
        { type: 'control', title: 'Dropdown Control', icon: <FilterOutlined /> }
    ]
};

const WidgetWizard: React.FC<WidgetWizardProps> = ({ visible, onClose, onAdd }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [selectedMetric, setSelectedMetric] = useState<any>(null);
    const [config, setConfig] = useState<any>({
        timeRange: 'last_30_days',
        accentColor: '#1890ff',
        showGoals: true,
        targets: {},
        thresholds: { operator: 'gt' },
        isLocked: false,
        isHidden: false,
        defaultValue: null
    });
    const [customMetrics, setCustomMetrics] = useState<any[]>([]);
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [filterOptions, setFilterOptions] = useState<any[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(false);

    useEffect(() => {
        if (selectedMetric?.category === 'filters' && currentStep === 1) {
            fetchFilterOptions();
        }
    }, [selectedMetric, currentStep]);

    const fetchFilterOptions = async () => {
        setLoadingOptions(true);
        const headers = getAuthToken();
        if (!headers) return;

        try {
            let url = '';
            const data_source = selectedMetric.key;
            if (data_source === 'rep_id') {
                const orgId = localStorage.getItem('current_org_id');
                url = `http://127.0.0.1:8000/api/user/organizations/${orgId}/members/`;
            } else if (data_source === 'branch_id') {
                url = 'http://127.0.0.1:8000/api/masterdata/branches/';
            } else if (data_source === 'customer_id') {
                url = 'http://127.0.0.1:8000/api/masterdata/customers/';
            } else if (data_source === 'source') {
                setFilterOptions([
                    { value: 'moveit', label: 'Moveit' },
                    { value: 'mymovingloads', label: 'MyMovingLoads' },
                    { value: 'moving24', label: 'Moving24' },
                    { value: 'baltic_website', label: 'Baltic Website' },
                    { value: 'n1m_website', label: 'N1M Website' },
                    { value: 'google', label: 'Google' },
                    { value: 'referral', label: 'Referral' },
                    { value: 'other', label: 'Other' },
                ]);
                setLoadingOptions(false);
                return;
            }

            if (url) {
                const response = await axios.get(url, headers);
                const data = response.data.results || response.data;
                setFilterOptions(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Failed to fetch filter options', error);
            setFilterOptions([]);
        } finally {
            setLoadingOptions(false);
        }
    };

    useEffect(() => {
        if (visible) {
            fetchCustomMetrics();
        }
    }, [visible]);

    const fetchCustomMetrics = async () => {
        try {
            const headers = getAuthToken();
            if (!headers) return;
            const response = await axios.get('http://127.0.0.1:8000/api/dashboard/custom-metrics/', headers);
            setCustomMetrics(response.data);
        } catch (err) {
            console.error('Failed to fetch custom metrics:', err);
        }
    };

    const handleDeleteCustomMetric = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        try {
            const headers = getAuthToken();
            if (!headers) return;
            await axios.delete(`http://127.0.0.1:8000/api/dashboard/custom-metrics/${id}/`, headers);
            message.success('Custom metric deleted');
            fetchCustomMetrics();
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || 'Failed to delete metric';
            message.error(errorMsg);
        }
    };

    const handleSelectMetric = (metric: any) => {
        setSelectedMetric(metric);
        const defaultRange = (metric.key === 'upcoming_jobs' || metric.key === 'site_visits') ? 'future' : 'last_30_days';
        setConfig({
            ...config,
            timeRange: defaultRange
        });

        // For all types, we now go to step 1 (configuration)
        setCurrentStep(1);
    };

    const handleNext = () => {
        // Skip Goals step if showGoals is false OR not a kpi
        const skipGoals = config.showGoals === false || selectedMetric.category !== 'kpis';

        if (currentStep === 1 && skipGoals) {
            setCurrentStep(3);
        } else {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrev = () => {
        const skipGoals = config.showGoals === false || selectedMetric.category !== 'kpis';

        if (currentStep === 1) {
            setCurrentStep(0);
        } else if (selectedMetric?.category === 'filters') {
            // For filters, they only go Step 0 -> Step 1 -> Step 3
            if (currentStep === 3) setCurrentStep(1);
            else setCurrentStep(0);
        } else if (currentStep === 3 && skipGoals) {
            setCurrentStep(1);
        } else {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleFinish = (viz: any) => {
        onAdd({
            widget_type: viz.type,
            data_source: selectedMetric.key,
            title: selectedMetric.title,
            config: {
                ...config,
                chartType: viz.chartType,
                library: viz.library || 'none',
            }
        });
        reset();
    };

    const reset = () => {
        setCurrentStep(0);
        setSelectedMetric(null);
        setConfig({
            timeRange: 'last_30_days',
            accentColor: '#1890ff',
            targets: {},
            thresholds: { operator: 'gt' }
        });
    };

    const steps = [
        { title: 'Metric' },
        { title: 'Configure' },
        { title: 'Goals' },
        { title: 'Visualize' }
    ];

    return (
        <Modal
            title="Create Widget"
            open={visible}
            onCancel={() => { reset(); onClose(); }}
            footer={null}
            width={850}
            centered
            bodyStyle={{ padding: 0, height: '70vh', display: 'flex', flexDirection: 'column' }}
        >
            <div style={{ padding: '24px 24px 0 24px', flexShrink: 0, borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {steps.map((step, index) => {
                        const getStepIcon = () => {
                            if (index < currentStep) return <CheckOutlined />;
                            switch (index) {
                                case 0: return <DashboardOutlined />;
                                case 1: return <SettingOutlined />;
                                case 2: return <AimOutlined />;
                                case 3: return <EyeOutlined />;
                                default: return index + 1;
                            }
                        };

                        return (
                            <React.Fragment key={index}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                                    {/* Circle Icon */}
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        backgroundColor: index < currentStep ? '#5b6cf9' : index === currentStep ? '#5b6cf9' : '#f0f0f0',
                                        border: `2px solid ${index <= currentStep ? '#5b6cf9' : '#d9d9d9'}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: index <= currentStep ? '#fff' : '#8c8c8c',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        transition: 'all 0.3s ease',
                                        zIndex: 1
                                    }}>
                                        {getStepIcon()}
                                    </div>
                                    {/* Label */}
                                    <div style={{
                                        marginTop: '6px',
                                        fontSize: '11px',
                                        fontWeight: index === currentStep ? 600 : 500,
                                        color: index === currentStep ? '#5b6cf9' : index < currentStep ? '#5b6cf9' : '#8c8c8c',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {step.title}
                                    </div>
                                </div>
                                {/* Connecting Line */}
                                {index < steps.length - 1 && (
                                    <div style={{
                                        flex: 1,
                                        height: '2px',
                                        backgroundColor: index < currentStep ? '#5b6cf9' : '#e0e0e0',
                                        margin: '0 16px',
                                        marginBottom: '28px',
                                        transition: 'all 0.3s ease'
                                    }} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

                {currentStep === 0 && (
                    <Tabs
                        defaultActiveKey="kpis"
                        centered
                        tabBarStyle={{
                            marginBottom: '32px',
                            borderBottom: 'none'
                        }}
                        className="custom-tabs"
                    >
                        <Tabs.TabPane
                            tab={
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px' }}>
                                    <DashboardOutlined />
                                    <span>Key Metrics</span>
                                </div>
                            }
                            key="kpis"
                        >
                            <div style={{ padding: '0 8px' }}>
                                <Title level={5} style={{ marginBottom: '24px', textAlign: 'center' }}>What do you want to track?</Title>
                                <Row gutter={[16, 16]}>
                                    {METRICS.filter(m => m.category === 'kpis').map((metric) => (
                                        <Col span={6} key={metric.key}>
                                            <Card
                                                hoverable
                                                size="small"
                                                onClick={() => handleSelectMetric(metric)}
                                                style={{
                                                    textAlign: 'center',
                                                    height: '100%',
                                                    borderRadius: '12px',
                                                    border: '1px solid #f0f0f0',
                                                    transition: 'all 0.3s ease'
                                                }}
                                                bodyStyle={{ padding: '20px 12px' }}
                                            >
                                                <div style={{ fontSize: '28px', color: '#5b6cf9', marginBottom: '12px' }}>
                                                    {metric.icon}
                                                </div>
                                                <Text strong style={{ fontSize: '14px', display: 'block' }}>{metric.title}</Text>
                                            </Card>
                                        </Col>
                                    ))}

                                    {/* Custom Metrics */}
                                    {customMetrics.map((cm) => (
                                        <Col span={6} key={`custom-${cm.id}`}>
                                            <Card
                                                hoverable
                                                size="small"
                                                onClick={() => handleSelectMetric({
                                                    key: `custom_${cm.id}`,
                                                    title: cm.name,
                                                    category: 'kpis',
                                                    isCustom: true,
                                                    customId: cm.id,
                                                    query_config: cm.query_config
                                                })}
                                                style={{
                                                    textAlign: 'center',
                                                    height: '100%',
                                                    position: 'relative',
                                                    borderRadius: '12px',
                                                    border: '1px solid #f0f0f0'
                                                }}
                                                bodyStyle={{ padding: '20px 12px' }}
                                            >
                                                <Popconfirm
                                                    title="Delete this metric?"
                                                    description="You can only delete metrics not used in any dashboard."
                                                    onConfirm={(e?: React.MouseEvent) => e && handleDeleteCustomMetric(e, cm.id)}
                                                    onCancel={(e?: React.MouseEvent) => e?.stopPropagation()}
                                                    okText="Yes"
                                                    cancelText="No"
                                                >
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        danger
                                                        icon={<DeleteOutlined style={{ fontSize: '12px' }} />}
                                                        style={{ position: 'absolute', top: 4, right: 4 }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </Popconfirm>
                                                <div style={{ fontSize: '28px', color: '#5b6cf9', marginBottom: '12px' }}>
                                                    <FunctionOutlined />
                                                </div>
                                                <Text strong style={{ fontSize: '14px', display: 'block' }}>{cm.name}</Text>
                                                <div style={{ fontSize: '10px', color: '#5b6cf9', marginTop: '4px' }}>Custom KPI</div>
                                            </Card>
                                        </Col>
                                    ))}

                                    {/* Create New Custom Metric */}
                                    <Col span={6}>
                                        <Card
                                            hoverable
                                            size="small"
                                            onClick={() => setIsBuilderOpen(true)}
                                            style={{
                                                textAlign: 'center',
                                                height: '100%',
                                                borderStyle: 'dashed',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'center',
                                                borderColor: '#d9d9d9'
                                            }}
                                            bodyStyle={{ padding: '20px 12px' }}
                                        >
                                            <div style={{ fontSize: '28px', color: '#8c8c8c', marginBottom: '12px' }}>
                                                <PlusOutlined />
                                            </div>
                                            <Text strong style={{ fontSize: '14px', color: '#8c8c8c' }}>Create Custom</Text>
                                        </Card>
                                    </Col>
                                </Row>
                            </div>
                        </Tabs.TabPane>
                        <Tabs.TabPane
                            tab={
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px' }}>
                                    <TableOutlined />
                                    <span>Activity Lists</span>
                                </div>
                            }
                            key="lists"
                        >
                            <div style={{ padding: '0 8px' }}>
                                <Title level={5} style={{ marginBottom: '24px', textAlign: 'center' }}>What list do you want to display?</Title>
                                <Row gutter={[16, 16]}>
                                    {METRICS.filter(m => m.category === 'lists').map((metric) => (
                                        <Col span={6} key={metric.key}>
                                            <Card
                                                hoverable
                                                size="small"
                                                onClick={() => handleSelectMetric(metric)}
                                                style={{
                                                    textAlign: 'center',
                                                    height: '100%',
                                                    borderRadius: '12px',
                                                    border: '1px solid #f0f0f0'
                                                }}
                                                bodyStyle={{ padding: '20px 12px' }}
                                            >
                                                <div style={{ fontSize: '28px', color: '#5b6cf9', marginBottom: '12px' }}>
                                                    {metric.icon}
                                                </div>
                                                <Text strong style={{ fontSize: '14px', display: 'block' }}>{metric.title}</Text>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            </div>
                        </Tabs.TabPane>
                        <Tabs.TabPane
                            tab={
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px' }}>
                                    <FilterOutlined />
                                    <span>Global Filters</span>
                                </div>
                            }
                            key="filters"
                        >
                            <div style={{ padding: '0 8px' }}>
                                <Title level={5} style={{ marginBottom: '24px', textAlign: 'center' }}>Select a Global Filter</Title>
                                <Row gutter={[16, 16]}>
                                    {METRICS.filter(m => m.category === 'filters').map((metric) => (
                                        <Col span={6} key={metric.key}>
                                            <Card
                                                hoverable
                                                size="small"
                                                onClick={() => handleSelectMetric(metric)}
                                                style={{
                                                    textAlign: 'center',
                                                    height: '100%',
                                                    borderRadius: '12px',
                                                    border: '1px solid #f0f0f0'
                                                }}
                                                bodyStyle={{ padding: '20px 12px' }}
                                            >
                                                <div style={{ fontSize: '28px', color: '#5b6cf9', marginBottom: '12px' }}>
                                                    {metric.icon}
                                                </div>
                                                <Text strong style={{ fontSize: '14px', display: 'block' }}>{metric.title}</Text>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            </div>
                        </Tabs.TabPane>
                    </Tabs>
                )}

                {currentStep === 1 && (
                    <div style={{ padding: '0 8px' }}>
                        <Title level={5}>Refine {selectedMetric?.title}</Title>
                        <Space direction="vertical" style={{ width: '100%' }} size="large">
                            {selectedMetric?.category === 'filters' ? (
                                <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                                    <Paragraph>Configure the behavior of your <strong>{selectedMetric.title}</strong> filter.</Paragraph>

                                    <Form layout="vertical">
                                        <Form.Item label="Default Value (Pre-selected on load)">
                                            {selectedMetric.key === 'date_range' ? (
                                                <DatePicker.RangePicker
                                                    style={{ width: '100%' }}
                                                    onChange={(_: any, dateStrings: [string, string]) => {
                                                        setConfig({
                                                            ...config,
                                                            defaultValue: dateStrings.join(',')
                                                        });
                                                    }}
                                                />
                                            ) : (
                                                <Select
                                                    style={{ width: '100%' }}
                                                    placeholder={`Select Default ${selectedMetric.title}`}
                                                    allowClear
                                                    loading={loadingOptions}
                                                    value={config.defaultValue}
                                                    onChange={val => setConfig({ ...config, defaultValue: val })}
                                                    options={
                                                        selectedMetric.key === 'source' ? filterOptions :
                                                            (Array.isArray(filterOptions) ? filterOptions.map(item => {
                                                                if (selectedMetric.key === 'rep_id') {
                                                                    return {
                                                                        value: item.id || item.user?.id,
                                                                        label: item.full_name || item.user?.full_name || item.email || item.user?.email
                                                                    };
                                                                }
                                                                if (selectedMetric.key === 'branch_id') {
                                                                    return { value: item.id, label: item.name };
                                                                }
                                                                if (selectedMetric.key === 'customer_id') {
                                                                    return {
                                                                        value: item.id,
                                                                        label: `${item.first_name || ''} ${item.last_name || ''} (${item.email || 'No Email'})`
                                                                    };
                                                                }
                                                                return { value: item.id, label: item.name || item.title || item.id };
                                                            }) : [])
                                                    }
                                                />
                                            )}
                                        </Form.Item>

                                        <Divider />

                                        <Form.Item>
                                            <Checkbox
                                                checked={config.isLocked}
                                                onChange={e => setConfig({ ...config, isLocked: e.target.checked })}
                                            >
                                                <strong>Lock Filter</strong> (Users cannot change the value on the dashboard)
                                            </Checkbox>
                                        </Form.Item>

                                        <Form.Item>
                                            <Checkbox
                                                checked={config.isHidden}
                                                onChange={e => setConfig({ ...config, isHidden: e.target.checked })}
                                            >
                                                <strong>Make Hidden</strong> (Use as a global dashboard constraint without showing the selector)
                                            </Checkbox>
                                        </Form.Item>

                                        {config.isHidden && !config.defaultValue && (
                                            <div style={{ color: '#faad14', fontSize: '12px' }}>
                                                <SettingOutlined /> Note: Hidden filters should usually have a default value to be useful.
                                            </div>
                                        )}
                                    </Form>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <Text type="secondary">Default Time Range</Text>
                                        <Select
                                            value={config.timeRange}
                                            onChange={(v) => setConfig({ ...config, timeRange: v })}
                                            style={{ width: '100%', marginTop: '8px' }}
                                        >
                                            <Select.Option value="last_7_days">Last 7 Days (Past)</Select.Option>
                                            <Select.Option value="last_30_days">Last 30 Days (Past)</Select.Option>
                                            <Select.Option value="last_90_days">Last 90 Days (Past)</Select.Option>
                                            <Select.Option value="last_6_months">Last 6 Months (Past)</Select.Option>
                                            <Select.Option value="last_12_months">Last 12 Months (Past)</Select.Option>
                                            <Select.Option value="this_year">This Year (YTD)</Select.Option>
                                            <Select.Option value="all_time">All Time (Historical)</Select.Option>
                                            {selectedMetric?.category === 'lists' && (
                                                <Select.Option value="future">Future Jobs (Forward Looking)</Select.Option>
                                            )}
                                        </Select>
                                    </div>
                                    <div>
                                        <Text type="secondary">Accent Color</Text>
                                        <Row gutter={8} style={{ marginTop: '8px' }}>
                                            {['#1890ff', '#52c41a', '#faad14', '#f5222d', '#5b6cf9'].map(color => (
                                                <Col key={color}>
                                                    <div
                                                        onClick={() => setConfig({ ...config, accentColor: color })}
                                                        style={{
                                                            width: '24px',
                                                            height: '24px',
                                                            backgroundColor: color,
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            border: config.accentColor === color ? '2px solid #000' : 'none'
                                                        }}
                                                    />
                                                </Col>
                                            ))}
                                        </Row>
                                    </div>
                                    <div>
                                        <Divider style={{ margin: '12px 0' }} />
                                        <Text type="secondary">Interactivity</Text>
                                        <div style={{ marginTop: '8px' }}>
                                            <Checkbox
                                                checked={config.enable_click}
                                                onChange={e => setConfig({
                                                    ...config,
                                                    enable_click: e.target.checked,
                                                    click_action: e.target.checked ? 'filter_dashboard' : undefined
                                                })}
                                            >
                                                Enable click-to-filter dashboard
                                            </Checkbox>
                                        </div>
                                        <div style={{ marginTop: '8px' }}>
                                            {selectedMetric?.category === 'kpis' && (
                                                <Checkbox
                                                    checked={config.showGoals !== false}
                                                    onChange={e => setConfig({
                                                        ...config,
                                                        showGoals: e.target.checked
                                                    })}
                                                >
                                                    Display Goals & Targets on card
                                                </Checkbox>
                                            )}
                                        </div>
                                        {config.enable_click && (
                                            <div style={{ marginTop: '12px', padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
                                                <Text type="secondary" style={{ fontSize: '12px' }}>Filter Target Field</Text>
                                                <Select
                                                    value={config.click_target?.filter_field || 'source'}
                                                    onChange={v => setConfig({
                                                        ...config,
                                                        click_target: { ...config.click_target, filter_field: v }
                                                    })}
                                                    style={{ width: '100%', marginTop: '4px' }}
                                                    placeholder="Select field to filter"
                                                >
                                                    <Select.Option value="source">Lead Source</Select.Option>
                                                    <Select.Option value="branch_id">Branch ID</Select.Option>
                                                    <Select.Option value="rep_id">Sales Rep</Select.Option>
                                                    <Select.Option value="status">Job Status</Select.Option>
                                                </Select>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </Space>
                        <Divider />
                        <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button onClick={handlePrev}>Back</Button>
                            <Button
                                onClick={handleNext}
                                style={{ background: '#000', borderColor: '#000', color: '#fff' }}
                            >
                                Continue
                            </Button>
                        </Space>
                    </div>
                )}

                {currentStep === 2 && (
                    <div style={{ padding: '0 8px' }}>
                        <Title level={5}><AimOutlined /> Goals & Thresholds</Title>
                        <Paragraph type="secondary">Set performance targets and health indicators for this metric.</Paragraph>

                        <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '12px' }}>
                            <Row gutter={32}>
                                <Col span={12}>
                                    <Title level={5} style={{ fontSize: '14px', marginBottom: '16px' }}><AimOutlined /> Target Goal</Title>
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <Text type="secondary">Target Value</Text>
                                        <InputNumber
                                            style={{ width: '100%' }}
                                            placeholder="e.g. 100000"
                                            value={config.targets?.value}
                                            onChange={v => setConfig({ ...config, targets: { ...config.targets, value: v } })}
                                        />
                                        <Text type="secondary">Period</Text>
                                        <Select
                                            style={{ width: '100%' }}
                                            value={config.targets?.period || 'monthly'}
                                            onChange={v => setConfig({ ...config, targets: { ...config.targets, period: v } })}
                                        >
                                            <Select.Option value="daily">Daily</Select.Option>
                                            <Select.Option value="weekly">Weekly</Select.Option>
                                            <Select.Option value="monthly">Monthly</Select.Option>
                                            <Select.Option value="quarterly">Quarterly</Select.Option>
                                            <Select.Option value="yearly">Yearly</Select.Option>
                                        </Select>
                                    </Space>
                                </Col>
                                <Col span={12}>
                                    <Title level={5} style={{ fontSize: '14px', marginBottom: '16px' }}><SafetyCertificateOutlined /> Health Indicators</Title>
                                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                        <div>
                                            <Text type="secondary">Status Logic</Text>
                                            <Radio.Group
                                                value={config.thresholds?.operator || 'gt'}
                                                size="small"
                                                style={{ display: 'block', marginTop: '4px' }}
                                                onChange={e => setConfig({ ...config, thresholds: { ...config.thresholds, operator: e.target.value } })}
                                            >
                                                <Radio.Button value="gt">Higher is Better</Radio.Button>
                                                <Radio.Button value="lt">Lower is Better</Radio.Button>
                                            </Radio.Group>
                                        </div>
                                        <div>
                                            <Text type="secondary">Warning Threshold (Yellow)</Text>
                                            <InputNumber
                                                style={{ width: '100%' }}
                                                value={config.thresholds?.warning}
                                                onChange={v => setConfig({ ...config, thresholds: { ...config.thresholds, warning: v } })}
                                            />
                                        </div>
                                        <div>
                                            <Text type="secondary">Critical Threshold (Red)</Text>
                                            <InputNumber
                                                style={{ width: '100%' }}
                                                value={config.thresholds?.critical}
                                                onChange={v => setConfig({ ...config, thresholds: { ...config.thresholds, critical: v } })}
                                            />
                                        </div>
                                    </Space>
                                </Col>
                            </Row>
                        </div>

                        <Divider />
                        <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button onClick={handlePrev}>Back</Button>
                            <Button
                                onClick={handleNext}
                                style={{ background: '#000', borderColor: '#000', color: '#fff' }}
                            >
                                Continue to Visualization
                            </Button>
                        </Space>
                    </div>
                )}

                {currentStep === 3 && (
                    <div style={{ padding: '0 8px' }}>
                        <Title level={5}>Choose Visualization</Title>
                        <Text type="secondary">Suggested for {selectedMetric?.title}</Text>
                        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
                            {selectedMetric && VISUALIZATIONS[selectedMetric.category].map((viz, idx) => (
                                <Col span={8} key={idx}>
                                    <Card
                                        hoverable
                                        size="small"
                                        onClick={() => handleFinish(viz)}
                                        style={{ textAlign: 'center' }}
                                    >
                                        <div style={{ fontSize: '24px', color: '#5b6cf9', marginBottom: '8px' }}>
                                            {viz.icon}
                                        </div>
                                        <Text strong>{viz.title}</Text>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                        <Divider />
                        <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button onClick={handlePrev}>Back</Button>
                        </Space>
                    </div>
                )}
            </div>

            <CustomMetricBuilder
                visible={isBuilderOpen}
                onClose={() => setIsBuilderOpen(false)}
                onSaved={fetchCustomMetrics}
            />
        </Modal>
    );
};

export default WidgetWizard;
