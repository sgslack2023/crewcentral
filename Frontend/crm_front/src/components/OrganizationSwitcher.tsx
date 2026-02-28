import React, { useState, useEffect } from 'react';
import { Select, Typography } from 'antd';
import { ShopOutlined } from '@ant-design/icons';
import { OrganizationProps } from '../utils/types';
import { setOrganizationContext } from '../utils/functions';

const { Option } = Select;
const { Text } = Typography;

interface OrganizationSwitcherProps {
    organizations?: OrganizationProps[];
}

const OrganizationSwitcher: React.FC<OrganizationSwitcherProps> = ({ organizations }) => {
    const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);

    useEffect(() => {
        const storedOrgId = localStorage.getItem('current_org_id');
        if (storedOrgId && organizations?.some(o => o.id.toString() === storedOrgId)) {
            setCurrentOrgId(storedOrgId);
        } else if (organizations && organizations.length > 0) {
            // Default to first org if not set or invalid
            // Or find is_default
            const defaultOrg = organizations.find(o => o.is_default) || organizations[0];
            setCurrentOrgId(defaultOrg.id.toString());
            setOrganizationContext(defaultOrg.id); // Set it if missing
        }
    }, [organizations]);

    const handleChange = (value: string) => {
        setCurrentOrgId(value);
        setOrganizationContext(value);
        window.location.reload(); // Reload to refresh data with new org context
    };

    if (!organizations || organizations.length === 0) {
        return null;
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', marginRight: 16 }}>
            <ShopOutlined style={{ fontSize: '16px', marginRight: 8, color: '#667eea' }} />
            <Select
                value={currentOrgId}
                onChange={handleChange}
                style={{ width: 200, fontWeight: 500 }}
                bordered={false}
                dropdownMatchSelectWidth={250}
            >
                {organizations.map(org => (
                    <Option key={org.id} value={org.id.toString()}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <Text strong>{org.name}</Text>
                            <Text type="secondary" style={{ fontSize: '11px' }}>{org.role} • {org.org_type}</Text>
                        </div>
                    </Option>
                ))}
            </Select>
        </div>
    );
};

export default OrganizationSwitcher;
