import React from 'react';
import { Calendar, Badge, Tooltip, Tag } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

interface CalendarWidgetProps {
    data: any[];
    loading?: boolean;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ data }) => {
    const navigate = useNavigate();

    const getListData = (value: dayjs.Dayjs) => {
        if (!data || !Array.isArray(data)) return [];
        return data.filter(item => dayjs(item.start).isSame(value, 'day'));
    };

    const dateCellRender = (value: dayjs.Dayjs) => {
        const listData = getListData(value);
        return (
            <ul className="events" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {listData.map((item) => (
                    <li key={item.id} style={{ marginBottom: '2px' }}>
                        <Tooltip title={`${item.title} - ${item.status}`}>
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/site-visit-capture/${item.id}`);
                                }}
                                style={{
                                    fontSize: '10px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    background: item.status === 'COMPLETED' ? '#f0f2ff' : '#fff7e6',
                                    color: item.status === 'COMPLETED' ? '#5b6cf9' : '#fa8c16',
                                    padding: '1px 4px',
                                    borderRadius: '4px',
                                    border: `1px solid ${item.status === 'COMPLETED' ? '#c7d2ff' : '#ffd591'}`,
                                    cursor: 'pointer'
                                }}
                            >
                                {item.title}
                            </div>
                        </Tooltip>
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div style={{ height: '100%', overflow: 'auto' }}>
            <Calendar
                fullscreen={false}
                dateCellRender={dateCellRender}
                headerRender={({ value, type, onChange, onTypeChange }) => {
                    return (
                        <div style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600 }}>{value.format('MMMM YYYY')}</span>
                        </div>
                    );
                }}
            />
        </div>
    );
};

export default CalendarWidget;
