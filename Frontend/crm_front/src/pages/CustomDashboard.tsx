import React, { useState, useEffect, useRef } from 'react';
import { Typography, Space, Select, DatePicker, Tag, Empty, Card, Tooltip, Button } from 'antd';
import { LayoutOutlined, CalendarOutlined, InfoCircleOutlined, FilterOutlined, CloseCircleOutlined, SyncOutlined, ZoomInOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import GridLayout from 'react-grid-layout';
import axios from 'axios';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { DashboardsUrl } from '../utils/network';
import { getAuthToken } from '../utils/functions';
import DataFetchWrapper from '../components/Dashboard/DataFetchWrapper';
import { BlackButton, WhiteButton, PageLoader, ThemedSelect, ThemedDatePicker } from '../components';
import FilterWidget from '../components/Dashboard/FilterWidget';
import dayjs, { Dayjs } from 'dayjs';
import { useDashboard } from '../contexts/DashboardContext';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Simple card-based dashboard - no complex grid layout
const CustomDashboard: React.FC = () => {
    const [dashboards, setDashboards] = useState<any[]>([]);
    const [currentDashboard, setCurrentDashboard] = useState<any>(null);
    const [currentDashboardId, setCurrentDashboardId] = useState<string | undefined>(undefined); // Added for Select value
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState<Dayjs>(dayjs());
    const [containerWidth, setContainerWidth] = useState(1200);
    const [focusedWidgetId, setFocusedWidgetId] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const { globalFilters, setGlobalFilters, clearFilter } = useDashboard();

    useEffect(() => {
        fetchDashboards();
    }, []);

    useEffect(() => {
        if (dashboards.length > 0 && !currentDashboardId) {
            setCurrentDashboardId(dashboards[0].id);
            setCurrentDashboard(dashboards[0]);
        }
    }, [dashboards, currentDashboardId]);

    useEffect(() => {
        if (currentDashboardId) {
            setCurrentDashboard(dashboards.find(d => d.id === currentDashboardId));
        }
    }, [currentDashboardId, dashboards]);

    useEffect(() => {
        if (currentDashboard?.widgets) {
            const defaults: any = {};
            currentDashboard.widgets.forEach((w: any) => {
                if (w.widget_type === 'control' && w.config?.defaultValue) {
                    defaults[w.data_source] = w.config.defaultValue;
                }
            });
            if (Object.keys(defaults).length > 0) {
                // Merge defaults into current filters if they are not already set
                setGlobalFilters((prev: any) => ({ ...defaults, ...prev }));
            }
        }
    }, [currentDashboard]);


    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                // clientWidth excludes vertical scrollbars, ensuring the grid doesn't overflow
                setContainerWidth(containerRef.current.clientWidth);
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    const layout = React.useMemo(() => {
        if (!currentDashboard?.widgets) return [];
        return currentDashboard.widgets
            .filter((w: any) => !w.config?.isHidden)
            .map((w: any) => ({
                i: w.id.toString(),
                x: w.layout?.x || 0,
                y: w.layout?.y || 0,
                w: w.layout?.w || 4,
                h: w.layout?.h || 4,
                static: true // Disable all dragging and resizing
            }));
    }, [currentDashboard]);

    const fetchDashboards = async () => {
        try {
            setLoading(true);
            const headers = getAuthToken();
            if (!headers) return;

            const response = await axios.get(DashboardsUrl, headers);
            setDashboards(response.data);
            if (response.data.length > 0) {
                setCurrentDashboard(response.data[0]);
                setCurrentDashboardId(response.data[0].id);
            }
        } catch (error) {
            console.error('Failed to load dashboards', error);
        } finally {
            setLoading(false);
        }
    };

    const getDateInfo = (widget: any, gDate: any) => {
        // Priority 1: Use specific config from widget creation if set to an absolute range
        if (widget.config?.timeRange === 'all_time') return "Showing all-time historical data";
        if (widget.config?.timeRange === 'future') return "Showing upcoming future jobs/estimates";

        const date = dayjs(gDate);
        const today = dayjs();
        const isCurrentMonth = date.isSame(today, 'month');
        const displayEnd = isCurrentMonth ? "Today" : date.endOf('month').format('MMM D');

        if (widget.config?.timeRange === 'last_7_days') return `Fixed range: 7 days ending ${displayEnd} `;
        if (widget.config?.timeRange === 'last_30_days') return `Fixed range: 30 days ending ${displayEnd} `;
        if (widget.config?.timeRange === 'last_90_days') return `Fixed range: 90 days ending ${displayEnd} `;
        if (widget.config?.timeRange === 'last_6_months') return `Fixed range: 6 months ending ${displayEnd} `;
        if (widget.config?.timeRange === 'last_12_months') return `Fixed range: 12 months ending ${displayEnd} `;
        if (widget.config?.timeRange === 'this_year') return `Fixed range: YTD ending ${displayEnd} `;

        // Priority 2: Use global dashboard month filter
        if (date.isValid()) {
            const start = date.startOf('month');
            const end = isCurrentMonth ? today : date.endOf('month');
            const days = end.isBefore(start) ? 0 : end.diff(start, 'day') + 1;
            return `Full Month: ${date.format('MMMM YYYY')} (Data up to ${displayEnd})`;
        }
        return "Standard range";
    };
    const handleReset = () => {
        const defaults: any = {};
        if (currentDashboard?.widgets) {
            currentDashboard.widgets.forEach((w: any) => {
                if (w.widget_type === 'control' && w.config?.defaultValue) {
                    defaults[w.data_source] = w.config.defaultValue;
                }
            });
        }
        setGlobalFilters(defaults);
    };

    const hasUserChanges = React.useMemo(() => {
        if (!currentDashboard?.widgets) return false;
        return currentDashboard.widgets.some((w: any) => {
            if (w.widget_type !== 'control') return false;
            const currentVal = globalFilters[w.data_source];
            const defaultVal = w.config?.defaultValue || null;

            // Handle cases where one might be null and other undefined
            if (!currentVal && !defaultVal) return false;
            return currentVal !== defaultVal;
        });
    }, [currentDashboard, globalFilters]);

    if (loading) {
        return <PageLoader text="Building your workspace..." />;
    }

    const ROW_HEIGHT = 30;
    const MARGIN = 12;

    const focusedWidget = currentDashboard?.widgets?.find((w: any) => w.id.toString() === focusedWidgetId);

    return (
        <div style={{ padding: '12px 16px 20px 16px', height: '100%', overflow: 'auto', background: '#f5f7fa', position: 'relative' }}>
            {focusedWidget && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 2000,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '40px',
                    backdropFilter: 'blur(10px)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ color: 'white', margin: 0, fontSize: '28px' }}>{focusedWidget.title}</h2>
                        <Button
                            type="primary"
                            shape="circle"
                            icon={<FullscreenExitOutlined />}
                            size="large"
                            onClick={() => setFocusedWidgetId(null)}
                        />
                    </div>
                    <div style={{ flex: 1, background: focusedWidget.config?.backgroundColor || '#ffffff', borderRadius: '12px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
                        <DataFetchWrapper
                            {...focusedWidget}
                            widget_type={focusedWidget.widget_type}
                            data_source={focusedWidget.data_source}
                            config={{ ...focusedWidget.config, dateRange }}
                        />
                    </div>
                </div>
            )}

            <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1a1a2e' }}>
                            {currentDashboard?.name || 'Dashboard'}
                        </h1>
                        <p style={{ color: '#8e8ea8', margin: '4px 0 0 0', fontSize: '13px' }}>
                            {currentDashboard?.description || 'Designed and assembled by you'}
                        </p>
                    </div>
                    <Space size="middle">
                        {hasUserChanges && (
                            <Tooltip title="Reset Filters">
                                <Button
                                    type="text"
                                    danger
                                    icon={<SyncOutlined style={{ fontSize: '18px' }} />}
                                    onClick={handleReset}
                                />
                            </Tooltip>
                        )}
                        <ThemedSelect
                            style={{ width: 240 }}
                            placeholder="Select Dashboard"
                            value={currentDashboardId}
                            onChange={setCurrentDashboardId}
                            prefixIcon={<LayoutOutlined />}
                        >
                            {dashboards.map(d => (
                                <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>
                            ))}
                        </ThemedSelect>
                        <ThemedDatePicker
                            picker="month"
                            value={dateRange}
                            onChange={(date) => date && setDateRange(date)}
                            allowClear={false}
                            style={{ width: 150 }}
                            prefixIcon={<CalendarOutlined />}
                        />
                    </Space>
                </div>

                {/* Widgets Grid Area */}
                {currentDashboard && currentDashboard.widgets?.length > 0 ? (
                    <GridLayout
                        layout={layout}
                        rowHeight={ROW_HEIGHT}
                        width={containerWidth}
                        margin={[MARGIN, MARGIN]}
                        containerPadding={[8, 0]}
                        isDraggable={false}
                        isResizable={false}
                        {...{ cols: 12 } as any}
                    >
                        {currentDashboard.widgets
                            .filter((v: any) => !v.config?.isHidden)
                            .map((widget: any) => {
                                const bgColor = widget.config?.backgroundColor || '#ffffff';
                                const textColor = widget.config?.textColor || '#1a1a1a';
                                const accentColor = widget.config?.accentColor || '#1890ff';

                                return (
                                    <div key={widget.id}>
                                        <Card
                                            size="small"
                                            title={
                                                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                                    <span style={{ color: textColor, flex: 1 }}>{widget.title}</span>
                                                    <Space size={8}>
                                                        <Tooltip title={getDateInfo(widget, dateRange)}>
                                                            <InfoCircleOutlined style={{ fontSize: 12, opacity: 0.6, color: textColor }} />
                                                        </Tooltip>
                                                        <Tooltip title="Focus Mode">
                                                            <FullscreenOutlined
                                                                style={{ fontSize: 13, cursor: 'pointer', color: textColor }}
                                                                onClick={() => setFocusedWidgetId(widget.id.toString())}
                                                            />
                                                        </Tooltip>
                                                        {widget.config?.enable_click && (
                                                            <Tooltip title="Click chart to filter dashboard">
                                                                <ZoomInOutlined style={{ fontSize: 13, color: accentColor, opacity: 0.8 }} />
                                                            </Tooltip>
                                                        )}
                                                    </Space>
                                                </div>
                                            }
                                            style={{
                                                height: '100%',
                                                background: bgColor,
                                                borderRadius: '8px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                overflow: 'hidden',
                                            }}
                                            headStyle={{
                                                background: `linear-gradient(135deg, ${accentColor}10 0%, transparent 100%)`,
                                                borderBottom: '1px solid #f0f0f0',
                                                minHeight: '40px',
                                            }}
                                            bodyStyle={{
                                                flex: 1,
                                                padding: '12px',
                                                overflow: 'hidden',
                                                minHeight: 0
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
                                                    config={{ ...widget.config, dateRange }}
                                                />
                                            )}
                                        </Card>
                                    </div>
                                );
                            })}
                    </GridLayout>
                ) : (
                    <Empty
                        style={{ marginTop: '10%' }}
                        description={dashboards.length > 0 ? "This space has no widgets." : "No spaces found. Create one in Settings."}
                    />
                )}
            </div>
        </div>
    );
};

export default CustomDashboard;
