import React, { FC, useEffect, useState } from "react";
import { Drawer, notification, Form, Input, Select, InputNumber, Card } from "antd";
import { BlackButton, WhiteButton } from './';
import {
    SyncOutlined,
    SettingOutlined,
    ClockCircleOutlined,
    MailOutlined
} from "@ant-design/icons";
import { AuthTokenType, ScheduleProps, DocumentProps } from "../utils/types";
import { getAuthToken } from "../utils/functions";
import axios, { AxiosResponse } from "axios";
import { SchedulesUrl, DocumentsUrl } from "../utils/network";

const { Option } = Select;

interface AddAutomationFormProps {
    isVisible: boolean;
    onSuccessCallBack: () => void;
    onClose: () => void;
    editingSchedule?: ScheduleProps | null;
}

const AddAutomationForm: FC<AddAutomationFormProps> = ({
    isVisible = false,
    onSuccessCallBack,
    onClose,
    editingSchedule,
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [emailTemplates, setEmailTemplates] = useState<DocumentProps[]>([]);
    const taskType = Form.useWatch('task_type', form);

    const isEventDriven = ['new_lead', 'booked', 'closed', 'invoices', 'receipts', 'estimates'].includes(taskType);

    const handleFormClose = () => {
        form.resetFields();
        onClose?.();
    };

    const fetchEmailTemplates = async () => {
        try {
            const headers = getAuthToken() as any;
            const response = await axios.get(`${DocumentsUrl}?category=Email`, headers);
            setEmailTemplates(response.data.results ? response.data.results : response.data);
        } catch (error) {
            console.error("Failed to fetch email templates", error);
        }
    };

    useEffect(() => {
        if (isVisible) {
            fetchEmailTemplates();
        }
    }, [isVisible]);

    useEffect(() => {
        if (editingSchedule) {
            let document_id = null;
            if (editingSchedule.kwargs) {
                try {
                    const kwargs = typeof editingSchedule.kwargs === 'string'
                        ? JSON.parse(editingSchedule.kwargs.replace(/'/g, '"'))
                        : editingSchedule.kwargs;
                    document_id = kwargs.document_id;
                } catch (e) {
                    console.error("Error parsing kwargs", e);
                }
            }

            form.setFieldsValue({
                name: editingSchedule.name,
                task_type: editingSchedule.task_type,
                schedule_type: editingSchedule.schedule_type,
                minutes: editingSchedule.minutes,
                repeats: editingSchedule.repeats,
                document_id: document_id
            });
        } else {
            form.resetFields();
        }
    }, [editingSchedule, form, isVisible]);

    const onSubmit = async (values: any) => {
        setLoading(true);
        const headers = getAuthToken() as AuthTokenType;

        try {
            let response: AxiosResponse;

            if (editingSchedule) {
                response = await axios.patch(`${SchedulesUrl}/${editingSchedule.id}`, values, headers);
                notification.success({
                    message: "Automation Updated",
                    description: "Automation schedule has been updated successfully.",
                    title: "Success"
                });
            } else {
                response = await axios.post(`${SchedulesUrl}/create_automation`, values, headers);
                notification.success({
                    message: "Automation Created",
                    description: "New automation has been created successfully.",
                    title: "Success"
                });
            }

            setLoading(false);

            if (response) {
                form.resetFields();
                onSuccessCallBack?.();
                onClose?.();
            }
        } catch (error: any) {
            notification.error({
                message: "Operation Error",
                description: error.response?.data?.error || "An error occurred while processing your request.",
                title: "Operation Error"
            });
            setLoading(false);
        }
    };

    return (
        <Drawer
            title={editingSchedule ? "Edit Automation" : "Add New Automation"}
            open={isVisible}
            onClose={handleFormClose}
            destroyOnClose
            width={500}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={onSubmit}
                initialValues={{ schedule_type: 'HOURLY', minutes: 60, repeats: -1 }}
            >
                <Card
                    size="small"
                    style={{ marginBottom: '16px' }}
                    title={
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5b6cf9' }}>
                            <SettingOutlined />
                            Automation Details
                        </span>
                    }
                >
                    <Form.Item
                        label="Automation Name"
                        name="name"
                        rules={[{ required: true, message: 'Please input a name for this automation!' }]}
                        style={{ marginBottom: '16px' }}
                    >
                        <Input prefix={<SyncOutlined />} placeholder="e.g., Daily Invoice Sync" />
                    </Form.Item>

                    <Form.Item
                        label="Task Type"
                        name="task_type"
                        rules={[{ required: true, message: 'Please select a task type!' }]}
                        style={{ marginBottom: '16px' }}
                    >
                        <Select placeholder="Select task type">
                            <Option value="invoices">Invoices (Immediate & Pending)</Option>
                            <Option value="receipts">Receipts (Immediate & Pending)</Option>
                            <Option value="estimates">Estimates (Immediate & Pending)</Option>
                            <Option value="leads">Endpoint Lead Processing</Option>
                            <Option value="new_lead">New Lead Welcome Email</Option>
                            <Option value="booked">Booking Confirmation Email</Option>
                            <Option value="closed">Closed Email</Option>
                        </Select>
                    </Form.Item>

                    {(isEventDriven || taskType === 'leads') && (
                        <Form.Item
                            label="Email Template"
                            name="document_id"
                            rules={[{ required: isEventDriven, message: 'Please select an email template!' }]}
                            style={{ marginBottom: '16px' }}
                            help="Select which document library template to use."
                        >
                            <Select placeholder="Select template" allowClear>
                                {emailTemplates.map(template => (
                                    <Option key={template.id} value={template.id}>
                                        {template.title}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}

                    {!isEventDriven && (
                        <>
                            <Form.Item
                                label="Frequency"
                                name="schedule_type"
                                rules={[{ required: true, message: 'Please select a frequency!' }]}
                                style={{ marginBottom: '16px' }}
                            >
                                <Select placeholder="Select frequency">
                                    <Option value="HOURLY">Hourly</Option>
                                    <Option value="DAILY">Daily</Option>
                                </Select>
                            </Form.Item>

                            <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.schedule_type !== currentValues.schedule_type}>
                                {({ getFieldValue }) => getFieldValue('schedule_type') === 'HOURLY' && (
                                    <Form.Item
                                        label="Interval (Minutes)"
                                        name="minutes"
                                        rules={[{ required: true, message: 'Please input intervals in minutes!' }]}
                                        style={{ marginBottom: '16px' }}
                                    >
                                        <InputNumber prefix={<ClockCircleOutlined />} min={1} style={{ width: '100%' }} />
                                    </Form.Item>
                                )}
                            </Form.Item>

                            <Form.Item
                                label="Repeats"
                                name="repeats"
                                help="Use -1 for infinite repeats"
                                style={{ marginBottom: '0' }}
                            >
                                <InputNumber style={{ width: '100%' }} />
                            </Form.Item>
                        </>
                    )}

                    {isEventDriven && (
                        <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px', marginTop: '8px' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                                <strong>Event & Scheduled:</strong> This automation triggers immediately on creation (Invoices, Receipts) or status change (Leads) AND periodically checks for any pending items.
                            </p>
                        </div>
                    )}
                </Card>

                <Form.Item style={{ marginBottom: '0', marginTop: '24px' }}>
                    <BlackButton htmlType="submit" block loading={loading} style={{ height: '40px', fontSize: '16px' }}>
                        Save
                    </BlackButton>
                </Form.Item>
            </Form>
        </Drawer>
    );
};

export default AddAutomationForm;
