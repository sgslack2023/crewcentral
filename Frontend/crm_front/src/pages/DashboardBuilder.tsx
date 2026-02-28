import React, { useState, useEffect, useRef } from 'react';
import {
    Button, Card, Space, Typography, Form, Input, Select, ColorPicker,
    message, Row, Col, Tooltip, Switch, Popconfirm, Empty, Modal, Tag, DatePicker, Tabs, Divider,
    InputNumber, Radio, Checkbox
} from 'antd';
import dayjs from 'dayjs';
import {
    PlusOutlined, SaveOutlined, LockOutlined, UnlockOutlined,
    DeleteOutlined, SettingOutlined, LayoutOutlined, EyeOutlined, EditOutlined,
    InfoCircleOutlined, FilterOutlined, CloseCircleOutlined, SyncOutlined, CalendarOutlined, CloudUploadOutlined,
    AimOutlined, SafetyCertificateOutlined
} from '@ant-design/icons';
import GridLayout from 'react-grid-layout';
import axios from 'axios';
import { DashboardsUrl, OrganizationsUrl } from '../utils/network';
import { getAuthToken, getCurrentUser } from '../utils/functions';
import DataFetchWrapper from '../components/Dashboard/DataFetchWrapper';
import FilterWidget from '../components/Dashboard/FilterWidget';
import WidgetWizard from '../components/Dashboard/WidgetWizard';
import TemplateSelectorModal from '../components/Dashboard/TemplateSelectorModal';
import { useDashboard } from '../contexts/DashboardContext';
import { DashboardProvider } from '../contexts/DashboardContext';
import { BlackButton, WhiteButton } from '../components';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

// Widget size constraints
const WIDGET_SIZES: Record<string, { w: number; h: number }> = {
    kpi: { w: 3, h: 4 },
    kpi_card: { w: 3, h: 4 },
    trend: { w: 6, h: 8 },
    breakdown: { w: 6, h: 8 },
    chart: { w: 6, h: 8 },
    funnel: { w: 6, h: 8 },
    table: { w: 6, h: 10 },
    activity: { w: 4, h: 10 },
    list: { w: 4, h: 10 },
};

const DRILL_DOWN_MAP: Record<string, { source: string; title: string, type: string }> = {
    'due_invoices_amount': { source: 'due_invoices', title: 'Outstanding Invoices', type: 'activity' },
    'pipeline_value': { source: 'recent_invoices', title: 'Pipeline Details', type: 'activity' },
    'total_revenue': { source: 'recent_payments', title: 'Revenue Details', type: 'activity' },
    'total_leads': { source: 'recent_activities', title: 'Lead Activities', type: 'activity' },
};

const DashboardBuilder: React.FC<{ hideHeader?: boolean }> = ({ hideHeader }) => {
    return (
        <DashboardProvider>
            <DashboardContent hideHeader={hideHeader} />
        </DashboardProvider>
    );
};

