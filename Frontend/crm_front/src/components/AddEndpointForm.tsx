import React, { FC, useState } from "react";
import { Drawer, notification, Form, Input, Tag, Typography } from "antd";
import { BlackButton, WhiteButton } from './';
import {
    LinkOutlined,
    UserOutlined,
    LockOutlined
} from "@ant-design/icons";
import { AuthTokenType } from "../utils/types";
import { getAuthToken } from "../utils/functions";
import axios, { AxiosResponse } from "axios";
import { EndpointsUrl } from "../utils/network";

const { Text } = Typography;

interface AddEndpointFormProps {
    isVisible: boolean;
    onSuccessCallBack: () => void;
    onClose: () => void;
    currentUser: any;
}

const AddEndpointForm: FC<AddEndpointFormProps> = ({
    isVisible = false,
    onSuccessCallBack,
    onClose,
    currentUser,
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleFormClose = () => {
        form.resetFields();
        onClose?.();
    };

    const onSubmit = async (values: any) => {
        setLoading(true);
        const headers = getAuthToken() as AuthTokenType;

        // Get current org ID from state or localStorage
        const currentOrgId = localStorage.getItem('current_org_id');

        const data = {
            ...values,
            organization: currentOrgId
        };

        try {
            const response = await axios.post(EndpointsUrl, data, headers);
            notification.success({
                message: "Endpoint Configuration Added",
                description: "New endpoint configuration has been added successfully.",
                title: "Success"
            });

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
            title="New Endpoint Configuration"
            open={isVisible}
            onClose={handleFormClose}
            destroyOnClose
            width={500}
        >
            <Form form={form} layout="vertical" onFinish={onSubmit}>
                <div style={{ marginBottom: '24px', padding: '16px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                    <Text type="secondary" style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                        Creating for Organization:
                    </Text>
                    <Tag color="purple" style={{ margin: 0, fontWeight: 600, padding: '4px 12px', fontSize: '14px' }}>
                        {currentUser?.organizations?.find((o: any) => o.id.toString() === localStorage.getItem('current_org_id'))?.name || 'Active Organization'}
                    </Tag>
                </div>

                <Form.Item
                    label="Configuration Name"
                    name="name"
                    rules={[{ required: true, message: 'Please input a name for this endpoint!' }]}
                    style={{ marginBottom: '20px' }}
                >
                    <Input prefix={<LinkOutlined />} placeholder="e.g., Lead Source A" size="large" />
                </Form.Item>

                <Form.Item
                    label="Secret Key (Optional)"
                    name="secret_key"
                    help="Leave blank to auto-generate a secure key."
                    style={{ marginBottom: '20px' }}
                >
                    <Input prefix={<LockOutlined />} placeholder="Custom secret key" size="large" />
                </Form.Item>

                <Form.Item style={{ marginBottom: '0', marginTop: '32px' }}>
                    <BlackButton htmlType="submit" block loading={loading} style={{ height: '45px', fontSize: '16px' }}>
                        Save
                    </BlackButton>
                </Form.Item>
            </Form>
        </Drawer>
    );
};

export default AddEndpointForm;
