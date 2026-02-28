import React from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { InputProps } from 'antd';

interface ThemedSearchProps extends Omit<InputProps, 'prefix'> {
    onSearch?: (value: string) => void;
}

const ThemedSearch: React.FC<ThemedSearchProps> = ({
    placeholder = 'Search...',
    onSearch,
    style,
    ...props
}) => {
    return (
        <>
            <Input
                {...props}
                placeholder={placeholder}
                prefix={<SearchOutlined style={{ color: '#8c8c8c', fontSize: '15px' }} />}
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
                    fontSize: '13px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    color: '#1a1a2e',
                    ...style
                }}
                className="themed-search"
            />
            <style>{`
                .themed-search {
                    padding-left: 10px !important;
                }
                .themed-search .ant-input-prefix {
                    margin-right: 12px;
                }
                .themed-search:hover, .themed-search:focus, .themed-search-focused {
                    border-color: #5b6cf9 !important;
                }
                .themed-search.ant-input-affix-wrapper-focused {
                    border-color: #5b6cf9 !important;
                    box-shadow: 0 0 0 2px rgba(91, 108, 249, 0.1) !important;
                }
                .themed-search .ant-input::placeholder {
                    color: #8e8ea8 !important;
                    font-size: 13px !important;
                }
            `}</style>
        </>
    );
};

export default ThemedSearch;
