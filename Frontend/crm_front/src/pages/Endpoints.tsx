import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Tag, Space, notification, Divider, Tooltip, Typography } from 'antd';
import {
    ApiOutlined,
    PlusOutlined,
    CopyOutlined,
    DeleteOutlined,
    EyeOutlined,
    SyncOutlined,
    InfoCircleOutlined,
    FileTextOutlined,
    LockOutlined,
    ControlOutlined,
    SettingOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { getAuthToken, getCurrentUser } from '../utils/functions';
import Header from '../components/Header';
import { BlackButton, WhiteButton, SearchBar, SettingsCard, AddEndpointForm } from '../components';

const { Text } = Typography;

interface EndpointsProps {
    hideHeader?: boolean;
}

const Endpoints: React.FC<EndpointsProps> = ({ hideHeader = false }) => {
    const [endpointConfigs, setEndpointConfigs] = useState<any[]>([]);
    const [rawLeads, setRawLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isLogsModalVisible, setIsLogsModalVisible] = useState(false);
    const [isMappingModalVisible, setIsMappingModalVisible] = useState(false);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
    const [selectedConfig, setSelectedConfig] = useState<any>(null);
    const [configToDelete, setConfigToDelete] = useState<any>(null);
    const [selectedLead, setSelectedLead] = useState<any>(null);
    const [form] = Form.useForm();
    const [mappingForm] = Form.useForm();
    const currentUser = getCurrentUser();

    // API URL formatting (needs adjustment to your production/dev URL)
    const backendUrl = window.location.origin.includes('localhost')
        ? 'http://127.0.0.1:8000'
        : window.location.origin.replace('3000', '8000'); // Simple heuristic

    const ingestionUrl = `${backendUrl}/api/masterdata/lead-ingestion`;

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const headers = getAuthToken() as any;
            const configsRes = await axios.get(`${backendUrl}/api/masterdata/endpoint-configs`, headers);
            const leadsRes = await axios.get(`${backendUrl}/api/masterdata/raw-endpoint-leads`, headers);
            setEndpointConfigs(configsRes.data);
            setRawLeads(leadsRes.data);
        } catch (error) {
            notification.error({ message: 'Error', title: 'Error fetching data' });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateConfig = async (values: any) => {
        try {
            const headers = getAuthToken() as any;
            // Auto-generate a secret key if not provided
            if (!values.secret_key) {
                values.secret_key = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            }
            await axios.post(`${backendUrl}/api/masterdata/endpoint-configs`, values, headers);
            notification.success({ message: 'Success', title: 'Endpoint configuration created' });
            setIsModalVisible(false);
            form.resetFields();
            fetchData();
        } catch (error) {
            notification.error({ message: 'Error', title: 'Failed to create configuration' });
        }
    };

    const handleUpdateMapping = async (values: any) => {
        try {
            const headers = getAuthToken() as any;
            await axios.patch(`${backendUrl}/api/masterdata/endpoint-configs/${selectedConfig.id}/`, { mapping_config: values }, headers);
            notification.success({ message: 'Success', title: 'Mapping updated' });
            setIsMappingModalVisible(false);
            fetchData();
        } catch (error) {
            notification.error({ message: 'Error', title: 'Failed to update mapping' });
        }
    };

    const deleteConfig = async (id: number) => {
        try {
            const headers = getAuthToken() as any;
            await axios.delete(`${backendUrl}/api/masterdata/endpoint-configs/${id}`, headers);
            notification.success({ message: 'Success', title: 'Configuration deleted' });
            fetchData();
        } catch (error) {
            notification.error({ message: 'Error', title: 'Failed to delete configuration' });
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        notification.info({ message: 'Info', title: 'Copied to clipboard' });
    };

    const leadColumns = [
        {
            title: 'Received At',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (text: string) => new Date(text).toLocaleString()
        },
        {
            title: 'Endpoint',
            dataIndex: 'endpoint_name',
            key: 'endpoint'
        },
        {
            title: 'Status',
            dataIndex: 'processed',
            key: 'processed',
            render: (val: boolean) => val ? <Tag color="green">Processed</Tag> : <Tag color="blue">Pending</Tag>
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: any) => (
                <WhiteButton size="small" icon={<EyeOutlined />} onClick={() => {
                    setSelectedLead(record);
                }}>View JSON</WhiteButton>
            )
        }
    ];

    return (
        <div style={{ padding: hideHeader ? '0' : '8px 16px 24px 16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            {!hideHeader && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1a1a2e' }}>
                            Endpoints & Lead Ingestion
                        </h1>
                        <p style={{ color: '#8e8ea8', margin: '4px 0 0 0', fontSize: '13px' }}>Configure third-party lead sources to send data directly to your CRM</p>
                    </div>
                </div>
            )}

            <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', flexShrink: 0 }}>
                <SearchBar
                    placeholder="Search endpoints..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    style={{ flex: 1, minWidth: '250px' }}
                    allowClear
                />
                <Space>
                    <WhiteButton icon={<FileTextOutlined />} onClick={() => setIsLogsModalVisible(true)}>View Data Logs</WhiteButton>
                    <WhiteButton icon={<SyncOutlined />} onClick={fetchData} loading={loading}>Refresh</WhiteButton>
                    <BlackButton icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>New Endpoint</BlackButton>
                </Space>
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '12px',
                    alignContent: 'flex-start'
                }}>
                    {endpointConfigs.filter(config =>
                        config.name.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map((config) => (
                        <SettingsCard
                            key={config.id}
                            title={config.name}
                            fields={[
                                {
                                    label: 'Secret Key',
                                    value: (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <code style={{ fontSize: '11px' }}>{config.secret_key}</code>
                                            <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => copyToClipboard(config.secret_key)} />
                                        </div>
                                    ),
                                    icon: <LockOutlined />
                                },
                                {
                                    label: 'Easy Ingestion URL',
                                    value: (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <code style={{ fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{`${ingestionUrl}/${config.id}`}</code>
                                            <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => copyToClipboard(`${ingestionUrl}/${config.id}`)} />
                                        </div>
                                    ),
                                    icon: <ApiOutlined />
                                },
                                {
                                    label: 'Secret Auth URL',
                                    value: (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <code style={{ fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{ingestionUrl}</code>
                                            <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => copyToClipboard(ingestionUrl)} />
                                        </div>
                                    ),
                                    icon: <LockOutlined />
                                }
                            ]}
                            fieldColumns={1}
                            actions={[
                                {
                                    icon: <ControlOutlined />,
                                    tooltip: 'Configure Mapping',
                                    onClick: () => {
                                        setSelectedConfig(config);
                                        mappingForm.setFieldsValue(config.mapping_config || {});
                                        setIsMappingModalVisible(true);
                                    }
                                },
                                {
                                    icon: <DeleteOutlined />,
                                    tooltip: 'Delete',
                                    danger: true,
                                    onClick: () => {
                                        setConfigToDelete(config);
                                        setIsDeleteModalVisible(true);
                                    }
                                }
                            ]}
                        />
                    ))}
                </div>

                <div style={{ marginTop: '24px', padding: '16px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <InfoCircleOutlined style={{ color: '#5b6cf9' }} />
                        <span style={{ fontWeight: 600, fontSize: '14px', color: '#374151' }}>Setup Instruction</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#4b5563', lineHeight: 1.5 }}>
                        Configure your lead provider to POST JSON data to the <strong>Easy Ingestion URL</strong> (recommended, no special headers needed).
                        Alternatively, use the Secret Auth URL and include the <code>X-Endpoint-Secret</code> header.
                    </p>
                </div>
            </div>

            {/* Data Logs Modal */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileTextOutlined />
                        Raw Incoming Data Logs
                    </div>
                }
                open={isLogsModalVisible}
                onCancel={() => setIsLogsModalVisible(false)}
                width={700}
                style={{ top: 20 }}
                footer={[
                    <Button key="refresh" icon={<SyncOutlined />} onClick={fetchData} loading={loading}>Refresh</Button>,
                    <WhiteButton key="close" onClick={() => setIsLogsModalVisible(false)}>Close</WhiteButton>
                ]}
            >
                <div style={{ maxHeight: '60vh', overflow: 'auto', padding: '4px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                        {rawLeads.map((lead) => (
                            <SettingsCard
                                key={lead.id}
                                title={lead.endpoint_name || "Unknown Endpoint"}
                                statusTag={{
                                    label: lead.processed ? 'PROCESSED' : 'PENDING',
                                    color: lead.processed ? 'green' : 'blue'
                                }}
                                fields={[
                                    {
                                        label: 'Received',
                                        value: new Date(lead.created_at).toLocaleString(),
                                        icon: <SyncOutlined />
                                    },
                                    ...(lead.error_message ? [{
                                        label: 'Error',
                                        value: <span style={{ color: '#ef4444' }}>{lead.error_message}</span>,
                                        icon: <InfoCircleOutlined style={{ color: '#ef4444' }} />
                                    }] : [])
                                ]}
                                actions={[
                                    {
                                        icon: <EyeOutlined />,
                                        tooltip: 'View JSON',
                                        onClick: () => setSelectedLead(lead)
                                    }
                                ]}
                                fieldColumns={1}
                            />
                        ))}
                        {rawLeads.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                                No data logs found
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            <AddEndpointForm
                isVisible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                onSuccessCallBack={fetchData}
                currentUser={currentUser}
            />

            {/* View JSON Modal */}
            <Modal
                title="Raw Data Details"
                open={!!selectedLead}
                onCancel={() => setSelectedLead(null)}
                footer={[
                    <WhiteButton key="close" onClick={() => setSelectedLead(null)}>
                        Close
                    </WhiteButton>
                ]}
                width={700}
            >
                {selectedLead && (
                    <div style={{ background: '#1e1e1e', padding: '16px', borderRadius: '8px', overflowX: 'auto' }}>
                        <pre style={{ color: '#dcdcdc', margin: 0 }}>
                            {JSON.stringify(selectedLead.raw_data, null, 2)}
                        </pre>
                    </div>
                )}
            </Modal>

            {/* Mapping Configuration Modal */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <SettingOutlined />
                        System Mapping: {selectedConfig?.name}
                    </div>
                }
                open={isMappingModalVisible}
                onCancel={() => setIsMappingModalVisible(false)}
                footer={[
                    <WhiteButton key="cancel" onClick={() => setIsMappingModalVisible(false)}>
                        Cancel
                    </WhiteButton>,
                    <BlackButton key="submit" onClick={() => mappingForm.submit()}>
                        Save Mapping
                    </BlackButton>
                ]}
                width={600}
                style={{ top: 20 }}
                centered
                bodyStyle={{ maxHeight: '70vh', overflowY: 'auto', padding: '16px' }}
            >
                <div style={{ marginBottom: '16px', padding: '12px', background: '#eef2ff', borderRadius: '8px', border: '1px solid #c7d2fe' }}>
                    <Text type="secondary" style={{ fontSize: '13px', color: '#4338ca' }}>
                        <InfoCircleOutlined /> Enter the JSON path for each field. Use dots for nested fields (e.g. <code>lead.contact.name</code>).
                    </Text>
                </div>
                <Form form={mappingForm} layout="vertical" onFinish={handleUpdateMapping}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                        <Form.Item name="full_name" label="Full Name Path">
                            <Input placeholder="e.g. name or lead.name" />
                        </Form.Item>
                        <Form.Item name="email" label="Email Path">
                            <Input placeholder="e.g. email or lead.email" />
                        </Form.Item>
                        <Form.Item name="phone" label="Phone Path">
                            <Input placeholder="e.g. phone or lead.phone" />
                        </Form.Item>
                        <Form.Item name="company" label="Company Path">
                            <Input placeholder="e.g. company" />
                        </Form.Item>
                        <Form.Item name="address" label="Address Path">
                            <Input placeholder="e.g. address" />
                        </Form.Item>
                        <Form.Item name="city" label="City Path">
                            <Input placeholder="e.g. city" />
                        </Form.Item>
                        <Form.Item name="state" label="State Path">
                            <Input placeholder="e.g. state" />
                        </Form.Item>
                        <Form.Item name="zip" label="Zip Code Path">
                            <Input placeholder="e.g. zip_code" />
                        </Form.Item>
                        <Form.Item name="move_date" label="Move Date Path">
                            <Input placeholder="e.g. move_date" />
                        </Form.Item>
                        <Form.Item name="notes" label="Notes/Description Path">
                            <Input placeholder="e.g. description" />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ExclamationCircleOutlined style={{ color: '#d9534f' }} />
                        Confirm Deletion
                    </div>
                }
                open={isDeleteModalVisible}
                onCancel={() => setIsDeleteModalVisible(false)}
                footer={[
                    <WhiteButton key="cancel" onClick={() => setIsDeleteModalVisible(false)}>
                        No, Keep it
                    </WhiteButton>,
                    <BlackButton key="delete" onClick={() => {
                        if (configToDelete) deleteConfig(configToDelete.id);
                        setIsDeleteModalVisible(false);
                    }}>
                        Yes, Delete
                    </BlackButton>
                ]}
                width={400}
                centered
            >
                <div style={{ padding: '8px 0' }}>
                    <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.6 }}>
                        Are you sure you want to delete <strong>{configToDelete?.name}</strong>?
                    </p>
                    <p style={{ marginTop: '12px', fontSize: '12px', color: '#9ca3af' }}>
                        This will permanently remove the endpoint configuration and secret key. Any external systems using this key will fail to ingest data.
                    </p>
                </div>
            </Modal>
        </div>
    );
};

export default Endpoints;
