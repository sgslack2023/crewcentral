import React, { useEffect, useState } from 'react';
import { Avatar, Space } from 'antd';
import { UserOutlined, ShopOutlined, TeamOutlined, EnvironmentOutlined, FilterOutlined } from '@ant-design/icons';
import { ThemedSelect, ThemedRangePicker } from '../';
import dayjs from 'dayjs';
import axios from 'axios';
import { getAuthToken } from '../../utils/functions';
import { useDashboard } from '../../contexts/DashboardContext';
import { BaseUrl } from '../../utils/network';

const SOURCE_OPTIONS = [
    { value: 'moveit', label: 'Moveit' },
    { value: 'mymovingloads', label: 'MyMovingLoads' },
    { value: 'moving24', label: 'Moving24' },
    { value: 'baltic_website', label: 'Baltic Website' },
    { value: 'n1m_website', label: 'N1M Website' },
    { value: 'google', label: 'Google' },
    { value: 'referral', label: 'Referral' },
    { value: 'other', label: 'Other' },
];

interface FilterWidgetProps {
    id: string | number;
    title: string;
    data_source: string; // 'rep_id', 'branch_id', 'customer_id', 'source', 'date_range'
    config: any;
}

const FilterWidget: React.FC<FilterWidgetProps> = ({ id, title, data_source, config }) => {
    const { globalFilters, applyFilter, clearFilter } = useDashboard();
    const [options, setOptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (data_source === 'rep_id' || data_source === 'branch_id' || data_source === 'customer_id') {
            fetchOptions();
        }
    }, [data_source]);

    const fetchOptions = async () => {
        setLoading(true);
        const headers = getAuthToken();
        if (!headers) return;

        try {
            let url = '';
            if (data_source === 'rep_id') {
                const orgId = localStorage.getItem('current_org_id');
                url = `${BaseUrl}user/organizations/${orgId}/members/`;
            } else if (data_source === 'branch_id') {
                url = `${BaseUrl}masterdata/branches/`;
            } else if (data_source === 'customer_id') {
                url = `${BaseUrl}masterdata/customers/`;
            }

            if (url) {
                const response = await axios.get(url, headers);
                setOptions(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch filter options', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (value: any) => {
        if (!value) {
            clearFilter(data_source);
        } else {
            // For date range, value is [start, end] dayjs objects
            if (data_source === 'date_range' && value) {
                const dateString = `${value[0].format('YYYY-MM-DD')},${value[1].format('YYYY-MM-DD')}`;
                applyFilter(data_source, dateString);
            } else {
                applyFilter(data_source, value);
            }
        }
    };

    const currentValue = globalFilters[data_source];

    if (data_source === 'rep_id') {
        return (
            <div style={{ padding: '0 12px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <ThemedSelect
                    style={{ width: '100%' }}
                    placeholder="Select Sales Rep"
                    allowClear
                    showSearch
                    optionFilterProp="children"
                    loading={loading}
                    value={currentValue}
                    onChange={handleChange}
                    disabled={config?.isLocked}
                    prefixIcon={<UserOutlined />}
                    filterOption={(input, option: any) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={options.map((u: any) => ({
                        value: u.id || u.user?.id,
                        label: u.full_name || u.user?.full_name || u.email || u.user?.email
                    }))}
                />
            </div>
        );
    }

    if (data_source === 'branch_id') {
        return (
            <div style={{ padding: '0 12px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <ThemedSelect
                    style={{ width: '100%' }}
                    placeholder="Select Branch"
                    allowClear
                    loading={loading}
                    value={currentValue}
                    onChange={handleChange}
                    disabled={config?.isLocked}
                    prefixIcon={<EnvironmentOutlined />}
                    options={options.map((b: any) => ({
                        value: b.id,
                        label: b.name
                    }))}
                />
            </div>
        );
    }

    if (data_source === 'customer_id') {
        return (
            <div style={{ padding: '0 12px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <ThemedSelect
                    style={{ width: '100%' }}
                    placeholder="Select Customer"
                    allowClear
                    showSearch
                    optionFilterProp="children"
                    loading={loading}
                    value={currentValue}
                    onChange={handleChange}
                    disabled={config?.isLocked}
                    prefixIcon={<TeamOutlined />}
                    filterOption={(input, option: any) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={options.map((c: any) => ({
                        value: c.id,
                        label: `${c.first_name || ''} ${c.last_name || ''} (${c.email || 'No Email'})`
                    }))}
                />
            </div>
        );
    }

    if (data_source === 'source') {
        return (
            <div style={{ padding: '0 12px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <ThemedSelect
                    style={{ width: '100%' }}
                    placeholder="Select Lead Source"
                    allowClear
                    value={currentValue}
                    onChange={handleChange}
                    disabled={config?.isLocked}
                    prefixIcon={<FilterOutlined />}
                    options={SOURCE_OPTIONS}
                />
            </div>
        );
    }

    if (data_source === 'date_range') {
        let value = null;
        if (currentValue && typeof currentValue === 'string' && currentValue.includes(',')) {
            const [start, end] = currentValue.split(',');
            if (start && end) {
                value = [dayjs(start), dayjs(end)];
            }
        }

        return (
            <div style={{ padding: '0 12px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <ThemedRangePicker
                    style={{ width: '100%' }}
                    value={value as any}
                    onChange={handleChange}
                    disabled={config?.isLocked}
                />
            </div>
        );
    }

    // Fallback for generic text filter or others
    return null;
};

export default FilterWidget;
