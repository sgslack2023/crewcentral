import React, { FC, useEffect, useState } from "react";
import { Drawer, notification, Form, Input, Select, Button, Card, DatePicker } from "antd";
import {
    CalendarOutlined,
    UserOutlined,
    PhoneOutlined,
    FileTextOutlined,
    ClockCircleOutlined
} from "@ant-design/icons";
import { AuthTokenType, SiteVisitProps, UserProps } from "../utils/types";
import { getAuthToken } from "../utils/functions";
import axios from "axios";
import { SiteVisitsUrl, UsersUrl, OrganizationsUrl } from "../utils/network";
import dayjs from 'dayjs';
import BlackButton from './BlackButton';

const { Option } = Select;
const { TextArea } = Input;

interface ScheduleSiteVisitFormProps {
    isVisible: boolean;
    customer_id: number;
    customer_name?: string;
    onSuccessCallBack: () => void;
    onClose: () => void;
    editingVisit?: SiteVisitProps | null;
}

const ScheduleSiteVisitForm: FC<ScheduleSiteVisitFormProps> = ({
    isVisible = false,
    customer_id,
    customer_name,
    onSuccessCallBack,
    onClose,
    editingVisit,
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [surveyors, setSurveyors] = useState<UserProps[]>([]);
    const [loadingSurveyors, setLoadingSurveyors] = useState(false);

    useEffect(() => {
        if (isVisible) {
            fetchSurveyors();
        }
    }, [isVisible]);

    const fetchSurveyors = async () => {
        setLoadingSurveyors(true);
        try {
            const orgId = localStorage.getItem('current_org_id');
            if (!orgId) {
                console.error("Organization ID not found in context");
                return;
            }

            const headers = getAuthToken() as AuthTokenType;

            // Fetch members who have the 'edit_site_visits' (Perform Site Visits) permission
            // The header X-Organization-ID is automatically added by getAuthToken if current_org_id is set
            const response = await axios.get(`${OrganizationsUrl}/${orgId}/members?permission=edit_site_visits`, headers);

            // Map OrganizationMember to expected format
            const mappedSurveyors = response.data.map((member: any) => ({
                id: member.user_id || member.user, // fallback
                fullname: member.user_fullname,
                email: member.user_email
            }));

            setSurveyors(mappedSurveyors);
        } catch (error) {
            console.error('Error fetching surveyors:', error);
        } finally {
            setLoadingSurveyors(false);
        }
    };

    useEffect(() => {
        if (editingVisit) {
            const formData = {
                ...editingVisit,
                scheduled_at: dayjs(editingVisit.scheduled_at)
            };
            form.setFieldsValue(formData);
        } else {
            form.resetFields();
            form.setFieldsValue({ customer: customer_id });
        }
    }, [editingVisit, isVisible, form, customer_id]);

    const onSubmit = async (values: any) => {
        setLoading(true);
        const headers = getAuthToken() as AuthTokenType;

        const submitData = {
            ...values,
            customer: customer_id,
            scheduled_at: values.scheduled_at.toISOString(),
            status: editingVisit ? editingVisit.status : 'SCHEDULED'
        };

        try {
            if (editingVisit) {
                await axios.put(`${SiteVisitsUrl}/${editingVisit.id}/`, submitData, headers);
                notification.success({
                    message: "Visit Updated",
                    description: "Site visit has been updated successfully.",
                    title: "Success"
                });
            } else {
                await axios.post(SiteVisitsUrl + "/", submitData, headers);
                notification.success({
                    message: "Visit Scheduled",
                    description: "Site visit has been scheduled successfully.",
                    title: "Success"
                });
            }

            setLoading(false);
            form.resetFields();
            onSuccessCallBack?.();
            onClose?.();
        } catch (error: any) {
            notification.error({
                message: "Operation Error",
                description: error.response?.data?.error || "An error occurred while scheduling the visit.",
                title: "Error"
            });
            setLoading(false);
        }
    };

    return (
        <Drawer
            title={editingVisit ? "Edit Site Visit" : `Schedule Site Visit - ${customer_name}`}
            open={isVisible}
            onClose={onClose}
            destroyOnClose
            width={500}
        >
            <Form layout="vertical" onFinish={onSubmit} form={form}>
                <Card
                    size="small"
                    style={{ marginBottom: '16px' }}
                    title={
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5b6cf9' }}>
                            <CalendarOutlined />
                            Schedule Details
                        </span>
                    }
                >
                    <Form.Item
                        label="Scheduled Date & Time"
                        name="scheduled_at"
                        rules={[{ required: true, message: 'Please select the date and time!' }]}
                    >
                        <DatePicker
                            showTime
                            style={{ width: '100%' }}
                            format="YYYY-MM-DD HH:mm"
                            placeholder="Select Date and Time"
                        />
                    </Form.Item>

                    <Form.Item
                        label="Assign Surveyor"
                        name="surveyor"
                        rules={[{ required: true, message: 'Please assign a surveyor!' }]}
                    >
                        <Select
                            placeholder="Select Surveyor"
                            loading={loadingSurveyors}
                        >
                            {surveyors.map(user => (
                                <Option key={user.id} value={user.id}>
                                    {user.fullname}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Card>

                <Card
                    size="small"
                    style={{ marginBottom: '16px' }}
                    title={
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5b6cf9' }}>
                            <UserOutlined />
                            On-Site Contact
                        </span>
                    }
                >
                    <Form.Item
                        label="Contact Name"
                        name="appointment_confirmed_by"
                        style={{ marginBottom: '12px' }}
                    >
                        <Input prefix={<UserOutlined />} placeholder="Contact person on site" />
                    </Form.Item>

                    <Form.Item
                        label="Contact Phone"
                        name="appointment_phone"
                        style={{ marginBottom: '0' }}
                    >
                        <Input prefix={<PhoneOutlined />} placeholder="Phone number for contact" />
                    </Form.Item>
                </Card>

                <Card
                    size="small"
                    style={{ marginBottom: '16px' }}
                    title={
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5b6cf9' }}>
                            <FileTextOutlined />
                            Visit Notes
                        </span>
                    }
                >
                    <Form.Item
                        name="notes"
                        style={{ marginBottom: '0' }}
                    >
                        <TextArea rows={4} placeholder="Initial notes for the surveyor..." />
                    </Form.Item>
                </Card>

                <Form.Item style={{ marginBottom: '0', marginTop: '24px' }}>
                    <BlackButton htmlType="submit" block loading={loading} style={{ height: '40px', fontSize: '16px' }}>
                        {editingVisit ? "Update Visit" : "Schedule Visit"}
                    </BlackButton>
                </Form.Item>
            </Form>
        </Drawer>
    );
};

export default ScheduleSiteVisitForm;
