import React from 'react';
import { DatePicker } from 'antd';
import type { DatePickerProps } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';

interface ThemedDatePickerProps extends DatePickerProps {
  prefixIcon?: React.ReactNode;
}

const ThemedDatePicker: React.FC<ThemedDatePickerProps> = ({ prefixIcon, style, ...props }) => {
  return (
    <div style={{ position: 'relative', display: 'inline-block', width: style?.width || 'auto' }}>
      {prefixIcon && (
        <div style={{
          position: 'absolute',
          left: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 2,
          color: '#8c8c8c',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
          fontSize: '14px'
        }}>
          {prefixIcon}
        </div>
      )}
      <DatePicker
        suffixIcon={!prefixIcon ? <CalendarOutlined style={{ color: '#8c8c8c', fontSize: '14px' }} /> : null}
        {...props}
        style={{
          height: '32px',
          width: '100%',
          ...style
        }}
        className={`themed-datepicker ${prefixIcon ? 'has-prefix' : ''}`}
      />
      <style>{`
        .themed-datepicker {
          height: 32px !important;
          border-radius: 6px !important;
          border: 1px solid #d9d9d9 !important;
          background-color: #ffffff !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
          transition: all 0.3s ease !important;
          padding: 0 12px !important;
        }
        .themed-datepicker.has-prefix {
          padding-left: 44px !important;
        }
        .themed-datepicker:hover {
          border-color: #5b6cf9 !important;
        }
        .themed-datepicker.ant-picker-focused {
          border-color: #5b6cf9 !important;
          box-shadow: 0 0 0 2px rgba(91, 108, 249, 0.1) !important;
        }
        .themed-datepicker .ant-picker-input > input {
          font-size: 13px !important;
          color: #1a1a2e !important;
          font-weight: 500 !important;
        }
        .themed-datepicker .ant-picker-input > input::placeholder {
          color: #8e8ea8 !important;
        }
      `}</style>
    </div>
  );
};

export default ThemedDatePicker;
