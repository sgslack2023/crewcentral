import React, { useContext } from 'react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadarChart,
    PolarGrid, PolarAngleAxis as _PolarAngleAxis, PolarRadiusAxis as _PolarRadiusAxis, Radar, LabelList, ReferenceLine
} from 'recharts';
import { DashboardContext } from '../../contexts/DashboardContext';

const PolarAngleAxis = _PolarAngleAxis as any;
const PolarRadiusAxis = _PolarRadiusAxis as any;

interface RechartsWrapperProps {
    title: string;
    data: any[];
    config: any;
    loading?: boolean;
    headerClassName?: string;
    isEditMode?: boolean;
    onRemove?: () => void;
    onConfigure?: () => void;
}

const COLORS = ['#5b6cf9', '#2fc25b', '#facc14', '#223273', '#8543e0', '#13c2c2', '#3436c7'];

const RechartsWrapper: React.FC<RechartsWrapperProps> = ({
    title, data = [], config
}) => {
    // Use context directly to make it optional (works outside DashboardProvider)
    const dashboardContext = useContext(DashboardContext);
    const applyFilter = dashboardContext?.applyFilter;

    const handleChartClick = (entry: any) => {
        if (applyFilter && config?.enable_click && config?.click_action === 'filter_dashboard') {
            const filterKey = config.click_target?.filter_field || config.xAxisKey || 'category';
            // Entry might be from a Bar (payload) or a Pie (direct object)
            const value = entry?.name || entry?.[config.xAxisKey || 'category'] || entry?.label || entry?.payload?.[config.xAxisKey || 'category'] || entry?.payload?.name;
            if (value) applyFilter(filterKey, value);
        }
    };
    const renderChart = () => {
        const chartType = config?.chartType || 'bar';
        const accentColor = config?.accentColor || '#5b6cf9';

        const commonProps = {
            data: data,
            margin: { top: 5, right: 5, bottom: 5, left: 0 }
        };

        const grid = <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />;
        const xAxis = <XAxis dataKey={config?.xAxisKey || 'date'} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8c8c8c' }} />;
        const yAxis = <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8c8c8c' }} />;
        const tooltip = <Tooltip
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        />;

        const targetValue = config?.targets?.value;
        const targetLine = targetValue ? (
            <ReferenceLine
                y={targetValue}
                stroke="#faad14"
                strokeDasharray="3 3"
                label={{ position: 'right', value: 'Goal', fill: '#faad14', fontSize: 10 }}
            />
        ) : null;

        switch (chartType) {
            case 'area':
                return (
                    <AreaChart {...commonProps}>
                        {grid}
                        {xAxis}
                        {yAxis}
                        {tooltip}
                        {targetLine}
                        <Area
                            type="monotone"
                            dataKey={config?.yAxisKey || 'value'}
                            stroke={accentColor}
                            fill={accentColor}
                            fillOpacity={0.15}
                            strokeWidth={2}
                        />
                    </AreaChart>
                );
            case 'line':
                return (
                    <LineChart {...commonProps}>
                        {grid}
                        {xAxis}
                        {yAxis}
                        {tooltip}
                        {targetLine}
                        <Line
                            type="monotone"
                            dataKey={config?.yAxisKey || 'value'}
                            stroke={accentColor}
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#fff', strokeWidth: 2 }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                    </LineChart>
                );
            case 'pie':
                return (
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius="60%"
                            outerRadius="85%"
                            paddingAngle={5}
                            dataKey={config?.yAxisKey || 'value'}
                            label
                        >
                            {data.map((entry, index) => {
                                const filterKey = config.click_target?.filter_field || config.xAxisKey || 'category';
                                const entryValue = entry.name || entry[config.xAxisKey || 'category'] || entry.label;
                                const isActive = dashboardContext?.globalFilters[filterKey] === entryValue;
                                return (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={isActive ? '#ffa940' : (index === 0 ? accentColor : COLORS[index % COLORS.length])}
                                        onClick={() => handleChartClick(entry)}
                                        style={{ cursor: config?.enable_click ? 'pointer' : 'default' }}
                                    />
                                );
                            })}
                        </Pie>
                        {tooltip}
                    </PieChart>
                );
            case 'radar':
                return (
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                        <PolarGrid stroke="#f0f0f0" />
                        <PolarAngleAxis dataKey={config?.xAxisKey || 'subject'} tick={{ fontSize: 11, fill: '#8c8c8c' }} />
                        <PolarRadiusAxis axisLine={false} tick={false} />
                        <Radar
                            name={title}
                            dataKey={config?.yAxisKey || 'value'}
                            stroke={accentColor}
                            fill={accentColor}
                            fillOpacity={0.5}
                        />
                    </RadarChart>
                );
            case 'bar':
            default:
                return (
                    <BarChart {...commonProps}>
                        {grid}
                        {xAxis}
                        {yAxis}
                        {tooltip}
                        {targetLine}
                        <Bar
                            dataKey={config?.yAxisKey || 'value'}
                            fill={accentColor}
                            radius={[4, 4, 0, 0]}
                            barSize={32}
                            onClick={(data) => handleChartClick(data)}
                            style={{ cursor: config?.enable_click ? 'pointer' : 'default' }}
                        >
                            <LabelList dataKey={config?.yAxisKey || 'value'} position="top" style={{ fontSize: '10px', fill: '#666' }} />
                            {data.map((entry, index) => {
                                const filterKey = config.click_target?.filter_field || config.xAxisKey || 'category';
                                const entryValue = entry.name || entry[config.xAxisKey || 'category'] || entry.label;
                                const isActive = dashboardContext?.globalFilters[filterKey] === entryValue;
                                return (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={isActive ? '#ffa940' : (index === 0 ? accentColor : COLORS[index % COLORS.length])}
                                    />
                                );
                            })}
                        </Bar>
                    </BarChart>
                );
        }
    };

    return (
        <div style={{ height: '100%', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
            </ResponsiveContainer>
        </div>
    );
};

export default RechartsWrapper;
