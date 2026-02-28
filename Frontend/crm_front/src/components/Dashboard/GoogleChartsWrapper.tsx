import React, { useContext } from 'react';
import { Chart } from 'react-google-charts';
import { DashboardContext } from '../../contexts/DashboardContext';

interface GoogleChartsWrapperProps {
    title: string;
    data: any[];
    config: any;
    loading?: boolean;
    headerClassName?: string;
    isEditMode?: boolean;
    onRemove?: () => void;
    onConfigure?: () => void;
}

const GoogleChartsWrapper: React.FC<GoogleChartsWrapperProps> = ({
    title, data = [], config
}) => {
    const dashboardContext = useContext(DashboardContext);
    const applyFilter = dashboardContext?.applyFilter;

    const handleChartClick = (value: any) => {
        if (applyFilter && config?.enable_click && config?.click_action === 'filter_dashboard') {
            const filterKey = config.click_target?.filter_field || 'category';
            if (value) applyFilter(filterKey, value);
        }
    };
    // Google charts usually expects an array of arrays [ ['Label', 'Value'], ['A', 10], ['B', 20] ]
    const formattedData = React.useMemo(() => {
        if (!data || data.length === 0) return [];

        const headers = config?.headers || ['Category', 'Value'];

        // Robust data mapping to handle various backend responses
        const rows = data.map(item => {
            // Try to find the label from various common keys if not explicitly configured
            const label = item[config?.labelKey] ||
                item[config?.xAxisKey] ||
                item.name ||
                item.label ||
                item.category ||
                item.source ||
                item.stage ||
                item.date ||
                'Unknown';

            // Try to find the value
            const value = item[config?.valueKey] ||
                item[config?.yAxisKey] ||
                item.value ||
                item.count ||
                0;

            return [label, value];
        });

        return [headers, ...rows];
    }, [data, config]);

    const options = {
        curveType: 'function',
        legend: { position: 'bottom' },
        chartArea: { width: '90%', height: '80%' },
        ...config?.options
    };

    const chartEvents = [
        {
            eventName: "select" as any,
            callback: ({ chartWrapper }: any) => {
                const chart = chartWrapper.getChart();
                const selection = chart.getSelection();
                if (selection.length > 0) {
                    const row = selection[0].row;
                    // Google charts formattedData has headers at index 0, so row 0 in selection is data[0]
                    const labelKey = config?.labelKey || 'label';
                    const value = data[row][labelKey] || data[row]['name'] || data[row]['category'];
                    handleChartClick(value);

                    // Clear selection so the user can click the same item again immediately
                    chart.setSelection([]);
                }
            },
        },
    ];

    const getGoogleChartType = (type: string) => {
        const lower = type?.toLowerCase();
        if (lower === 'pie') return 'PieChart';
        if (lower === 'bar') return 'ColumnChart'; // Vertical bars
        if (lower === 'line') return 'LineChart';
        if (lower === 'area') return 'AreaChart';
        if (lower === 'funnel') return 'Sankey'; // Or SteppedAreaChart, but usually separate
        if (lower === 'geo') return 'GeoChart';
        return type || 'PieChart'; // Default fallback
    };

    const googleChartType = getGoogleChartType(config?.chartType);

    return (
        <div style={{ height: '100%', width: '100%' }}>
            <Chart
                chartType={googleChartType as any}
                width="100%"
                height="100%"
                data={formattedData}
                options={options}
                chartEvents={chartEvents}
                style={{ cursor: config?.enable_click ? 'pointer' : 'default' }}
            />
        </div>
    );
};

export default GoogleChartsWrapper;
