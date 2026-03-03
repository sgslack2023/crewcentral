import React from 'react';
import { Card, Tag, Tooltip } from 'antd';

export interface SettingsCardTag {
  label: string;
  color?: string;
}

export interface SettingsCardField {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}

export interface SettingsCardAction {
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  tooltip?: string;
  disabled?: boolean;
}

export interface SettingsCardProps {
  title: string;
  statusTag?: { label: string; color: string };
  tags?: SettingsCardTag[];
  description?: string;
  fields?: SettingsCardField[];
  fieldColumns?: number;
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
  actions?: SettingsCardAction[];
  actionNode?: React.ReactNode;
  footerActions?: React.ReactNode;
}

const SettingsCard: React.FC<SettingsCardProps> = ({
  title,
  statusTag,
  tags = [],
  description,
  fields = [],
  fieldColumns = 2,
  footerLeft,
  footerRight,
  actions = [],
  actionNode,
  footerActions,
}) => {
  return (
    <Card
      style={{
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        overflow: 'visible', // CRITICAL: Prevent clipping
        transition: 'all 0.2s ease',
      }}
      bodyStyle={{ padding: '20px' }}
      hoverable
    >
      {/* Header Section */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Tooltip title={title}>
            <div style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: '1.4',
              padding: '2px 0' // Extra room for header fonts
            }}>
              {title}
            </div>
          </Tooltip>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {statusTag && (
              <Tag color={statusTag.color} style={{ margin: 0, fontSize: '10px', borderRadius: '4px', fontWeight: 600 }}>
                {statusTag.label}
              </Tag>
            )}
            {tags.map((tag, idx) => (
              <Tag key={`${tag.label}-${idx}`} color={tag.color} style={{ margin: 0, fontSize: '10px', borderRadius: '4px' }}>
                {tag.label}
              </Tag>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {actionNode}
          {actions.map((action, idx) => {
            const button = (
              <button
                key={idx}
                onClick={action.disabled ? undefined : action.onClick}
                disabled={action.disabled}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: action.disabled ? '#f8fafc' : '#ffffff',
                  color: action.disabled ? '#94a3b8' : (action.danger ? '#ef4444' : '#6366f1'),
                  cursor: action.disabled ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: action.disabled ? 0.6 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                {action.icon}
              </button>
            );
            return action.tooltip ? (
              <Tooltip key={`${idx}-tooltip`} title={action.tooltip}>
                {button}
              </Tooltip>
            ) : (
              button
            );
          })}
        </div>
      </div>

      {/* Description Section */}
      {description && (
        <Tooltip title={description}>
          <div style={{
            marginBottom: '16px',
            fontSize: '12.5px',
            color: '#64748b',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {description}
          </div>
        </Tooltip>
      )}

      {/* Info Fields Grid */}
      {fields.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${fieldColumns}, minmax(0, 1fr))`,
            gap: '10px',
          }}
        >
          {fields.map((field, idx) => (
            <div
              key={`${field.label}-${idx}`}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #f1f5f9',
                background: '#f8fafc',
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px' // Space between label and value
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {field.icon && <span style={{ fontSize: '13px', color: '#94a3b8', flexShrink: 0 }}>{field.icon}</span>}
                <span style={{
                  fontSize: '11px',
                  color: '#64748b',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {field.label}
                </span>
              </div>
              <Tooltip title={typeof field.value === 'string' || typeof field.value === 'number' ? field.value : ''}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#334155',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: '1.4',
                  padding: '2px 0', // Vertical breathing room for fonts
                  minHeight: '20px'  // Ensure it doesn't collapse
                }}>
                  {field.value}
                </div>
              </Tooltip>
            </div>
          ))}
        </div>
      )}

      {/* Footer Section */}
      {(footerLeft || footerRight || footerActions) && (
        <div
          style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            fontSize: '11px',
            color: '#94a3b8',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{footerLeft}</div>
          <div style={{ marginLeft: 'auto' }}>{footerActions}</div>
          <div>{footerRight}</div>
        </div>
      )}
    </Card>
  );
};

export default SettingsCard;
