import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { Empty, Alert, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { PropagateLoader } from 'react-spinners';
import { AnalyticsDataUrl } from '../../utils/network';
import { getAuthToken } from '../../utils/functions';
import WidgetRegistry from './WidgetRegistry';
import { DashboardContext } from '../../contexts/DashboardContext';

interface DataFetchWrapperProps {
    id: string | number;
    title: string;
    widget_type: string;
    data_source: string;
    config: any;
    headerClassName?: string;
    isEditMode?: boolean;
    onRemove?: () => void;
    onConfigure?: () => void;
    onClick?: () => void;
}

const DataFetchWrapper: React.FC<DataFetchWrapperProps> = (props) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const dashboardContext = useContext(DashboardContext);
    const globalFilters = dashboardContext?.globalFilters || {};

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const headers = getAuthToken();

            let params = `?source=${props.data_source}`;

            // NEW: Always send the global date filter if it exists
            const globalDate = dayjs(props.config.dateRange);
            if (globalDate.isValid()) {
                const start = globalDate.startOf('month').format('YYYY-MM-DD');
                let end = globalDate.endOf('month');

                // If the selected month is the current month, cap 'end' at today
                // UNLESS it's a calendar widget or specifically looking for future/site visits
                const today = dayjs();
                const isUpcomingSource = props.data_source === 'upcoming_jobs' || props.data_source === 'site_visits';
                const isCalendar = props.widget_type === 'Calendar';

                if (globalDate.isSame(today, 'month') && !isUpcomingSource && !isCalendar) {
                    end = today;
                }

                params += `&start_date=${start}&end_date=${end.format('YYYY-MM-DD')}`;
            }

            // Specific time range from widget config (e.g. 'future', 'all_time', 'last_30_days')
            if (props.config?.timeRange) {
                params += `&time_range=${props.config.timeRange}`;
            }

            if (props.config?.branch_id) params += `&branch_id=${props.config.branch_id}`;
            if (props.config?.rep_id) params += `&rep_id=${props.config.rep_id}`;

            // Data sources that should NOT receive CRM filters (rep_id, branch_id, customer_id, source)
            const excludedFromCRMFilters = [
                'expenses',
                'purchases',
                'total_expenses',
                'expense_trends',
                'expense_by_category',
                'purchase_orders',
                'vendor_spending'
            ];

            // Add dynamic global filters with f_ prefix to avoid collision
            // Skip CRM-specific filters for financial/operational data sources
            const shouldApplyCRMFilters = !excludedFromCRMFilters.includes(props.data_source);

            Object.keys(globalFilters).forEach(key => {
                const value = globalFilters[key];
                if (value !== undefined && value !== null && value !== '') {
                    // Skip CRM filters (rep_id, branch_id, customer_id, source) for excluded data sources
                    const isCRMFilter = ['rep_id', 'branch_id', 'customer_id', 'source'].includes(key);
                    if (isCRMFilter && !shouldApplyCRMFilters) {
                        return; // Skip this filter
                    }
                    params += `&f_${key}=${encodeURIComponent(value)}`;
                }
            });

            if (headers) {
                const response = await axios.get(`${AnalyticsDataUrl}${params}`, headers);
                setData(response.data.data);
            }
        } catch (error: any) {
            console.error('Widget data fetch failed:', error);
            setError(error.response?.data?.error || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [
        props.data_source,
        props.config?.dateRange?.toString(),
        props.config?.timeRange,
        props.config?.branch_id,
        props.config?.rep_id,
        JSON.stringify(globalFilters)
    ]);

    if (loading && !data) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%', 
                minHeight: '120px',
                background: '#fff', 
                borderRadius: '8px' 
            }}>
                <PropagateLoader color="#5b6cf9" size={8} />
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '24px', background: '#fff', height: '100%', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <Alert message="Error" description={error} type="error" showIcon />
                <Button icon={<ReloadOutlined />} onClick={fetchData} style={{ marginTop: '16px' }}>Retry</Button>
            </div>
        );
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
        return (
            <div style={{ padding: '24px', background: '#fff', height: '100%', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Empty description={`No data for ${props.title}`} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
        );
    }

    return (
        <WidgetRegistry
            {...props}
            type={props.widget_type as any}
            source={props.data_source}
            data={data}
            loading={loading}
            onClick={props.onClick}
        />
    );
};

export default React.memo(DataFetchWrapper);
