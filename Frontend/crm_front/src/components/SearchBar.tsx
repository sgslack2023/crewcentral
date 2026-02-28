import React from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { InputProps } from 'antd';

interface SearchBarProps extends Omit<InputProps, 'prefix'> {
  placeholder?: string;
  onSearch?: (value: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  placeholder = 'Search...', 
  onSearch,
  style,
  ...props 
}) => {
  return (
    <Input
      {...props}
      placeholder={placeholder}
      prefix={<SearchOutlined style={{ color: '#8c8c8c', fontSize: '16px' }} />}
      onChange={(e) => {
        if (onSearch) {
          onSearch(e.target.value);
        }
        if (props.onChange) {
          props.onChange(e);
        }
      }}
      style={{
        height: '32px',
        borderRadius: '6px',
        border: '1px solid #d9d9d9',
        backgroundColor: '#ffffff',
        fontSize: '14px',
        paddingLeft: '12px',
        transition: 'all 0.3s ease',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        ...style
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = '#1890ff';
        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(24, 144, 255, 0.1)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = '#d9d9d9';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
      }}
    />
  );
};

export default SearchBar;
