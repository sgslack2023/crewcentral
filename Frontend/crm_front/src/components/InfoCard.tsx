import React from 'react';

export interface InfoCardTag {
    label: string;
    color: string;
    bgColor: string;
    showDot?: boolean;
}

export interface InfoCardAction {
    label: string;
    icon?: React.ReactNode;
    onClick: (e: React.MouseEvent) => void;
    danger?: boolean;
    color?: string;
}

export interface InfoCardProps {
    title: string;
    subtitle?: string;
    subtitleIcon?: React.ReactNode;
    icon: React.ReactNode;
    iconBgColor: string;
    iconColor: string;
    accentColor: string;
    badge?: {
        label: string;
        color: string;
        bgColor: string;
    };
    tags?: InfoCardTag[];
    actions?: InfoCardAction[];
    onClick?: () => void;
    highlighted?: boolean;
    highlightColor?: string;
}

const InfoCard: React.FC<InfoCardProps> = ({
    title,
    subtitle,
    subtitleIcon,
    icon,
    iconBgColor,
    iconColor,
    accentColor,
    badge,
    tags = [],
    actions = [],
    onClick,
    highlighted = false,
    highlightColor = '#10b981',
}) => {
    const [isHovered, setIsHovered] = React.useState(false);

    return (
        <div
            onClick={onClick}
            style={{
                background: '#ffffff',
                borderRadius: '10px',
                border: highlighted ? `2px solid ${highlightColor}` : '1px solid #e5e7eb',
                boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease',
                cursor: onClick ? 'pointer' : 'default',
                overflow: 'hidden',
                transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Top accent bar */}
            <div style={{ height: '3px', background: accentColor }} />

            <div style={{ padding: '12px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: tags.length > 0 ? '10px' : '0' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: iconBgColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: iconColor,
                        fontSize: '16px',
                    }}>
                        {icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{
                            margin: 0,
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#1f2937',
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                            {title}
                        </h3>
                        {subtitle && (
                            <div style={{
                                fontSize: '10px',
                                color: '#9ca3af',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                marginTop: '2px'
                            }}>
                                {subtitleIcon && <span style={{ fontSize: '9px' }}>{subtitleIcon}</span>}
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {subtitle}
                                </span>
                            </div>
                        )}
                    </div>
                    {badge && (
                        <div style={{
                            background: badge.bgColor,
                            color: badge.color,
                            padding: '2px 6px',
                            borderRadius: '10px',
                            fontSize: '9px',
                            fontWeight: 600,
                            flexShrink: 0,
                        }}>
                            {badge.label}
                        </div>
                    )}
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', marginBottom: actions.length > 0 ? '10px' : '0', flexWrap: 'wrap' }}>
                        {tags.map((tag, index) => (
                            <span
                                key={index}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    background: tag.bgColor,
                                    color: tag.color,
                                }}
                            >
                                {tag.showDot && (
                                    <span style={{
                                        width: '5px',
                                        height: '5px',
                                        borderRadius: '50%',
                                        background: tag.color,
                                    }} />
                                )}
                                {tag.label}
                            </span>
                        ))}
                    </div>
                )}

                {/* Footer Actions */}
                {actions.length > 0 && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: '10px',
                        borderTop: '1px solid #f3f4f6'
                    }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {actions.filter(a => !a.danger).map((action, index) => (
                                <button
                                    key={index}
                                    onClick={(e) => { e.stopPropagation(); action.onClick(e); }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        background: 'none',
                                        border: 'none',
                                        color: action.color || '#3b82f6',
                                        fontSize: '11px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        padding: '4px 0',
                                    }}
                                >
                                    {action.icon && <span style={{ fontSize: '11px' }}>{action.icon}</span>}
                                    {action.label}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {actions.filter(a => a.danger).map((action, index) => (
                                <ActionButton key={index} action={action} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Separate component to handle hover state for danger buttons
const ActionButton: React.FC<{ action: InfoCardAction }> = ({ action }) => {
    const [isHovered, setIsHovered] = React.useState(false);

    return (
        <button
            onClick={(e) => { e.stopPropagation(); action.onClick(e); }}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                background: isHovered ? '#fee2e2' : '#fef2f2',
                border: 'none',
                borderRadius: '6px',
                color: '#ef4444',
                cursor: 'pointer',
                transition: 'all 0.2s',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {action.icon && <span style={{ fontSize: '11px' }}>{action.icon}</span>}
        </button>
    );
};

export default InfoCard;
