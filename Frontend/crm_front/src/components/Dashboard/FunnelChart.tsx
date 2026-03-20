import React, { useState } from 'react';
import { Tooltip } from 'antd';
import { ArrowDownOutlined } from '@ant-design/icons';

interface FunnelChartProps {
    data: Array<{ step?: string; name?: string; label?: string; value?: number; count?: number }>;
    config?: any;
}

const COLORS = [
    { bg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', text: '#fff', accent: '#818cf8' },
    { bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', text: '#fff', accent: '#a78bfa' },
    { bg: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)', text: '#fff', accent: '#c084fc' },
    { bg: 'linear-gradient(135deg, #d946ef 0%, #c026d3 100%)', text: '#fff', accent: '#e879f9' },
    { bg: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', text: '#fff', accent: '#f472b6' },
];

const FunnelChart: React.FC<FunnelChartProps> = ({ data = [], config }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    if (!data || data.length === 0) {
        return (
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%',
                color: '#94a3b8',
                fontSize: '14px'
            }}>
                No data available
            </div>
        );
    }

    // Normalize data
    const normalizedData = data.map((item, index) => ({
        label: item.step || item.name || item.label || 'Unknown',
        value: item.value ?? item.count ?? 0,
        colors: COLORS[index % COLORS.length]
    }));

    const maxValue = Math.max(...normalizedData.map(d => d.value), 1);

    // Calculate conversion rates
    const getConversionRate = (index: number): string => {
        if (index === 0) return '100%';
        const prevValue = normalizedData[index - 1].value;
        if (prevValue === 0) return '0%';
        return `${((normalizedData[index].value / prevValue) * 100).toFixed(0)}%`;
    };

    const getDropoff = (index: number): number => {
        if (index === 0) return 0;
        return normalizedData[index - 1].value - normalizedData[index].value;
    };

    return (
        <div style={{ 
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
            background: '#ffffff',
            borderRadius: '12px'
        }}>
            <div style={{ 
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '0',
                position: 'relative'
            }}>
                {normalizedData.map((item, index) => {
                    const widthPercent = Math.max((item.value / maxValue) * 100, 25);
                    const isHovered = hoveredIndex === index;
                    const conversionRate = getConversionRate(index);
                    const dropoff = getDropoff(index);

                    return (
                        <React.Fragment key={index}>
                            {/* Conversion arrow between segments */}
                            {index > 0 && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '28px',
                                    position: 'relative'
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: '#f8fafc',
                                        padding: '4px 12px',
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0'
                                    }}>
                                        <ArrowDownOutlined style={{ 
                                            fontSize: '10px', 
                                            color: '#94a3b8'
                                        }} />
                                        <span style={{ 
                                            fontSize: '11px', 
                                            fontWeight: 600,
                                            color: parseFloat(conversionRate) >= 50 ? '#10b981' : '#f59e0b'
                                        }}>
                                            {conversionRate}
                                        </span>
                                        {dropoff > 0 && (
                                            <span style={{ 
                                                fontSize: '10px', 
                                                color: '#94a3b8'
                                            }}>
                                                (-{dropoff.toLocaleString()})
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Funnel segment */}
                            <Tooltip
                                title={
                                    <div style={{ padding: '8px 4px' }}>
                                        <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>
                                            {item.label}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>Count:</span>
                                            <span style={{ fontWeight: 600 }}>{item.value.toLocaleString()}</span>
                                        </div>
                                        {index > 0 && (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', marginTop: '4px' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Conversion:</span>
                                                    <span style={{ fontWeight: 600, color: '#a5f3fc' }}>{conversionRate}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', marginTop: '4px' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Drop-off:</span>
                                                    <span style={{ fontWeight: 600, color: '#fca5a5' }}>{dropoff.toLocaleString()}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                }
                                placement="right"
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={() => setHoveredIndex(index)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                >
                                    <div
                                        style={{
                                            width: `${widthPercent}%`,
                                            minWidth: '120px',
                                            height: '52px',
                                            background: item.colors.bg,
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '0 20px',
                                            color: item.colors.text,
                                            boxShadow: isHovered 
                                                ? '0 8px 25px -5px rgba(99, 102, 241, 0.4), 0 4px 10px -5px rgba(99, 102, 241, 0.2)'
                                                : '0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -2px rgba(0, 0, 0, 0.04)',
                                            transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {/* Shine effect */}
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: '50%',
                                            background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)',
                                            borderRadius: '8px 8px 0 0'
                                        }} />

                                        {/* Label */}
                                        <span style={{ 
                                            fontWeight: 600, 
                                            fontSize: '13px',
                                            position: 'relative',
                                            zIndex: 1,
                                            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                        }}>
                                            {item.label}
                                        </span>

                                        {/* Value */}
                                        <span style={{ 
                                            fontWeight: 700, 
                                            fontSize: '18px',
                                            position: 'relative',
                                            zIndex: 1,
                                            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                        }}>
                                            {item.value.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </Tooltip>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Summary footer */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid #f1f5f9'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#10b981'
                    }} />
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                        Total entries: <strong style={{ color: '#1e293b' }}>{normalizedData[0]?.value.toLocaleString()}</strong>
                    </span>
                </div>
                {normalizedData.length > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                            Overall conversion: 
                            <strong style={{ 
                                color: '#6366f1',
                                marginLeft: '4px'
                            }}>
                                {((normalizedData[normalizedData.length - 1].value / normalizedData[0].value) * 100).toFixed(1)}%
                            </strong>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FunnelChart;
