import React from 'react';
import { Typography, Space } from 'antd';

const { Text } = Typography;

interface WidgetFrameProps {
    title: string;
    actions?: React.ReactNode;
    footer?: React.ReactNode;
    children: React.ReactNode;
    headerClassName?: string;
    config?: {
        backgroundColor?: string;
        textColor?: string;
        accentColor?: string;
    };
}

const WidgetFrame: React.FC<WidgetFrameProps> = ({
    title,
    actions,
    footer,
    children,
    headerClassName,
    config = {}
}) => {
    const {
        backgroundColor = '#ffffff',
        textColor = '#000000',
        accentColor = '#5b6cf9'
    } = config;

    return (
        <div style={{
            background: backgroundColor,
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: `1px solid ${accentColor}22`,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%'
        }}>
            {/* Header */}
            <div
                className={headerClassName}
                style={{
                    height: '40px',
                    padding: '0 16px',
                    background: `${accentColor}08`,
                    borderBottom: `1px solid ${accentColor}15`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0,
                    cursor: headerClassName ? 'move' : 'default'
                }}
            >
                <Text strong style={{
                    color: textColor,
                    fontSize: '14px',
                    fontWeight: 600
                }}>
                    {title}
                </Text>
                <Space size="small">
                    {actions}
                </Space>
            </div>

            {/* Content */}
            <div style={{
                flex: 1,
                padding: '16px',
                overflow: 'auto',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column'
            }}>
                {children}
            </div>

            {/* Footer */}
            {footer && (
                <div style={{
                    height: '24px',
                    padding: '0 16px',
                    borderTop: `1px solid #f0f0f0`,
                    display: 'flex',
                    alignItems: 'center',
                    background: '#fafafa',
                    flexShrink: 0
                }}>
                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        {footer}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WidgetFrame;
