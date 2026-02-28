import React from 'react';
import { Button } from 'antd';
import type { ButtonProps } from 'antd';

interface WhiteButtonProps extends ButtonProps {
  children?: React.ReactNode;
}

const WhiteButton: React.FC<WhiteButtonProps> = ({ children, style, ...props }) => {
  return (
    <Button
      {...props}
      style={{
        backgroundColor: '#ffffff',
        borderColor: '#d9d9d9',
        color: '#000000',
        fontWeight: 500,
        height: '32px',
        padding: '4px 15px',
        fontSize: '14px',
        borderRadius: '6px',
        transition: 'all 0.3s ease',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        lineHeight: '22px',
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#fafafa';
        e.currentTarget.style.borderColor = '#b8b8b8';
        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#ffffff';
        e.currentTarget.style.borderColor = '#d9d9d9';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
      }}
    >
      {children}
    </Button>
  );
};

export default WhiteButton;
