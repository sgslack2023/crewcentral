import React from 'react';
import { Select } from 'antd';
import type { SelectProps } from 'antd';
import { CaretDownOutlined } from '@ant-design/icons';

interface ThemedSelectProps extends SelectProps {
  prefixIcon?: React.ReactNode;
}

const ThemedSelect: React.FC<ThemedSelectProps> = ({
  prefixIcon,
  style,
  dropdownStyle,
  ...props
}) => {
  return (
    <div style={{ position: 'relative', display: 'inline-block', width: style?.width || '100%' }}>
      {prefixIcon && (
        <div style={{
          position: 'absolute',
          left: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          color: '#8c8c8c',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
          fontSize: '14px',
          opacity: 0.8
        }}>
          {prefixIcon}
        </div>
      )}
      <Select
        suffixIcon={<CaretDownOutlined style={{ color: '#8c8c8c', fontSize: '14px' }} />}
        {...props}
        style={{
          height: '32px',
          width: '100%',
          paddingLeft: prefixIcon ? '48px' : undefined,
          ...style,
        }}
        className={`themed-select ${prefixIcon ? 'has-prefix' : ''}`}
        dropdownStyle={{
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          padding: '4px',
          ...dropdownStyle
        }}
      />
      <style>{`
        .themed-select .ant-select-selector {
          height: 32px !important;
          border-radius: 6px !important;
          border: 1px solid #d9d9d9 !important;
          background-color: #ffffff !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
          transition: all 0.3s ease !important;
          padding: 0 12px !important;
          display: flex !important;
          align-items: center !important;
        }

        /* Nuclear option: force padding with maximum specificity */
        .themed-select.has-prefix.has-prefix .ant-select-selector.ant-select-selector {
          padding-left: 48px !important;
        }

        /* Hover & Focus */
        .themed-select:hover .ant-select-selector {
          border-color: #5b6cf9 !important;
        }
        .themed-select.ant-select-focused .ant-select-selector {
          border-color: #5b6cf9 !important;
          box-shadow: 0 0 0 2px rgba(91, 108, 249, 0.1) !important;
        }

        .themed-select .ant-select-selection-placeholder {
          line-height: 30px !important;
          font-size: 13px !important;
          color: #8e8ea8 !important;
        }
        .themed-select .ant-select-selection-item {
          line-height: 30px !important;
          font-size: 13px !important;
          color: #1a1a2e !important;
          font-weight: 500 !important;
        }
      `}</style>
    </div>
  );
};

export default ThemedSelect;
