import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, notification, Statistic, Row, Col, Typography, Modal, Form, Input, Select, InputNumber } from 'antd';
import {
    DashboardOutlined,
    SyncOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    ClockCircleOutlined,
    PlusOutlined,
    PlayCircleOutlined,
    EditOutlined,
    DeleteOutlined,
    FileTextOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { SchedulesUrl } from '../utils/network';
import { getAuthToken } from '../utils/functions';
import { ScheduleProps, TaskProps } from '../utils/types';
import { BlackButton, WhiteButton, SettingsCard, SearchBar, AddAutomationForm } from '../components';

const { Text } = Typography;
const { Option } = Select;

const AutomationManager: React.FC = () => {
    const [schedules, setSchedules] = useState<ScheduleProps[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<ScheduleProps | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [form] = Form.useForm();
    const [logsModalVisible, setLogsModalVisible] = useState(false);
    const [executionLogs, setExecutionLogs] = useState<TaskProps[]>([]);
    const [fetchingLogs, setFetchingLogs] = useState(false);

    useEffect(() => {
        fetchSchedules();
    }, []);

    const fetchSchedules = async () => {
        setLoading(true);
        try {
            const headers = getAuthToken() as any;
            const response = await axios.get(SchedulesUrl, headers);
            setSchedules(response.data.results ? response.data.results : response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        setFetchingLogs(true);
        try {
            const headers = getAuthToken() as any;
            const response = await axios.get(`${SchedulesUrl}/logs`, headers);
            setExecutionLogs(response.data);
        } catch (error) {
            console.error("Failed to fetch automation logs", error);
        } finally {
            setFetchingLogs(false);
        }
    };

    useEffect(() => {
        if (logsModalVisible) {
            fetchLogs();
        }
    }, [logsModalVisible]);

    const handleCreateAutomation = () => {
        setEditingSchedule(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEditSchedule = (schedule: ScheduleProps) => {
        setEditingSchedule(schedule);
        form.setFieldsValue({
            name: schedule.name,
            task_type: schedule.task_type,
            schedule_type: schedule.schedule_type,
            minutes: schedule.minutes,
            repeats: schedule.repeats
        });
        setModalVisible(true);
    };

    const handleModalClose = () => {
        setModalVisible(false);
        setEditingSchedule(null);
    };

    const handleDeleteSchedule = async (id: number) => {
        Modal.confirm({
            title: 'Delete Schedule',
            content: 'Are you sure you want to delete this automation schedule?',
            okText: 'Delete',
            okType: 'danger',
            onOk: async () => {
                try {
                    const headers = getAuthToken() as any;
                    await axios.delete(`${SchedulesUrl}/${id}`, headers);
                    notification.success({ message: 'Deleted', description: 'Schedule removed', title: 'Deleted' });
                    fetchSchedules();
                } catch (error) {
                    notification.error({ message: 'Error', description: 'Failed to delete', title: 'Error' });
                }
            }
        });
    };

    const handleRunNow = async (schedule: ScheduleProps) => {
        try {
            const headers = getAuthToken() as any;
            await axios.post(`${SchedulesUrl}/${schedule.id}/run_now`, {}, headers);
            notification.success({
                message: 'Task Triggered',
                description: `Manual run for ${schedule.name} started`,
                title: 'Task Triggered'
            });
            fetchSchedules();
        } catch (error) {
            notification.error({ message: 'Error', description: 'Failed to trigger task', title: 'Error' });
        }
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <Text strong>{text}</Text>
        },
        {
            title: 'Type',
            dataIndex: 'task_type',
            key: 'task_type',
            render: (type: string) => <Tag color="blue">{type.toUpperCase()}</Tag>
        },
        {
            title: 'Schedule',
            dataIndex: 'schedule_type',
            key: 'schedule_type',
            render: (type: string, record: ScheduleProps) => (type === 'HOURLY' ? `Every ${record.minutes} min` : type)
        },
        {
            title: 'Next Run',
            dataIndex: 'next_run',
            key: 'next_run',
            render: (date: string) => date ? new Date(date).toLocaleString() : '-'
        },
        {
            title: 'Status',
            dataIndex: 'success',
            key: 'success',
            render: (success: boolean | null, record: ScheduleProps) => {
                if (!record.is_active) return <Tag>INACTIVE</Tag>;
                if (success === null) return <Tag>PENDING</Tag>;
                return success ? <Tag color="success">SUCCESS</Tag> : <Tag color="error">FAILED</Tag>;
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: ScheduleProps) => (
                <Space>
                    <Button size="small" icon={<PlayCircleOutlined />} onClick={() => handleRunNow(record)} />
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEditSchedule(record)} />
                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteSchedule(record.id)} />
                </Space>
            )
        }
    ];

    const stats = {
        total: schedules.length,
        failed: schedules.filter(s => s.success === false).length,
        upcoming: schedules.filter(s => s.next_run && new Date(s.next_run) > new Date()).length
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', flexShrink: 0 }}>
                <SearchBar
                    placeholder="Search automations..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    style={{ flex: 1, minWidth: '250px' }}
                    allowClear
                />
                <Space>
                    <Button icon={<FileTextOutlined />} onClick={() => setLogsModalVisible(true)}>Execution Logs</Button>
                    <Button icon={<SyncOutlined />} onClick={fetchSchedules} loading={loading}>
                        Refresh
                    </Button>
                    <BlackButton icon={<PlusOutlined />} onClick={handleCreateAutomation}>
                        New Automation
                    </BlackButton>
                </Space>
            </div>



            <div style={{ flex: 1, overflow: 'auto' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '12px',
                    alignContent: 'flex-start'
                }}>
                    {schedules.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map((schedule) => {
                        const isEvent = ['new_lead', 'booked', 'closed'].includes(schedule.task_type);
                        const scheduleLabel = isEvent ? 'On Event' : (schedule.schedule_type === 'HOURLY' ? `Every ${schedule.minutes} min` : schedule.schedule_type);
                        const typeLabel = schedule.task_type.replace('_', ' ').toUpperCase();

                        return (
                            <SettingsCard
                                key={schedule.id}
                                title={schedule.name}
                                statusTag={{
                                    label: !schedule.is_active ? 'INACTIVE' : schedule.success === null ? 'PENDING' : schedule.success ? 'SUCCESS' : 'FAILED',
                                    color: !schedule.is_active ? 'default' : schedule.success === null ? 'processing' : schedule.success ? 'success' : 'error'
                                }}
                                tags={[{ label: typeLabel, color: isEvent ? 'purple' : 'blue' }]}
                                fields={[
                                    {
                                        label: 'Trigger',
                                        value: scheduleLabel,
                                        icon: isEvent ? <SyncOutlined spin={schedule.is_active} /> : <ClockCircleOutlined />
                                    },
                                    {
                                        label: isEvent ? 'Last Trigger' : 'Next Run',
                                        value: schedule.next_run ? new Date(schedule.next_run).toLocaleString() : (isEvent ? 'Never' : '-'),
                                        icon: <SyncOutlined />
                                    }
                                ]}
                                fieldColumns={2}
                                actions={[
                                    {
                                        icon: <PlayCircleOutlined />,
                                        tooltip: 'Run Now',
                                        disabled: isEvent,
                                        onClick: () => handleRunNow(schedule)
                                    },
                                    {
                                        icon: <EditOutlined />,
                                        tooltip: 'Edit',
                                        onClick: () => handleEditSchedule(schedule)
                                    },
                                    {
                                        icon: <DeleteOutlined />,
                                        tooltip: 'Delete',
                                        danger: true,
                                        onClick: () => handleDeleteSchedule(schedule.id)
                                    }
                                ]}
                            />
                        );
                    })}
                </div>
            </div>

            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileTextOutlined />
                        Automation Execution Logs
                    </div>
                }
                open={logsModalVisible}
                onCancel={() => setLogsModalVisible(false)}
                width={700}
                style={{ top: 20 }}
                footer={[
                    <Button key="refresh" icon={<SyncOutlined />} onClick={fetchLogs} loading={fetchingLogs}>Refresh</Button>,
                    <WhiteButton key="close" onClick={() => setLogsModalVisible(false)}>Close</WhiteButton>
                ]}
            >
                <div style={{ maxHeight: '60vh', overflow: 'auto', padding: '4px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                        {executionLogs.map((log) => {
                            const taskName = log.task_name || log.name || 'Task Execution';

                            return (
                                <SettingsCard
                                    key={log.id}
                                    title={taskName.toUpperCase()}
                                    statusTag={{
                                        label: log.success ? 'SUCCESS' : 'FAILED',
                                        color: log.success ? 'success' : 'error'
                                    }}
                                    fields={[
                                        {
                                            label: 'Executed At',
                                            value: log.stopped ? new Date(log.stopped).toLocaleString() : 'Processing...',
                                            icon: <ClockCircleOutlined />
                                        },
                                        {
                                            label: 'Status',
                                            value: log.formatted_result || (log.success ? 'Task completed successfully' : 'Task failed'),
                                            icon: log.success ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />
                                        }
                                    ]}
                                    fieldColumns={2}
                                />
                            );
                        })}
                        {!fetchingLogs && executionLogs.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                                No execution history available yet
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            <AddAutomationForm
                isVisible={modalVisible}
                onClose={handleModalClose}
                onSuccessCallBack={fetchSchedules}
                editingSchedule={editingSchedule}
            />
        </div>
    );
};

export default AutomationManager;