const DashboardContent: React.FC<{ hideHeader?: boolean }> = ({ hideHeader }) => {
    const [dashboards, setDashboards] = useState<any[]>([]);
    const [allDashboards, setAllDashboards] = useState<any[]>([]);
    const [currentDashboard, setCurrentDashboard] = useState<any>(null);
    const [layout, setLayout] = useState<any[]>([]);
    const [widgets, setWidgets] = useState<any[]>([]);
    const { globalFilters, setGlobalFilters, clearFilter } = useDashboard();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isLayoutLocked, setIsLayoutLocked] = useState(false);
    const [editingDashboard, setEditingDashboard] = useState<any>(null);
    const [editingWidget, setEditingWidget] = useState<any>(null);
    const [isWidgetConfigOpen, setIsWidgetConfigOpen] = useState(false);
    const [globalDateRange, setGlobalDateRange] = useState<any>(dayjs());
    const [roles, setRoles] = useState<any[]>([]);
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [containerWidth, setContainerWidth] = useState(1200);
    const [drillDownWidget, setDrillDownWidget] = useState<any>(null);
    const [form] = Form.useForm();
    const [widgetForm] = Form.useForm();
    const [filterOptions, setFilterOptions] = useState<any[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const currentOrgId = localStorage.getItem('current_org_id');

    const currentUser = getCurrentUser();
    const isSuperuser = currentUser?.organizations?.some((o: any) => o.role === 'Superuser') || false;

    useEffect(() => {
        fetchDashboards();
        fetchRoles();
        if (isSuperuser) fetchOrganizations();
    }, []);

    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                // clientWidth excludes the vertical scrollbar width.
                // We subtract the 48px padding (24px on each side) of the grid container.
                setContainerWidth(containerRef.current.clientWidth - 48);
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        const observer = new ResizeObserver(updateWidth);
        if (containerRef.current) observer.observe(containerRef.current);

        return () => {
            window.removeEventListener('resize', updateWidth);
            observer.disconnect();
        };
    }, []);

    const fetchDashboards = async () => {
        try {
            setLoading(true);
            const headers = getAuthToken();
            if (!headers) return;
            const response = await axios.get(DashboardsUrl, headers);
            setDashboards(response.data);
            if (response.data.length > 0 && !currentDashboard) {
                selectDashboard(response.data[0]);
            }
        } catch (error) {
            message.error('Failed to load dashboards');
        } finally {
            setLoading(false);
        }
    };

    const fetchAllDashboards = async () => {
        try {
            const headers = getAuthToken();
            if (!headers) return;
            const response = await axios.get(`${DashboardsUrl}?show_all=true`, headers);
            setAllDashboards(response.data);
        } catch (error) {
            console.error('Failed to load all dashboards');
        }
    };

    const fetchRoles = async () => {
        try {
            const headers = getAuthToken();
            if (!headers) return;
            const orgId = localStorage.getItem('current_org_id');
            if (!orgId) return;
            const response = await axios.get(`http://127.0.0.1:8000/api/user/organizations/${orgId}/roles`, headers);
            setRoles(response.data);
        } catch (error) {
            console.error('Failed to fetch roles');
        }
    };

    const fetchOrganizations = async () => {
        try {
            const headers = getAuthToken();
            if (!headers) return;
            const response = await axios.get(OrganizationsUrl, headers);
            setOrganizations(response.data);
        } catch (error) {
            console.error('Failed to fetch organizations');
        }
    };

    // Synchronize widget default values to global filters context
    useEffect(() => {
        if (widgets && widgets.length > 0) {
            const defaults: any = {};
            widgets.forEach((w: any) => {
                if (w.widget_type === 'control' && w.config?.defaultValue) {
                    defaults[w.data_source] = w.config.defaultValue;
                }
            });

            // Only update if there are defaults to set
            if (Object.keys(defaults).length > 0) {
                setGlobalFilters((prev: any) => ({ ...defaults, ...prev }));
            }
        }
    }, [widgets]);

    useEffect(() => {
        if (isWidgetConfigOpen && editingWidget?.widget_type === 'control') {
            fetchFilterOptions(editingWidget.data_source);
        }
    }, [isWidgetConfigOpen, editingWidget]);

    const fetchFilterOptions = async (dataSource: string) => {
        setLoadingOptions(true);
        const headers = getAuthToken();
        if (!headers) return;

        try {
            let url = '';
            if (dataSource === 'rep_id') {
                const orgId = localStorage.getItem('current_org_id');
                url = `http://127.0.0.1:8000/api/user/organizations/${orgId}/members/`;
            } else if (dataSource === 'branch_id') {
                url = 'http://127.0.0.1:8000/api/masterdata/branches/';
            } else if (dataSource === 'customer_id') {
                url = 'http://127.0.0.1:8000/api/masterdata/customers/';
            } else if (dataSource === 'source') {
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

    const selectDashboard = (db: any) => {
        if (!db) return;
        setCurrentDashboard(db);

        const widgetsWithIds = (db.widgets || []).map((w: any, index: number) => ({
            ...w,
            id: w.id || `widget-${Date.now()}-${index}`
        }));
        setWidgets(widgetsWithIds);

        // Build layout
        const dbLayout = widgetsWithIds.map((w: any, index: number) => {
            const size = WIDGET_SIZES[w.widget_type] || WIDGET_SIZES.chart;
            return {
                i: w.id.toString(),
                x: w.layout?.x ?? ((index * 3) % 12),
                y: w.layout?.y ?? Math.floor(index / 4) * size.h,
                w: w.layout?.w ?? size.w,
                h: w.layout?.h ?? size.h,
            };
        });
        setLayout(dbLayout);
    };

    const onLayoutChange = (newLayout: readonly any[]) => {
        const mutableLayout = [...newLayout];
        setLayout(mutableLayout);
        const updatedWidgets = widgets.map(w => {
            const layoutItem = mutableLayout.find((l: any) => l.i === w.id.toString());
            if (layoutItem) {
                return { ...w, layout: { x: layoutItem.x, y: layoutItem.y, w: layoutItem.w, h: layoutItem.h } };
            }
            return w;
        });
        setWidgets(updatedWidgets);
    };

    const handleMakeTemplate = async () => {
        if (!currentDashboard) return;
        try {
            setLoading(true);
            const headers = getAuthToken();
            if (!headers) return;

            await axios.patch(`${DashboardsUrl}${currentDashboard.id}/`, { is_template: true }, headers);
            message.success('Dashboard converted to template successfully!');
            fetchDashboards();
            // Stays active and visible
        } catch (error) {
            console.error('Failed to convert to template:', error);
            message.error('Failed to convert to template');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDashboard = async () => {
        if (!currentDashboard) return;
        try {
            setLoading(true);
            const headers = getAuthToken();
            if (!headers) return;

            const payload = {
                name: currentDashboard.name,
                description: currentDashboard.description,
                is_locked: currentDashboard.is_locked,
                is_active: currentDashboard.is_active,
                widgets: widgets.map(w => ({
                    title: w.title,
                    widget_type: w.widget_type,
                    chart_library: w.chart_library || 'none',
                    data_source: w.data_source,
                    config: w.config || {},
                    layout: w.layout || { x: 0, y: 0, w: 4, h: 4 },
                    is_active: w.is_active !== false
                }))
            };

            const response = await axios.patch(`${DashboardsUrl}${currentDashboard.id}/`, payload, headers);
            message.success('Space saved');
            selectDashboard(response.data);
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Failed to save');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDashboard = async (values: any) => {
        try {
            setLoading(true);
            const headers = getAuthToken();
            if (!headers) return;

            const payload: any = {
                name: values.name,
                description: values.description,
                is_active: values.is_active !== false,
                is_locked: values.is_locked || false,
                shared_with_roles: values.shared_with_roles || [],
                widgets: []
            };

            if (isSuperuser) {
                payload.organization = values.organization || currentOrgId;
            }

            const response = await axios.post(DashboardsUrl, payload, headers);
            message.success('Space created');
            setIsCreateModalOpen(false);
            form.resetFields();
            await fetchDashboards();
            selectDashboard(response.data);
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Failed to create');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateDashboard = async (values: any) => {
        if (!editingDashboard) return;
        try {
            setLoading(true);
            const headers = getAuthToken();
            if (!headers) return;

            const payload: any = {
                name: values.name,
                description: values.description,
                is_active: values.is_active !== false,
                is_locked: values.is_locked || false,
                shared_with_roles: values.shared_with_roles || []
            };

            if (isSuperuser && values.organization) {
                payload.organization = values.organization;
            }

            const response = await axios.patch(`${DashboardsUrl}${editingDashboard.id}/`, payload, headers);
            message.success('Space updated');
            setIsCreateModalOpen(false);
            form.resetFields();
            setEditingDashboard(null);
            await fetchDashboards();
            await fetchAllDashboards();

            if (currentDashboard?.id === editingDashboard.id) {
                selectDashboard(response.data);
            }
        } catch (error) {
            message.error('Failed to update dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDashboard = async (id: number) => {
        try {
            setLoading(true);
            const headers = getAuthToken();
            if (!headers) return;

            await axios.delete(`${DashboardsUrl}${id}/`, headers);
            message.success('Space deleted');

            if (currentDashboard?.id === id) {
                setCurrentDashboard(null);
                setWidgets([]);
                setLayout([]);
            }

            await fetchDashboards();
            await fetchAllDashboards();
        } catch (error) {
            message.error('Failed to delete dashboard');
        } finally {
            setLoading(false);
        }
    };


    const handleEditDashboard = (dashboard: any) => {
        setEditingDashboard(dashboard);
        form.setFieldsValue({
            name: dashboard.name,
            description: dashboard.description,
            is_active: dashboard.is_active,
            is_locked: dashboard.is_locked,
            shared_with_roles: dashboard.shared_with_roles || [],
            organization: dashboard.organization ? dashboard.organization.toString() : undefined
        });
        setIsCreateModalOpen(true);
    };

    const handleToggleDashboardActive = async (dashboardId: number, isActive: boolean) => {
        try {
            const headers = getAuthToken();
            if (!headers) return;
            await axios.patch(`${DashboardsUrl}${dashboardId}/`, { is_active: isActive }, headers);
            message.success(isActive ? 'Space activated' : 'Space deactivated');
            fetchAllDashboards();
            fetchDashboards();
        } catch (error) {
            message.error('Failed to update space status');
        }
    };

    const addWidget = (wizardData: any) => {
        const { widget_type, data_source, title, config } = wizardData;
        const newId = Date.now();
        const size = WIDGET_SIZES[widget_type] || WIDGET_SIZES.chart;

        // Find next Y position
        const maxY = layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);

        const newWidget = {
            id: newId,
            title: title || `New ${widget_type}`,
            widget_type,
            chart_library: config.library || 'none',
            data_source,
            config: { backgroundColor: '#ffffff', textColor: '#1a1a1a', accentColor: '#1890ff', ...config },
            layout: { x: 0, y: maxY, w: size.w, h: size.h }
        };

        const newLayoutItem = {
            i: newId.toString(),
            x: 0,
            y: maxY,
            w: size.w,
            h: size.h,
        };

        setWidgets([...widgets, newWidget]);
        setLayout([...layout, newLayoutItem]);
        setIsWizardOpen(false);
        message.success('Widget added');
    };

    const removeWidget = (widgetId: any) => {
        setWidgets(widgets.filter(w => w.id !== widgetId));
        setLayout(layout.filter(l => l.i !== widgetId.toString()));
        message.success('Widget removed');
    };

    const handleOpenWidgetConfig = (widget: any) => {
        setEditingWidget(widget);
        widgetForm.setFieldsValue({
            title: widget.title,
            widget_type: widget.widget_type,
            data_source: widget.data_source,
            chart_library: widget.chart_library || 'none',
            timeRange: widget.config?.timeRange || 'last_30_days',
            chartType: widget.config?.chartType || 'line',
            backgroundColor: widget.config?.backgroundColor || '#ffffff',
            textColor: widget.config?.textColor || '#1a1a1a',
            accentColor: widget.config?.accentColor || '#1890ff',
            targetValue: widget.config?.targets?.value,
            targetPeriod: widget.config?.targets?.period || 'monthly',
            thresholdOperator: widget.config?.thresholds?.operator || 'gt',
            thresholdWarning: widget.config?.thresholds?.warning,
            thresholdCritical: widget.config?.thresholds?.critical,
            showGoals: widget.config?.showGoals !== false,
            defaultValue: widget.data_source === 'date_range' && widget.config?.defaultValue && typeof widget.config.defaultValue === 'string'
                ? widget.config.defaultValue.split(',').map((d: string) => dayjs(d))
                : widget.config?.defaultValue,
            isLocked: widget.config?.isLocked || false,
            isHidden: widget.config?.isHidden || false,
        });
        setIsWidgetConfigOpen(true);
    };

    const handleWidgetClick = (widget: any) => {
        if (!isPreviewMode) return; // Only drill down in preview mode

        const drillDown = DRILL_DOWN_MAP[widget.data_source];
        if (drillDown) {
            setDrillDownWidget({
                ...widget,
                title: drillDown.title,
                widget_type: drillDown.type,
                data_source: drillDown.source,
                config: { ...widget.config, limit: 50 } // Show more in drill down
            });
        }
    };

    const handleSaveWidgetConfig = (values: any) => {
        if (!editingWidget) return;

        // Handle ColorPicker objects vs strings
        const getHex = (val: any) => typeof val === 'string' ? val : val?.toHexString?.() || val;

        const updatedWidgets = widgets.map(w =>
            w.id === editingWidget.id
                ? {
                    ...w,
                    title: values.title,
                    widget_type: values.widget_type,
                    data_source: values.data_source,
                    chart_library: values.chart_library,
                    config: {
                        ...w.config,
                        library: values.chart_library,
                        timeRange: values.timeRange,
                        chartType: values.chartType,
                        backgroundColor: getHex(values.backgroundColor),
                        textColor: getHex(values.textColor),
                        accentColor: getHex(values.accentColor),
                        targets: {
                            value: values.targetValue,
                            period: values.targetPeriod
                        },
                        thresholds: {
                            operator: values.thresholdOperator,
                            warning: values.thresholdWarning,
                            critical: values.thresholdCritical
                        },
                        showGoals: values.showGoals,
                        defaultValue: (w.data_source === 'date_range' && Array.isArray(values.defaultValue))
                            ? values.defaultValue.map((d: any) => d.format('YYYY-MM-DD')).join(',')
                            : values.defaultValue,
                        isLocked: values.isLocked,
                        isHidden: values.isHidden,
                    }
                }
                : w
        );

        setWidgets(updatedWidgets);
        setIsWidgetConfigOpen(false);
        setEditingWidget(null);
        widgetForm.resetFields();
        message.success('Widget updated');
    };

    const getDateInfo = (widget: any, gDate: any) => {
        // Priority 1: Use specific config from widget creation if set to an absolute range
        if (widget.config?.timeRange === 'all_time') return "Showing all-time historical data";
        if (widget.config?.timeRange === 'future') return "Showing upcoming future jobs/estimates";

        const date = dayjs(gDate);
        const today = dayjs();
        const isCurrentMonth = date.isSame(today, 'month');
        const displayEnd = isCurrentMonth ? "Today" : date.endOf('month').format('MMM D');

        if (widget.config?.timeRange === 'last_7_days') return `Fixed range: 7 days ending ${displayEnd}`;
        if (widget.config?.timeRange === 'last_30_days') return `Fixed range: 30 days ending ${displayEnd}`;
        if (widget.config?.timeRange === 'last_90_days') return `Fixed range: 90 days ending ${displayEnd}`;
        if (widget.config?.timeRange === 'last_6_months') return `Fixed range: 6 months ending ${displayEnd}`;
        if (widget.config?.timeRange === 'last_12_months') return `Fixed range: 12 months ending ${displayEnd}`;
        if (widget.config?.timeRange === 'this_year') return `Fixed range: YTD ending ${displayEnd}`;

        // Priority 2: Use global dashboard month filter
        if (date.isValid()) {
            const start = date.startOf('month');
            const end = isCurrentMonth ? today : date.endOf('month');
            const days = end.isBefore(start) ? 0 : end.diff(start, 'day') + 1;
            return `Full Month: ${date.format('MMMM YYYY')} (Data up to ${displayEnd})`;
        }
        return "Standard range";
    };

    const ROW_HEIGHT = 30;
    const MARGIN = 16;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: hideHeader ? 'transparent' : '#f5f7fa' }}>
            {/* Header */}
            <div style={{
                padding: hideHeader ? '0 0 16px 0' : '8px 16px',
                background: hideHeader ? 'transparent' : '#fff',
                borderBottom: hideHeader ? 'none' : '1px solid #e8e8e8',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0
            }}>
                <Space size={16}>
                    {!hideHeader && <Title level={4} style={{ margin: 0 }}>Spaces</Title>}
                    <Select
                        placeholder="Select space"
                        style={{ width: 220 }}
                        value={currentDashboard?.id}
                        onChange={(val) => selectDashboard(dashboards.find(d => d.id === val))}
                    >
                        {dashboards.map(d => (
                            <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>
                        ))}
                    </Select>
                    {currentDashboard && (
                        <DatePicker
                            picker="month"
                            value={globalDateRange}
                            onChange={(date) => setGlobalDateRange(date)}
                            style={{ width: 180 }}
                            allowClear={false}
                        />
                    )}
                    {Object.keys(globalFilters).length > 0 && (
                        <Button
                            type="primary"
                            danger
                            ghost
                            icon={<SyncOutlined />}
                            onClick={() => setGlobalFilters({})}
                        >
                            Reset
                        </Button>
                    )}
                </Space>

                <Space size={8}>
                    {!isPreviewMode && currentDashboard && (
                        <>
                            <Tooltip title="Convert to Blueprint">
                                <Popconfirm
                                    title="Convert to Blueprint?"
                                    description="This space will become a blueprint while remaining in your active list. It will also be available in the 'Blueprints' selector for others to use."
                                    onConfirm={handleMakeTemplate}
                                    okText="Yes, Convert"
                                    cancelText="No"
                                >
                                    <Button
                                        icon={<CloudUploadOutlined />}
                                        type="default"
                                    />
                                </Popconfirm>
                            </Tooltip>
                        </>
                    )}
                    <Tooltip title="New from Blueprint">
                        <WhiteButton
                            icon={<LayoutOutlined />}
                            onClick={() => setIsTemplateModalOpen(true)}
                        >
                            Blueprints
                        </WhiteButton>
                    </Tooltip>
                    <Tooltip title="Manage">
                        <WhiteButton icon={<SettingOutlined />} onClick={() => { fetchAllDashboards(); setIsManageModalOpen(true); }} />
                    </Tooltip>
                    <Tooltip title={isPreviewMode ? "Exit Preview" : "Preview"}>
                        <Button
                            icon={<EyeOutlined />}
                            onClick={() => setIsPreviewMode(!isPreviewMode)}
                            disabled={!currentDashboard}
                            type={isPreviewMode ? 'primary' : 'default'}
                        />
                    </Tooltip>
                    <Tooltip title="Save">
                        <BlackButton
                            icon={<SaveOutlined />}
                            onClick={handleSaveDashboard}
                            loading={loading}
                            disabled={!currentDashboard || isPreviewMode}
                        />
                    </Tooltip>
                    <Tooltip title="Add Widget">
                        <BlackButton
                            icon={<PlusOutlined />}
                            onClick={() => setIsWizardOpen(true)}
                            disabled={!currentDashboard || isPreviewMode}
                        />
                    </Tooltip>
                </Space>
            </div>

            {/* Preview Banner */}
            {isPreviewMode && (
                <div style={{ padding: '8px 16px', background: '#1890ff', color: '#fff', textAlign: 'center' }}>
                    <EyeOutlined /> Preview Mode
                    <Button size="small" onClick={() => setIsPreviewMode(false)} style={{ marginLeft: '16px' }}>Exit</Button>
                </div>
            )}

            {/* Active Filters Bar Removed per user request */}

            {/* Grid Area */}
            <div ref={containerRef} style={{ flex: 1, overflow: 'auto', padding: hideHeader ? '0' : '8px 16px' }}>
                {widgets.length > 0 ? (
                    <GridLayout
                        layout={layout}
                        onLayoutChange={onLayoutChange as any}
                        rowHeight={ROW_HEIGHT}
                        width={containerWidth}
                        margin={[MARGIN, MARGIN] as [number, number]}
                        containerPadding={[0, 0] as [number, number]}
                        isDraggable={!isPreviewMode && !isLayoutLocked}
                        isResizable={!isPreviewMode && !isLayoutLocked}
                        draggableHandle=".drag-handle"
                        compactType="vertical"
                        {...{ cols: 12 } as any}
                    >
                        {widgets.map((widget) => {
                            const bgColor = widget.config?.backgroundColor || '#ffffff';
                            const textColor = widget.config?.textColor || '#1a1a1a';
                            const accentColor = widget.config?.accentColor || '#1890ff';

                            return (
                                <div key={widget.id}>
                                    <Card
                                        size="small"
                                        title={
                                            <div className={!isPreviewMode ? "drag-handle" : undefined} style={{ cursor: !isPreviewMode ? 'move' : 'default', display: 'flex', alignItems: 'center', width: '100%' }}>
                                                <span style={{ color: textColor }}>{widget.title}</span>
                                                {widget.config?.isHidden && (
                                                    <Tag color="orange" icon={<EyeOutlined />} style={{ marginRight: 0 }}>Hidden</Tag>
                                                )}
                                                <Tooltip title={getDateInfo(widget, globalDateRange)}>
                                                    <InfoCircleOutlined style={{ marginLeft: 8, fontSize: 12, opacity: 0.6, color: textColor }} />
                                                </Tooltip>
                                            </div>
                                        }
                                        extra={!isPreviewMode && (
                                            <Space size={8}>
                                                <Tooltip title="Configure">
                                                    <SettingOutlined
                                                        style={{ color: accentColor, cursor: 'pointer' }}
                                                        onClick={() => handleOpenWidgetConfig(widget)}
                                                    />
                                                </Tooltip>
                                                <Popconfirm title="Remove?" onConfirm={() => removeWidget(widget.id)}>
                                                    <DeleteOutlined style={{ color: '#ff4d4f', cursor: 'pointer' }} />
                                                </Popconfirm>
                                            </Space>
                                        )}
                                        style={{
                                            height: '100%',
                                            background: bgColor,
                                            borderRadius: '8px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            opacity: widget.config?.isInvisible ? 0.6 : 1,
                                        }}
                                        headStyle={{
                                            background: `linear-gradient(135deg, ${accentColor}10 0%, transparent 100%)`,
                                            borderBottom: '1px solid #f0f0f0',
                                            minHeight: '40px',
                                            padding: '0 12px',
                                        }}
                                        bodyStyle={{
                                            flex: 1,
                                            padding: '12px',
                                            overflow: 'hidden',
                                            minHeight: 0,
                                        }}
                                    >
                                        {widget.widget_type === 'control' ? (
                                            <FilterWidget
                                                {...widget}
                                                config={{ ...widget.config }}
                                            />
                                        ) : (
                                            <DataFetchWrapper
                                                {...widget}
                                                widget_type={widget.widget_type}
                                                data_source={widget.data_source}
                                                config={{ ...widget.config, dateRange: globalDateRange }}
                                                onClick={() => handleWidgetClick(widget)}
                                            />
                                        )}
                                    </Card>
                                </div>
                            );
                        })}
                    </GridLayout>
                ) : (
                    <Empty style={{ marginTop: '10%' }} description="No widgets. Click 'Add Widget' to start." />
                )}
            </div>

            {/* Template Selector Modal */}
            <TemplateSelectorModal
                visible={isTemplateModalOpen}
                onClose={() => setIsTemplateModalOpen(false)}
                onTemplateSelected={(dashboardId) => {
                    fetchDashboards();
                    // The fetchDashboards will update dashboards list, 
                    // and selectDashboard will be called when we find the new ID
                    const checkNewDashboard = setInterval(async () => {
                        const headers = getAuthToken();
                        if (headers) {
                            const response = await axios.get(DashboardsUrl, headers);
                            const newDb = response.data.find((d: any) => d.id === dashboardId);
                            if (newDb) {
                                selectDashboard(newDb);
                                clearInterval(checkNewDashboard);
                            }
                        }
                    }, 500);
                    setTimeout(() => clearInterval(checkNewDashboard), 5000);
                }}
            />

            {/* Widget Wizard */}
            <WidgetWizard
                visible={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onAdd={addWidget}
            />

            {/* Drill Down Modal */}
            <Modal
                title={drillDownWidget?.title}
                open={!!drillDownWidget}
                onCancel={() => setDrillDownWidget(null)}
                footer={[
                    <WhiteButton key="close" onClick={() => setDrillDownWidget(null)}>
                        Close
                    </WhiteButton>
                ]}
                width={800}
                bodyStyle={{ height: '500px', overflow: 'auto' }}
                destroyOnClose
            >
                {drillDownWidget && (
                    <DataFetchWrapper
                        {...drillDownWidget}
                        config={{ ...drillDownWidget.config, dateRange: globalDateRange }}
                    />
                )}
            </Modal>

            {/* Create/Edit Dashboard Modal */}
            <Modal
                title={null}
                open={isCreateModalOpen}
                onCancel={() => { setIsCreateModalOpen(false); setEditingDashboard(null); form.resetFields(); }}
                footer={null}
                destroyOnClose
            >
                <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '8px' }}>
                    <Form
                        layout="vertical"
                        onFinish={editingDashboard ? handleUpdateDashboard : handleCreateDashboard}
                        form={form}
                        initialValues={{ is_active: true, is_locked: false, shared_with_roles: [] }}
                    >
                        {isSuperuser && (
                            <Form.Item name="organization" label="Organization" help="Defaults to your currently active organization">
                                <Select placeholder="Select organization..." allowClear>
                                    {organizations.map(org => (
                                        <Select.Option key={org.id} value={org.id.toString()}>{org.name}</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        )}
                        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                            <Input placeholder="Space name" />
                        </Form.Item>
                        <Form.Item name="description" label="Description">
                            <Input.TextArea rows={2} placeholder="Optional description" />
                        </Form.Item>
                        <Form.Item name="shared_with_roles" label="Share with Roles">
                            <Select mode="multiple" placeholder="Select roles..." options={roles.map(r => ({ label: r.name, value: r.id }))} allowClear />
                        </Form.Item>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="is_active" label="Active" valuePropName="checked">
                                    <Switch />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="is_locked" label="Locked" valuePropName="checked">
                                    <Switch />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item>
                            <BlackButton
                                htmlType="submit"
                                block
                                loading={loading}
                            >
                                Save
                            </BlackButton>
                        </Form.Item>
                    </Form>
                </div>
            </Modal>

            {/* Widget Configuration Modal */}
            <Modal
                title="Configure Widget"
                open={isWidgetConfigOpen}
                onCancel={() => { setIsWidgetConfigOpen(false); setEditingWidget(null); widgetForm.resetFields(); }}
                footer={null}
                destroyOnClose
                width={700}
            >
                <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '8px' }}>
                    <Form
                        layout="vertical"
                        form={widgetForm}
                        onFinish={handleSaveWidgetConfig}
                    >
                        {/* Basic Settings */}
                        <Title level={5} style={{ fontSize: '14px', marginBottom: '16px' }}>Basic Settings</Title>
                        <Form.Item name="title" label="Widget Title" rules={[{ required: true }]}>
                            <Input placeholder="Widget title" />
                        </Form.Item>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="widget_type" label="Widget Type" rules={[{ required: true }]}>
                                    <Select>
                                        <Select.Option value="kpi">KPI - Single Metric</Select.Option>
                                        <Select.Option value="trend">Trend - Time Series</Select.Option>
                                        <Select.Option value="breakdown">Breakdown - Category</Select.Option>
                                        <Select.Option value="funnel">Funnel - Stage</Select.Option>
                                        <Select.Option value="table">Table - Records</Select.Option>
                                        <Select.Option value="activity">Activity - Timeline</Select.Option>
                                        <Select.Option value="Calendar">Calendar - Events</Select.Option>
                                        <Select.Option value="control">Control - Filter/Input</Select.Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            {editingWidget?.widget_type !== 'control' && editingWidget?.widget_type !== 'kpi' && (
                                <Col span={12}>
                                    <Form.Item name="chart_library" label="Chart Library">
                                        <Select>
                                            <Select.Option value="none">None</Select.Option>
                                            <Select.Option value="recharts">Fluid Motion</Select.Option>
                                            <Select.Option value="google_charts">Executive Suite</Select.Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                            )}
                        </Row>

                        <Form.Item name="data_source" label="Data Source" rules={[{ required: true }]}>
                            <Select showSearch>
                                <Select.OptGroup label="Metrics">
                                    <Select.Option value="total_leads">Total Leads</Select.Option>
                                    <Select.Option value="total_revenue">Total Revenue</Select.Option>
                                    <Select.Option value="win_rate">Win Rate</Select.Option>
                                    <Select.Option value="active_jobs">Active Jobs</Select.Option>
                                    <Select.Option value="average_deal_size">Avg Deal Size</Select.Option>
                                </Select.OptGroup>
                                <Select.OptGroup label="Trends">
                                    <Select.Option value="revenue_trends">Revenue Trends</Select.Option>
                                    <Select.Option value="lead_volume">Lead Volume</Select.Option>
                                    <Select.Option value="pipeline_value">Pipeline Value</Select.Option>
                                </Select.OptGroup>
                                <Select.OptGroup label="Breakdowns">
                                    <Select.Option value="branch_performance">Branch Performance</Select.Option>
                                    <Select.Option value="deals_by_stage">Deals by Stage</Select.Option>
                                    <Select.Option value="lead_source_distribution">Leads by Source</Select.Option>
                                    <Select.Option value="revenue_by_service_type">Revenue by Service</Select.Option>
                                </Select.OptGroup>
                                <Select.OptGroup label="Activities">
                                    <Select.Option value="upcoming_jobs">Upcoming Jobs</Select.Option>
                                    <Select.Option value="recent_activities">Recent Activities</Select.Option>
                                    <Select.Option value="site_visits">Site Visits</Select.Option>
                                </Select.OptGroup>
                            </Select>
                        </Form.Item>

                        {editingWidget?.widget_type !== 'control' && (
                            <>
                                <Divider />

                                {/* Data Configuration */}
                                <Title level={5} style={{ fontSize: '14px', marginBottom: '16px' }}>Data Configuration</Title>

                                <Form.Item name="timeRange" label="Default Time Range">
                                    <Select>
                                        <Select.Option value="last_7_days">Last 7 Days (Past)</Select.Option>
                                        <Select.Option value="last_30_days">Last 30 Days (Past)</Select.Option>
                                        <Select.Option value="last_90_days">Last 90 Days (Past)</Select.Option>
                                        <Select.Option value="last_6_months">Last 6 Months (Past)</Select.Option>
                                        <Select.Option value="last_12_months">Last 12 Months (Past)</Select.Option>
                                        <Select.Option value="this_year">This Year (YTD)</Select.Option>
                                        <Select.Option value="all_time">All Time (Historical)</Select.Option>
                                        {['table', 'activity', 'Calendar'].includes(editingWidget?.widget_type) && (
                                            <Select.Option value="future">Future Jobs (Forward Looking)</Select.Option>
                                        )}
                                    </Select>
                                </Form.Item>

                                <Form.Item name="chartType" label="Chart Type">
                                    <Select>
                                        <Select.Option value="line">Line</Select.Option>
                                        <Select.Option value="area">Area</Select.Option>
                                        <Select.Option value="bar">Bar</Select.Option>
                                        <Select.Option value="pie">Pie</Select.Option>
                                        <Select.Option value="Funnel">Funnel</Select.Option>
                                    </Select>
                                </Form.Item>

                                {!['table', 'activity', 'Calendar'].includes(editingWidget?.widget_type) && (
                                    <>
                                        <Form.Item name="showGoals" valuePropName="checked">
                                            <Checkbox>Show Goals, Targets & Health Status on Card</Checkbox>
                                        </Form.Item>

                                        <Divider />

                                        {/* Goals & Thresholds */}
                                        <Title level={5} style={{ fontSize: '14px', marginBottom: '16px' }}><AimOutlined /> Goals & Thresholds</Title>
                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Form.Item name="targetValue" label="Target Goal Value">
                                                    <InputNumber style={{ width: '100%' }} placeholder="e.g. 100000" />
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item name="targetPeriod" label="Goal Period">
                                                    <Select>
                                                        <Select.Option value="daily">Daily</Select.Option>
                                                        <Select.Option value="weekly">Weekly</Select.Option>
                                                        <Select.Option value="monthly">Monthly</Select.Option>
                                                        <Select.Option value="quarterly">Quarterly</Select.Option>
                                                        <Select.Option value="yearly">Yearly</Select.Option>
                                                    </Select>
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        <Row gutter={16}>
                                            <Col span={24}>
                                                <Form.Item name="thresholdOperator" label="Status Logic">
                                                    <Radio.Group size="small">
                                                        <Radio.Button value="gt">Higher is Better</Radio.Button>
                                                        <Radio.Button value="lt">Lower is Better</Radio.Button>
                                                    </Radio.Group>
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Form.Item name="thresholdWarning" label="Warning (Yellow)">
                                                    <InputNumber style={{ width: '100%' }} />
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item name="thresholdCritical" label="Critical (Red)">
                                                    <InputNumber style={{ width: '100%' }} />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                    </>
                                )}

                                <Divider />
                            </>
                        )}

                        {editingWidget?.widget_type === 'control' && (
                            <>
                                <Divider />
                                <Title level={5} style={{ fontSize: '14px', marginBottom: '16px' }}>Filter Configuration</Title>
                                <Form.Item name="defaultValue" label="Default Value (Pre-selected on load)">
                                    {editingWidget?.data_source === 'date_range' ? (
                                        <DatePicker.RangePicker
                                            style={{ width: '100%' }}
                                        />
                                    ) : (
                                        <Select
                                            style={{ width: '100%' }}
                                            placeholder="Select Default Value"
                                            allowClear
                                            loading={loadingOptions}
                                            options={
                                                editingWidget?.data_source === 'source' ? filterOptions :
                                                    (Array.isArray(filterOptions) ? filterOptions.map(item => {
                                                        if (editingWidget?.data_source === 'rep_id') {
                                                            return {
                                                                value: item.id || item.user?.id,
                                                                label: item.full_name || item.user?.full_name || item.email || item.user?.email
                                                            };
                                                        }
                                                        if (editingWidget?.data_source === 'branch_id') {
                                                            return { value: item.id, label: item.name };
                                                        }
                                                        if (editingWidget?.data_source === 'customer_id') {
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

                                <Form.Item name="isLocked" valuePropName="checked">
                                    <Checkbox>Lock Filter (Users cannot change value on dashboard)</Checkbox>
                                </Form.Item>

                                <Form.Item name="isHidden" valuePropName="checked">
                                    <Checkbox>Make Hidden (Apply filter hidden from UI)</Checkbox>
                                </Form.Item>
                            </>
                        )}

                        {/* Styling */}
                        <Title level={5} style={{ fontSize: '14px', marginBottom: '16px' }}>Styling</Title>
                        <Row gutter={16}>
                            <Col span={8}>
                                <Form.Item name="backgroundColor" label="Background">
                                    <ColorPicker showText format="hex" />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item name="textColor" label="Text">
                                    <ColorPicker showText format="hex" />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item name="accentColor" label="Accent">
                                    <ColorPicker showText format="hex" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item style={{ marginBottom: 0 }}>
                            <BlackButton
                                htmlType="submit"
                                block
                            >
                                Save
                            </BlackButton>
                        </Form.Item>
                    </Form>
                </div >
            </Modal >

            {/* Manage Dashboards Modal */}
            < Modal
                title={
                    < div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '24px' }}>
                        <span>Saved Spaces</span>
                        <BlackButton
                            icon={<PlusOutlined />}
                            onClick={() => {
                                setIsManageModalOpen(false);
                                setIsCreateModalOpen(true);
                                setEditingDashboard(null);
                                form.setFieldsValue({
                                    name: '',
                                    description: '',
                                    is_active: true,
                                    is_locked: false,
                                    shared_with_roles: [],
                                    organization: currentOrgId // Pre-select active org
                                });
                            }}
                        >
                            Create New Space
                        </BlackButton>
                    </div >
                }
                open={isManageModalOpen}
                onCancel={() => setIsManageModalOpen(false)}
                footer={null}
                width={700}
            >
                <div style={{ maxHeight: '500px', overflow: 'auto', marginTop: '16px', padding: '8px' }}>
                    <Row gutter={[16, 16]}>
                        {allDashboards.map(dashboard => (
                            <Col span={6} key={dashboard.id}>
                                <Card
                                    hoverable
                                    onClick={() => { setIsManageModalOpen(false); selectDashboard(dashboard); setIsPreviewMode(true); }}
                                    style={{
                                        textAlign: 'center',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        position: 'relative',
                                        borderRadius: '8px',
                                        padding: '12px 4px',
                                        border: dashboard.id === currentDashboard?.id ? '2px solid #5b6cf9' : undefined
                                    }}
                                    bodyStyle={{ padding: '8px' }}
                                >
                                    {/* Action Buttons */}
                                    <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: '4px' }}>
                                        <Popconfirm
                                            title="Delete Space?"
                                            onConfirm={(e) => { e?.stopPropagation(); handleDeleteDashboard(dashboard.id); }}
                                            onCancel={(e) => e?.stopPropagation()}
                                            okText="Yes"
                                            cancelText="No"
                                        >
                                            <Button
                                                type="text"
                                                size="small"
                                                danger
                                                icon={<DeleteOutlined style={{ fontSize: '11px' }} />}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </Popconfirm>
                                    </div>

                                    <div style={{ position: 'absolute', top: 4, left: 4 }}>
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<EditOutlined style={{ fontSize: '11px', color: '#5b6cf9' }} />}
                                            onClick={(e) => { e.stopPropagation(); setIsManageModalOpen(false); handleEditDashboard(dashboard); }}
                                        />
                                    </div>

                                    <div style={{ fontSize: '32px', marginBottom: '8px', color: '#5b6cf9' }}>
                                        <LayoutOutlined />
                                    </div>

                                    <Text strong style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }} ellipsis>
                                        {dashboard.name}
                                    </Text>

                                    <div style={{ marginBottom: '8px' }}>
                                        <Tag color={dashboard.is_active ? 'green' : 'red'} style={{ fontSize: '9px', margin: 0 }}>
                                            {dashboard.is_active ? 'ACTIVE' : 'INACTIVE'}
                                        </Tag>
                                    </div>

                                    <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 'auto' }}>
                                        <Switch
                                            checked={dashboard.is_active}
                                            onChange={(checked) => handleToggleDashboardActive(dashboard.id, checked)}
                                            size="small"
                                        />
                                    </div>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </div>
            </Modal >

            <TemplateSelectorModal
                visible={isTemplateModalOpen}
                onClose={() => setIsTemplateModalOpen(false)}
                onTemplateSelected={(dashboardId) => {
                    fetchDashboards();
                    // The fetchDashboards will update dashboards list, 
                    // and selectDashboard will be called when we find the new ID
                    const checkNewDashboard = setInterval(async () => {
                        const headers = getAuthToken();
                        if (headers) {
                            const response = await axios.get(DashboardsUrl, headers);
                            const newDb = response.data.find((d: any) => d.id === dashboardId);
                            if (newDb) {
                                selectDashboard(newDb);
                                clearInterval(checkNewDashboard);
                            }
                        }
                    }, 500);
                    setTimeout(() => clearInterval(checkNewDashboard), 5000);
                }}
            />
        </div >
    );
};

export default DashboardBuilder;
