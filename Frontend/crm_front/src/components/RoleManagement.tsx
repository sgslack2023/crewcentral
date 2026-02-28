import React, { FC, useState, useEffect } from 'react';
import { Button, Modal, Form, Input, Checkbox, Space, Tag, Typography, notification, Drawer, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { RoleProps, PermissionProps } from '../utils/types';
import { getRoles, getPermissions, saveRole, deleteRole } from '../utils/functions';
import BlackButton from './BlackButton';
import FixedTable from './FixedTable';

const { Title, Text } = Typography;

interface RoleManagementProps {
    hideHeader?: boolean;
}

const RoleManagement: FC<RoleManagementProps> = ({ hideHeader = false }) => {
    const [roles, setRoles] = useState<RoleProps[]>([]);
    const [permissions, setPermissions] = useState<PermissionProps[]>([]);
    const [fetching, setFetching] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [editingRole, setEditingRole] = useState<RoleProps | null>(null);
    const [form] = Form.useForm();

    const fetchData = () => {
        getRoles(setRoles, setFetching);
        getPermissions(setPermissions, () => { });
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdd = () => {
        setEditingRole(null);
        form.resetFields();
        setIsDrawerVisible(true);
    };

    const handleEdit = (role: RoleProps) => {
        setEditingRole(role);
        form.setFieldsValue({
            name: role.name,
            permissions: role.permissions || role.permissions_details?.map(p => p.id) || []
        });
        setIsDrawerVisible(true);
    };

    const handleDelete = async (id: number) => {
        Modal.confirm({
            title: 'Are you sure?',
            content: 'This will permanently delete this role.',
            onOk: async () => {
                const success = await deleteRole(id);
                if (success) {
                    notification.success({ message: 'Role deleted successfully', title: 'Success' });
                    fetchData();
                } else {
                    notification.error({ message: 'Failed to delete role', title: 'Error' });
                }
            }
        });
    };

    const handleFinish = async (values: any) => {
        const payload: RoleProps = {
            id: editingRole?.id,
            name: values.name,
            permissions: values.permissions
        };

        const success = await saveRole(payload);
        if (success) {
            notification.success({ message: `Role ${editingRole ? 'updated' : 'created'} successfully`, title: 'Success' });
            setIsDrawerVisible(false);
            fetchData();
        } else {
            notification.error({ message: `Failed to ${editingRole ? 'update' : 'create'} role`, title: 'Error' });
        }
    };

    // Group permissions by category
    const groupedPermissions = permissions.reduce((acc, curr) => {
        if (!acc[curr.category]) acc[curr.category] = [];
        acc[curr.category].push(curr);
        return acc;
    }, {} as Record<string, PermissionProps[]>);

    const columns = [
        {
            id: 'name',
            label: 'Role Name',
            width: 250,
            fixed: true,
            render: (value: any, record: RoleProps) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px' }}>
                    <SafetyCertificateOutlined style={{ fontSize: '16px', color: record.is_default_admin ? '#52c41a' : '#5b6cf9' }} />
                    <div style={{ fontWeight: 600, color: '#1a1a2e' }}>{record.name}</div>
                    {record.is_default_admin && <Tag color="gold" style={{ fontSize: '10px', marginLeft: '4px', borderRadius: '4px' }}>System Admin</Tag>}
                </div>
            )
        },
        {
            id: 'permissions',
            label: 'Permissions',
            width: 500,
            render: (value: any, record: RoleProps) => {
                if (record.is_default_admin) return (
                    <div style={{ padding: '12px 16px' }}>
                        <Tag color="blue" style={{ margin: 0, borderRadius: '4px', backgroundColor: '#f0f2ff', borderColor: '#d6e4ff', color: '#5b6cf9' }}>
                            All System Permissions
                        </Tag>
                    </div>
                );
                const perms = record.permissions_details || [];
                if (perms.length === 0) return <div style={{ color: '#8e8ea8', padding: '12px 16px', fontSize: '13px' }}>None</div>;
                return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '12px 16px' }}>
                        {perms.slice(0, 3).map(p => (
                            <Tag key={p.id} color="geekblue" style={{ margin: 0, fontSize: '11px', borderRadius: '4px' }}>{p.name}</Tag>
                        ))}
                        {perms.length > 3 && <Tag style={{ margin: 0, fontSize: '11px', borderRadius: '4px' }}>+{perms.length - 3} more</Tag>}
                    </div>
                );
            }
        },
        {
            id: 'actions',
            label: 'Actions',
            width: 100,
            render: (value: any, record: RoleProps) => (
                <Space style={{ padding: '12px 16px' }}>
                    {!record.is_default_admin && (
                        <>
                            <Button
                                icon={<EditOutlined />}
                                size="small"
                                onClick={(e) => { e.stopPropagation(); handleEdit(record); }}
                                type="text"
                                style={{ color: '#5b6cf9' }}
                            />
                            <Button
                                danger
                                icon={<DeleteOutlined />}
                                size="small"
                                onClick={(e) => { e.stopPropagation(); record.id && handleDelete(record.id); }}
                                type="text"
                            />
                        </>
                    )}
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: hideHeader ? '0' : '16px 24px', display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#fff' }}>
            {!hideHeader && (
                <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1a1a2e' }}>Roles & Access Control</h2>
                        <Text style={{ color: '#8e8ea8', fontSize: '13px' }}>Define roles and assign granular permissions for your organization members.</Text>
                    </div>
                    <BlackButton icon={<PlusOutlined />} onClick={handleAdd}>
                        Add New Role
                    </BlackButton>
                </div>
            )}

            {hideHeader && (
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <BlackButton icon={<PlusOutlined />} onClick={handleAdd}>
                        Add New Role
                    </BlackButton>
                </div>
            )}

            <div style={{ flex: 1, minHeight: 0 }}>
                <Card
                    style={{ borderRadius: '12px', overflow: 'hidden', height: 'calc(100vh - 350px)', border: '1px solid #e5e7eb' }}
                    bodyStyle={{ padding: 0, height: '100%' }}
                >
                    <FixedTable
                        columns={columns}
                        data={roles}
                        tableName="role_management_table"
                        onRowClick={(record) => !record.is_default_admin && handleEdit(record)}
                    />
                </Card>
            </div>

            <Drawer
                title={editingRole ? 'Edit Role' : 'Create New Role'}
                open={isDrawerVisible}
                onClose={() => setIsDrawerVisible(false)}
                width={600}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleFinish}
                >
                    <Card size="small" style={{ marginBottom: '16px' }} title="Role Details">
                        <Form.Item
                            name="name"
                            label="Role Name"
                            rules={[{ required: true, message: 'Please enter a role name' }]}
                        >
                            <Input placeholder="e.g. Sales Representative, Dispatcher" />
                        </Form.Item>
                    </Card>

                    <Card size="small" title="Permissions Configuration">
                        <Form.Item name="permissions">
                            <Checkbox.Group style={{ width: '100%' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    {Object.entries(groupedPermissions).map(([category, perms]) => (
                                        <div key={category}>
                                            <Text strong style={{ display: 'block', marginBottom: '8px', borderBottom: '1px solid #f0f0f0', paddingBottom: '4px', color: '#5b6cf9' }}>
                                                {category}
                                            </Text>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px' }}>
                                                {perms.map(p => (
                                                    <Checkbox key={p.id} value={p.id}>
                                                        {p.name}
                                                    </Checkbox>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Checkbox.Group>
                        </Form.Item>
                    </Card>

                    <Form.Item style={{ marginTop: '24px' }}>
                        <BlackButton htmlType="submit" block style={{ height: '40px' }}>
                            Save Role
                        </BlackButton>
                    </Form.Item>
                </Form>
            </Drawer>
        </div>
    );
};

export default RoleManagement;
