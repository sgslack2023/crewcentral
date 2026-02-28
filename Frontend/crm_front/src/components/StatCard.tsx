import React from 'react';
import { Card } from 'antd';
import { PropagateLoader } from 'react-spinners';

export interface StatCardProps {
  title: string;
  value: number | string;
  prefix?: React.ReactNode;
  helperText?: string;
  loading?: boolean;
  accentColor?: string; // e.g. '#2563eb'
}

const formatNumber = (val: number | string) => {
  if (typeof val === 'number') {
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return val;
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  prefix,
  helperText,
  loading = false,
  accentColor = '#2563eb',
}) => {
  return (
    <Card
      bordered={false}
      style={{
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        background: '#ffffff',
      }}
      bodyStyle={{ padding: '20px' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {title}
          </div>
          {helperText && (
            <div style={{ marginTop: '4px', fontSize: '11px', color: '#9ca3af' }}>
              {helperText}
            </div>
          )}
          <div style={{ marginTop: '8px' }}>
            {loading ? (
              <div style={{ height: '34px', display: 'flex', alignItems: 'center' }}>
                <PropagateLoader color="#5b6cf9" size={6} />
              </div>
            ) : (
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937', lineHeight: 1.1 }}>
                {typeof value === 'number' ? `$${formatNumber(value)}` : value}
              </div>
            )}
          </div>
        </div>

        {prefix && (
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: '#fafafa',
              border: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accentColor,
              flexShrink: 0,
              fontSize: '20px',
            }}
          >
            {prefix}
          </div>
        )}
      </div>
    </Card>
  );
};

export default StatCard;

