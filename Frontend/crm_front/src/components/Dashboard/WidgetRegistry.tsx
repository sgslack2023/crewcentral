import React from 'react';
import KPICard from './KPICard';
import RechartsWrapper from './RechartsWrapper';
import GoogleChartsWrapper from './GoogleChartsWrapper';
import ActivityList from './ActivityList';
import CalendarWidget from './CalendarWidget';
import GoogleCalendarChart from './GoogleCalendarChart';

export type WidgetType = 'kpi' | 'trend' | 'breakdown' | 'funnel' | 'table' | 'activity' | 'kpi_card' | 'chart' | 'list' | 'Calendar';

export interface WidgetProps {
    id: string | number;
    title: string;
    type: WidgetType;
    source: string;
    config: any;
    data: any;
    loading?: boolean;
    headerClassName?: string;
    isEditMode?: boolean;
    onRemove?: () => void;
    onConfigure?: () => void;
    onClick?: () => void;
}

const WidgetRegistry: React.FC<WidgetProps> = (props) => {
    const { type, config } = props;

    switch (type) {
        case 'kpi':
        case 'kpi_card':
            return <KPICard {...props} />;

        case 'trend':
        case 'breakdown':
        case 'chart':
            // Check both root-level chart_library and config-level library
            const library = (props as any).chart_library || config.library;
            if (library === 'recharts') {
                return <RechartsWrapper {...props} />;
            }
            return <GoogleChartsWrapper {...props} />;

        case 'funnel':
            return <GoogleChartsWrapper {...props} />;

        case 'activity':
        case 'list':
        case 'table':
            return <ActivityList {...props} />;

        case 'Calendar':
            const calLibrary = (props as any).chart_library || config.library;
            if (calLibrary === 'google_charts') {
                return <GoogleCalendarChart {...props} />;
            }
            return <CalendarWidget {...props} />;

        default:
            return <div>Unknown Widget Type: {type}</div>;
    }
};

export default WidgetRegistry;

