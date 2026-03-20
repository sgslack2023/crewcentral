import React, { useState } from 'react';
import { Tooltip } from 'antd';

interface RechartsFunnelProps {
    data: Array<{ step?: string; name?: string; label?: string; value?: number; count?: number }>;
    config?: any;
}

const GRADIENT_COLORS = [
    { start: '#6366f1', end: '#4f46e5' },  // Indigo
    { start: '#8b5cf6', end: '#7c3aed' },  // Violet
    { start: '#a78bfa', end: '#8b5cf6' },  // Purple
    { start: '#c4b5fd', end: '#a78bfa' },  // Light purple
    { start: '#ddd6fe', end: '#c4b5fd' },  // Lavender
];

const RechartsFunnel: React.FC<RechartsFunnelProps> = ({ 
    data = [], 
    config
}) => {
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
    const chartData = data.map((item, index) => ({
        name: item.step || item.name || item.label || 'Unknown',
        value: item.value ?? item.count ?? 0,
        colors: GRADIENT_COLORS[index % GRADIENT_COLORS.length]
    }));

    const maxValue = Math.max(...chartData.map(d => d.value), 1);
    const totalHeight = 100;
    const segmentHeight = totalHeight / chartData.length;

    // Calculate conversion rates
    const getConversionRate = (index: number) => {
        if (index === 0) return 100;
        const prevValue = chartData[index - 1].value;
        if (prevValue === 0) return 0;
        return ((chartData[index].value / prevValue) * 100).toFixed(1);
    };

    return (
        <div style={{ 
            height: '100%', 
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 24px',
            background: 'linear-gradient(180deg, #fafbfc 0%, #ffffff 100%)',
            borderRadius: '12px'
        }}>
            {/* Funnel visualization */}
            <div style={{ 
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                minHeight: 0
            }}>
                <svg 
                    viewBox="0 0 400 300" 
                    style={{ 
                        width: '100%', 
                        height: '100%',
                        maxHeight: '280px'
                    }}
                    preserveAspectRatio="xMidYMid meet"
                >
                    <defs>
                        {chartData.map((item, index) => (
                            <linearGradient 
                                key={`gradient-${index}`} 
                                id={`funnel-gradient-${index}`} 
                                x1="0%" 
                                y1="0%" 
                                x2="100%" 
                                y2="0%"
                            >
                                <stop offset="0%" stopColor={item.colors.start} />
                                <stop offset="100%" stopColor={item.colors.end} />
                            </linearGradient>
                        ))}
                        <filter id="funnel-shadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.15"/>
                        </filter>
                        <filter id="funnel-glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="3" result="blur"/>
                            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                        </filter>
                    </defs>

                    {chartData.map((item, index) => {
                        const widthPercent = (item.value / maxValue);
                        const topWidth = index === 0 ? 360 : 360 * (chartData[index - 1].value / maxValue) * 0.95;
                        const bottomWidth = 360 * widthPercent * 0.95;
                        const y = index * (280 / chartData.length) + 10;
                        const height = (280 / chartData.length) - 4;
                        const centerX = 200;
                        
                        const isHovered = hoveredIndex === index;
                        const scale = isHovered ? 1.02 : 1;
                        
                        // Create trapezoid path
                        const path = `
                            M ${centerX - topWidth/2} ${y}
                            L ${centerX + topWidth/2} ${y}
                            L ${centerX + bottomWidth/2} ${y + height}
                            L ${centerX - bottomWidth/2} ${y + height}
                            Z
                        `;

                        return (
                            <g 
                                key={index}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                style={{ 
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                            >
                                {/* Shadow layer */}
                                <path
                                    d={path}
                                    fill={`url(#funnel-gradient-${index})`}
                                    filter="url(#funnel-shadow)"
                                    opacity={0.3}
                                    transform={`scale(${scale}) translate(${(1-scale) * -200}, ${(1-scale) * -(y + height/2)})`}
                                    style={{ transformOrigin: 'center' }}
                                />
                                
                                {/* Main shape */}
                                <path
                                    d={path}
                                    fill={`url(#funnel-gradient-${index})`}
                                    opacity={isHovered ? 1 : 0.9}
                                    transform={`scale(${scale}) translate(${(1-scale) * -200}, ${(1-scale) * -(y + height/2)})`}
                                    style={{ 
                                        transformOrigin: 'center',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}
                                />

                                {/* Highlight on top edge */}
                                <line
                                    x1={centerX - topWidth/2 + 10}
                                    y1={y + 2}
                                    x2={centerX + topWidth/2 - 10}
                                    y2={y + 2}
                                    stroke="rgba(255,255,255,0.4)"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />

                                {/* Value text */}
                                <text
                                    x={centerX}
                                    y={y + height/2 + 5}
                                    textAnchor="middle"
                                    fill="#ffffff"
                                    fontSize="16"
                                    fontWeight="700"
                                    style={{ 
                                        textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                    }}
                                >
                                    {item.value.toLocaleString()}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Legend */}
            <div style={{ 
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid #f1f5f9'
            }}>
                {chartData.map((item, index) => (
                    <Tooltip 
                        key={index}
                        title={
                            <div style={{ padding: '4px 0' }}>
                                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{item.name}</div>
                                <div>Count: {item.value.toLocaleString()}</div>
                                {index > 0 && (
                                    <div style={{ color: '#a5b4fc', marginTop: '4px' }}>
                                        Conversion: {getConversionRate(index)}%
                                    </div>
                                )}
                            </div>
                        }
                    >
                        <div 
                            style={{ 
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                background: hoveredIndex === index ? '#f8fafc' : 'transparent',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            <div style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '3px',
                                background: `linear-gradient(135deg, ${item.colors.start}, ${item.colors.end})`,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }} />
                            <span style={{ 
                                fontSize: '12px', 
                                color: '#64748b',
                                fontWeight: 500
                            }}>
                                {item.name}
                            </span>
                        </div>
                    </Tooltip>
                ))}
            </div>
        </div>
    );
};

export default RechartsFunnel;
