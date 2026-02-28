import React, { FC, useState } from "react";
import { Drawer, notification, Form, Input, Select, Card } from "antd";
import { BlackButton } from './';
import {
    ClusterOutlined,
    TeamOutlined,
    GoogleOutlined
} from "@ant-design/icons";
import { AuthTokenType, OrganizationProps } from "../utils/types";
import { getAuthToken } from "../utils/functions";
import axios, { AxiosResponse } from "axios";
import { OrganizationsUrl } from "../utils/network";

const { Option } = Select;

interface AddOrganizationFormProps {
    isVisible: boolean;
    onSuccessCallBack: () => void;
    onClose: () => void;
    organizations: OrganizationProps[];
    isActuallySuperuser?: boolean;
    editingOrganization?: OrganizationProps | null;
}

const AddOrganizationForm: FC<AddOrganizationFormProps> = ({
    isVisible = false,
    onSuccessCallBack,
    onClose,
    organizations,
    isActuallySuperuser = false,
    editingOrganization = null,
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleFormClose = () => {
        form.resetFields();
        onClose?.();
    };

    React.useEffect(() => {
        if (editingOrganization) {
            form.setFieldsValue(editingOrganization);
        } else {
            form.resetFields();
        }
    }, [editingOrganization, form, isVisible]);

    const onSubmit = async (values: any) => {
        setLoading(true);
        const headers = getAuthToken() as AuthTokenType;

        const payload = { ...values };
        // If not a superuser, automatically set the parent organization to the current one
        if (!isActuallySuperuser) {
            const currentOrgId = localStorage.getItem('current_org_id');
            if (currentOrgId) {
                payload.parent_organization = currentOrgId;
            }
        }

        try {
            let response: AxiosResponse;
            if (editingOrganization) {
                response = await axios.put(`${OrganizationsUrl}/${editingOrganization.id}`, payload, headers);
                notification.success({
                    message: "Organization Updated",
                    description: "Organization has been updated successfully.",
                    title: "Success"
                });
            } else {
                response = await axios.post(OrganizationsUrl, payload, headers);
                notification.success({
                    message: "Organization Created",
                    description: "New organization has been created successfully.",
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
            title={editingOrganization ? "Edit Organization" : "Add New Organization"}
            open={isVisible}
            onClose={handleFormClose}
            destroyOnClose
            width={500}
        >
            <Form form={form} layout="vertical" onFinish={onSubmit}>
                <Card
                    size="small"
                    style={{ marginBottom: '16px' }}
                    title={
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5b6cf9' }}>
                            <ClusterOutlined />
                            Organization Details
                        </span>
                    }
                >
                    <Form.Item
                        label="Organization Name"
                        name="name"
                        rules={[{ required: true, message: 'Please input the organization name!' }]}
                        style={{ marginBottom: '16px' }}
                    >
                        <Input prefix={<TeamOutlined />} placeholder="e.g. Baltic Van Lines NY" />
                    </Form.Item>

                    <Form.Item
                        label="Organization Type"
                        name="org_type"
                        rules={[{ required: true, message: 'Please select an organization type!' }]}
                        style={{ marginBottom: '16px' }}
                    >
                        <Select placeholder="Select type">
                            {isActuallySuperuser && <Option value="company">Company</Option>}
                            <Option value="franchisee">Franchisee</Option>
                            <Option value="contractor">Contractor</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="Google Business Link (for reviews)"
                        name="google_business_link"
                        style={{ marginBottom: '16px' }}
                        help="High ratings (4-5 stars) will redirect here"
                    >
                        <Input prefix={<GoogleOutlined />} placeholder="https://g.page/r/your-id/review" />
                    </Form.Item>

                    {isActuallySuperuser && (
                        <Form.Item
                            label="Parent Organization (Optional)"
                            name="parent_organization"
                            help="Select if this is a sub-organization"
                            style={{ marginBottom: '0' }}
                        >
                            <Select placeholder="Select parent organization" allowClear>
                                {organizations.map(org => (
                                    <Option key={org.id} value={org.id}>{org.name}</Option>
                                ))}
                            </Select>
                        </Form.Item>
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

export default AddOrganizationForm;
