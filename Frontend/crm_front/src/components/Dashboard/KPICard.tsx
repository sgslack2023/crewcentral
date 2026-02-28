import React from 'react';
import { Typography, Progress, Badge, Tooltip } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, CheckCircleFilled, WarningFilled, CloseCircleFilled } from '@ant-design/icons';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

const { Text } = Typography;

interface KPICardProps {
    title: string;
    data: any;
    loading?: boolean;
    config?: any;
    headerClassName?: string;
    isEditMode?: boolean;
    onRemove?: () => void;
    onConfigure?: () => void;
    onClick?: () => void;
}

const KPICard: React.FC<KPICardProps> = ({ data, config, onClick }) => {
    const value = data?.value ?? 0;
    const trend = data?.trend ?? 0;
    const prefix = data?.prefix || config?.prefix || '';
    const suffix = data?.suffix || config?.suffix || '';
    const isCustom = data?.is_custom || false;
    const accentColor = config?.accentColor || '#1890ff';
    const textColor = config?.textColor || '#1a1a1a';

    const target = config?.targets?.value;
    const thresholds = config?.thresholds;

    // Helper to determine status
    const getStatusInfo = () => {
        if (!thresholds || (thresholds.warning === undefined && thresholds.critical === undefined)) {
            return null;
        }

        const { operator, warning, critical } = thresholds;
        const isGt = operator === 'gt' || !operator;

        if (isGt) {
            if (critical !== undefined && value <= critical) return { color: '#f5222d', text: 'Critical', icon: <CloseCircleFilled /> };
            if (warning !== undefined && value <= warning) return { color: '#faad14', text: 'Warning', icon: <WarningFilled /> };
            return { color: '#52c41a', text: 'Healthy', icon: <CheckCircleFilled /> };
        } else {
            if (critical !== undefined && value >= critical) return { color: '#f5222d', text: 'Critical', icon: <CloseCircleFilled /> };
            if (warning !== undefined && value >= warning) return { color: '#faad14', text: 'Warning', icon: <WarningFilled /> };
            return { color: '#52c41a', text: 'Healthy', icon: <CheckCircleFilled /> };
        }
    };

    const status = config?.showGoals !== false ? getStatusInfo() : null;

    // Format value for display
    const formatValue = (val: number) => {
        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
        return val.toLocaleString();
    };

    const progressPercent = target ? Math.min(Math.round((value / target) * 100), 100) : 0;

    return (
        <div
            onClick={onClick}
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '12px 16px',
                cursor: onClick ? 'pointer' : 'default'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    {/* Main Value */}
                    <div style={{
                        fontSize: '32px',
                        fontWeight: 700,
                        color: textColor,
                        lineHeight: 1.1,
                        marginBottom: '4px'
                    }}>
                        {prefix}{formatValue(value)}{suffix}
                    </div>

                    <div style={{
                        fontSize: '11px',
                        color: '#8c8c8c',
                        marginBottom: '4px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        {data?.subtext || "This period"}
                        {isCustom && <Badge status="processing" text={<span style={{ fontSize: '10px', color: '#5b6cf9' }}>Custom Metric</span>} />}
                    </div>
                </div>

                {status && (
                    <Tooltip title={`${status.text} Status`}>
                        <div style={{ color: status.color, fontSize: '18px' }}>
                            {status.icon}
                        </div>
                    </Tooltip>
                )}
            </div>

            {/* Trend Indicator */}
            {trend !== 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '8px'
                }}>
                    <Text
                        type={trend > 0 ? 'success' : 'danger'}
                        style={{ fontWeight: 600, fontSize: '13px' }}
                    >
                        {trend > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                        {' '}{Math.abs(trend)}%
                    </Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        vs last
                    </Text>
                </div>
            )}

            {/* Target Progress Section */}
            {config?.showGoals !== false && target > 0 && (
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <Text type="secondary">Goal: {prefix}{formatValue(target)}</Text>
                        <Text strong>{progressPercent}%</Text>
                    </div>
                    <Progress
                        percent={progressPercent}
                        size="small"
                        showInfo={false}
                        strokeColor={status ? status.color : accentColor}
                        trailColor={`${accentColor}15`}
                    />
                </div>
            )}

            {/* Mini Sparkline Chart */}
            {data?.history && data.history.length > 0 && (
                <div style={{
                    height: '40px',
                    width: '100%',
                    marginTop: 'auto'
                }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.history}>
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={status ? status.color : accentColor}
                                fill={status ? status.color : accentColor}
                                fillOpacity={0.15}
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

export default KPICard;
