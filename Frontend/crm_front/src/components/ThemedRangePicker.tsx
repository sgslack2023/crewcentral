import React from 'react';
import { DatePicker } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';

const { RangePicker } = DatePicker;

const ThemedRangePicker: React.FC<any> = ({ style, ...props }) => {
    return (
        <RangePicker
            suffixIcon={<CalendarOutlined style={{ color: '#8c8c8c', fontSize: '14px' }} />}
            {...props}
            style={{
                height: '32px',
                borderRadius: '6px',
                border: '1px solid #d9d9d9',
                backgroundColor: '#ffffff',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                ...style
            }}
            className="themed-rangepicker"
        />
    );
};

export default ThemedRangePicker;
