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
        borderRadius: '10px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        position: 'relative',
      }}
      bodyStyle={{ padding: '12px' }}
      hoverable
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
            {title}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {statusTag && (
              <Tag color={statusTag.color} style={{ margin: 0, fontSize: '10px' }}>
                {statusTag.label}
              </Tag>
            )}
            {tags.map((tag, idx) => (
              <Tag key={`${tag.label}-${idx}`} color={tag.color} style={{ margin: 0, fontSize: '10px' }}>
                {tag.label}
              </Tag>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          {actionNode}
          {actions.map((action, idx) => {
            const button = (
              <button
                key={idx}
                onClick={action.disabled ? undefined : action.onClick}
                disabled={action.disabled}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  background: action.disabled ? '#f9fafb' : '#ffffff',
                  color: action.disabled ? '#9ca3af' : (action.danger ? '#dc2626' : '#4b5563'),
                  cursor: action.disabled ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: action.disabled ? 0.6 : 1,
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

      {description && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280', lineHeight: 1.4 }}>
          {description}
        </div>
      )}

      {fields.length > 0 && (
        <div
          style={{
            marginTop: '10px',
            display: 'grid',
            gridTemplateColumns: `repeat(${fieldColumns}, minmax(0, 1fr))`,
            gap: '8px',
          }}
        >
          {fields.map((field, idx) => (
            <div
              key={`${field.label}-${idx}`}
              style={{
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid #f3f4f6',
                background: '#fafafa',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                {field.icon && <span style={{ fontSize: '12px', color: '#6b7280' }}>{field.icon}</span>}
                <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: 600 }}>{field.label}</span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{field.value}</div>
            </div>
          ))}
        </div>
      )}

      {(footerLeft || footerRight || footerActions) && (
        <div
          style={{
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px solid #f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            fontSize: '11px',
            color: '#9ca3af',
          }}
        >
          <div>{footerLeft}</div>
          <div style={{ marginLeft: 'auto' }}>{footerActions}</div>
          <div>{footerRight}</div>
        </div>
      )}
    </Card>
  );
};

export default SettingsCard;
