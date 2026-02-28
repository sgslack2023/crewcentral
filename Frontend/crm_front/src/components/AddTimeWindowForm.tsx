import React, { FC, useEffect, useState } from "react";
import { Drawer, notification, Form, Input, TimePicker, Card, Switch, InputNumber } from "antd";
import BlackButton from './BlackButton';
import {
    ClockCircleOutlined
} from "@ant-design/icons";
import { AuthTokenType } from "../utils/types";
import { getAuthToken } from "../utils/functions";
import axios, { AxiosResponse } from "axios";
import { BaseUrl } from "../utils/network";
import dayjs from 'dayjs';

const TimeWindowsUrl = BaseUrl + 'transactiondata/time-windows';

interface TimeWindowProps {
    id?: number;
    name: string;
    start_time: string;
    end_time: string;
    time_display?: string;
    is_active?: boolean;
    display_order?: number;
}

interface AddTimeWindowFormProps {
    isVisible: boolean;
    onSuccessCallBack: () => void;
    onClose: () => void;
    editingWindow?: TimeWindowProps | null;
}

const AddTimeWindowForm: FC<AddTimeWindowFormProps> = ({
    isVisible = false,
    onSuccessCallBack,
    onClose,
    editingWindow,
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleFormClose = () => {
        form.resetFields();
        onClose?.();
    };

    useEffect(() => {
        if (editingWindow) {
            form.setFieldsValue({
                ...editingWindow,
                start_time: dayjs(editingWindow.start_time, 'HH:mm:ss'),
                end_time: dayjs(editingWindow.end_time, 'HH:mm:ss'),
            });
        } else {
            form.resetFields();
        }
    }, [editingWindow, form]);

    const onSubmit = async (values: any) => {
        setLoading(true);
        const headers = getAuthToken() as AuthTokenType;

        const data = {
            name: values.name,
            start_time: values.start_time.format('HH:mm:ss'),
            end_time: values.end_time.format('HH:mm:ss'),
            is_active: values.is_active !== false,
            display_order: values.display_order || 0
        };

        try {
            let response: AxiosResponse;

            if (editingWindow) {
                response = await axios.put(`${TimeWindowsUrl}/${editingWindow.id}`, data, headers);
                notification.success({
                    message: "Time Window Updated",
                    description: "Time window has been updated successfully.",
                    title: "Success"
                });
            } else {
                response = await axios.post(TimeWindowsUrl, data, headers);
                notification.success({
                    message: "Time Window Added",
                    description: "New time window has been added successfully.",
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
            title={editingWindow ? "Edit Time Window" : "Add New Time Window"}
            open={isVisible}
            onClose={handleFormClose}
            destroyOnClose
            width={500}
        >
            <Form layout="vertical" onFinish={onSubmit} form={form} initialValues={{ is_active: true, display_order: 0 }}>
                {/* Time Window Information Card */}
                <Card
                    size="small"
                    style={{ marginBottom: '16px' }}
                    title={
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5b6cf9' }}>
                            <ClockCircleOutlined />
                            Time Window Information
                        </span>
                    }
                >
                    <Form.Item
                        label="Window Name"
                        name="name"
                        rules={[{ required: true, message: 'Please enter a name' }]}
                        style={{ marginBottom: '12px' }}
                    >
                        <Input prefix={<ClockCircleOutlined />} placeholder="e.g., Morning, Afternoon, Evening" />
                    </Form.Item>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Form.Item
                            label="Start Time"
                            name="start_time"
                            rules={[{ required: true, message: 'Please select start time' }]}
                            style={{ marginBottom: '12px' }}
                        >
                            <TimePicker
                                format="HH:mm"
                                style={{ width: '100%' }}
                                placeholder="Select time"
                            />
                        </Form.Item>

                        <Form.Item
                            label="End Time"
                            name="end_time"
                            rules={[{ required: true, message: 'Please select end time' }]}
                            style={{ marginBottom: '12px' }}
                        >
                            <TimePicker
                                format="HH:mm"
                                style={{ width: '100%' }}
                                placeholder="Select time"
                            />
                        </Form.Item>
                    </div>

                    <Form.Item
                        label="Display Order"
                        name="display_order"
                        help="Lower numbers appear first"
                        style={{ marginBottom: '12px' }}
                    >
                        <InputNumber
                            style={{ width: '100%' }}
                            min={0}
                            placeholder="0"
                        />
                    </Form.Item>

                    <Form.Item
                        label="Active Status"
                        name="is_active"
                        valuePropName="checked"
                        style={{ marginBottom: '0' }}
                    >
                        <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                    </Form.Item>
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

export default AddTimeWindowForm;
