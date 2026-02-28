import React from 'react';
import { Button } from 'antd';
import type { ButtonProps } from 'antd';

interface BlackButtonProps extends ButtonProps {
  children?: React.ReactNode;
}

const BlackButton: React.FC<BlackButtonProps> = ({ children, style, ...props }) => {
  return (
    <Button
      {...props}
      style={{
        backgroundColor: '#000000',
        borderColor: '#000000',
        color: '#ffffff',
        fontWeight: 500,
        height: '32px',
        padding: '4px 15px',
        fontSize: '14px',
        borderRadius: '6px',
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        lineHeight: '22px',
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#1a1a1a';
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#000000';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
      }}
    >
      {children}
    </Button>
  );
};

export default BlackButton;
