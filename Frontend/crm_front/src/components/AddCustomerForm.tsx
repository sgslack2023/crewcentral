import React, { FC, useEffect, useState } from "react";
import { Drawer, notification, Form, Input, Select, Button, Card, DatePicker } from "antd";
import { 
  UserOutlined, 
  MailOutlined, 
  PhoneOutlined, 
  TeamOutlined,
  HomeOutlined,
  TagsOutlined,
  FileTextOutlined,
  CarOutlined,
  CalendarOutlined,
  BranchesOutlined,
  EnvironmentOutlined,
  AimOutlined
} from "@ant-design/icons";
import { AuthTokenType, CustomerProps, UserProps, ServiceTypeProps, RoomSizeProps, BranchProps } from "../utils/types";
import { getAuthToken, getServiceTypes, getRoomSizes, getBranches } from "../utils/functions";
import axios, { AxiosResponse } from "axios";
import { CustomersUrl, UsersUrl, ServiceTypesUrl, RoomSizesUrl, BranchesUrl } from "../utils/network";
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

interface AddCustomerFormProps {
  isVisible: boolean;
  onSuccessCallBack: () => void;
  onClose: () => void;
  editingCustomer?: CustomerProps | null;
}

const SOURCE_OPTIONS = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'email', label: 'Email Campaign' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'other', label: 'Other' },
];

const STAGE_OPTIONS = [
  { value: 'lead', label: 'Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const AddCustomerForm: FC<AddCustomerFormProps> = ({
  isVisible = false,
  onSuccessCallBack,
  onClose,
  editingCustomer,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserProps[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeProps[]>([]);
  const [roomSizes, setRoomSizes] = useState<RoomSizeProps[]>([]);
  const [branches, setBranches] = useState<BranchProps[]>([]);

  // Fetch data for dropdowns
  useEffect(() => {
    if (isVisible) {
      fetchUsers();
      fetchServiceTypes();
      fetchRoomSizes();
      fetchBranches();
    }
  }, [isVisible]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const headers = getAuthToken() as AuthTokenType;
      const response = await axios.get(UsersUrl, headers);
      setUsers(response.data.filter((user: UserProps) => user.approved && user.is_active));
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchServiceTypes = async () => {
    getServiceTypes((data) => {
      setServiceTypes(data.filter((st: ServiceTypeProps) => st.enabled));
    }, () => {});
  };

  const fetchRoomSizes = async () => {
    getRoomSizes((data) => {
      setRoomSizes(data.filter((rs: RoomSizeProps) => rs.is_active));
    }, () => {});
  };

  const fetchBranches = async () => {
    getBranches((data) => {
      setBranches(data.filter((b: BranchProps) => b.is_active));
    }, () => {});
  };

  const handleFormClose = () => {
    form.resetFields();
    onClose?.();
  };

  useEffect(() => {
    if (editingCustomer) {
      const formData = { ...editingCustomer };
      // Convert move_date string to dayjs object for DatePicker
      if (formData.move_date) {
        formData.move_date = dayjs(formData.move_date) as any;
      }
      form.setFieldsValue(formData);
    } else {
      form.resetFields();
    }
  }, [editingCustomer, form]);

  const onSubmit = async (values: any) => {
    setLoading(true);
    const headers = getAuthToken() as AuthTokenType;

    // Convert move_date from dayjs to string format
    const submitData = { ...values };
    if (submitData.move_date) {
      submitData.move_date = submitData.move_date.format('YYYY-MM-DD');
    }

    try {
      let response: AxiosResponse;

      if (editingCustomer) {
        // Editing customer
        response = await axios.put(`${CustomersUrl}/${editingCustomer.id}`, submitData, headers);
        notification.success({
          message: "Customer Updated",
          description: "Customer has been updated successfully.",
          title: "Success"
        });
      } else {
        // Adding new customer
        response = await axios.post(CustomersUrl, submitData, headers);
        notification.success({
          message: "Customer Added",
          description: "New customer has been added successfully.",
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
      title={editingCustomer ? "Edit Customer" : "Add New Customer"}
      open={isVisible}
      onClose={handleFormClose}
      destroyOnClose
      width={600}
    >
      <Form layout="vertical" onFinish={onSubmit} form={form}>
        {/* Basic Information Card */}
        <Card 
          size="small"
          style={{ marginBottom: '16px' }}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1890ff' }}>
              <UserOutlined />
              Basic Information
            </span>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Form.Item
              label="Full Name"
              name="full_name"
              rules={[{ required: true, message: 'Please input the full name!' }]}
              style={{ marginBottom: '12px' }}
            >
              <Input prefix={<UserOutlined />} placeholder="John Doe" />
            </Form.Item>

            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Please input the email!' },
                { type: 'email', message: 'Please enter a valid email!' }
              ]}
              style={{ marginBottom: '12px' }}
            >
              <Input prefix={<MailOutlined />} placeholder="john@example.com" />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Form.Item
              label="Phone"
              name="phone"
              style={{ marginBottom: '0' }}
            >
              <Input prefix={<PhoneOutlined />} placeholder="+1 234 567 8900" />
            </Form.Item>

            <Form.Item
              label="Company"
              name="company"
              style={{ marginBottom: '0' }}
            >
              <Input prefix={<TeamOutlined />} placeholder="Company Name" />
            </Form.Item>
          </div>
        </Card>

        {/* Address Information Card */}
        <Card 
          size="small"
          style={{ marginBottom: '16px' }}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1890ff' }}>
              <HomeOutlined />
              Address Information
            </span>
          }
        >
          <Form.Item
            label="Address"
            name="address"
            style={{ marginBottom: '12px' }}
          >
            <TextArea rows={2} placeholder="Street address" />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Form.Item
              label="City"
              name="city"
              style={{ marginBottom: '12px' }}
            >
              <Input placeholder="City" />
            </Form.Item>

            <Form.Item
              label="State"
              name="state"
              style={{ marginBottom: '12px' }}
            >
              <Input placeholder="State" />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Form.Item
              label="Country"
              name="country"
              style={{ marginBottom: '0' }}
            >
              <Input placeholder="Country" />
            </Form.Item>

            <Form.Item
              label="Postal Code"
              name="postal_code"
              style={{ marginBottom: '0' }}
            >
              <Input placeholder="Postal Code" />
            </Form.Item>
          </div>
        </Card>

        {/* Move Information Card */}
        <Card 
          size="small"
          style={{ marginBottom: '16px' }}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1890ff' }}>
              <CarOutlined />
              Move Information
            </span>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Form.Item
              label="Service Type"
              name="service_type"
              style={{ marginBottom: '12px' }}
            >
              <Select placeholder="Select Service Type" allowClear>
                {serviceTypes.map(st => (
                  <Option key={st.id} value={st.id}>
                    {st.service_type}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Move Date"
              name="move_date"
              style={{ marginBottom: '12px' }}
            >
              <DatePicker style={{ width: '100%' }} placeholder="Select Move Date" />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Form.Item
              label="Move Size"
              name="move_size"
              style={{ marginBottom: '12px' }}
            >
              <Select placeholder="Select Move Size" allowClear>
                {roomSizes.map(rs => (
                  <Option key={rs.id} value={rs.id}>
                    {rs.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Branch"
              name="branch"
              style={{ marginBottom: '12px' }}
            >
              <Select placeholder="Select Branch" allowClear>
                {branches.map(b => (
                  <Option key={b.id} value={b.id}>
                    {b.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            label="Origin Address"
            name="origin_address"
            style={{ marginBottom: '12px' }}
          >
            <TextArea rows={2} placeholder="Pick-up address" />
          </Form.Item>

          <Form.Item
            label="Destination Address"
            name="destination_address"
            style={{ marginBottom: '0' }}
          >
            <TextArea rows={2} placeholder="Drop-off address" />
          </Form.Item>
        </Card>

        {/* CRM Information Card */}
        <Card 
          size="small"
          style={{ marginBottom: '16px' }}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1890ff' }}>
              <TagsOutlined />
              CRM Information
            </span>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Form.Item
              label="Source"
              name="source"
              rules={[{ required: true, message: 'Please select the source!' }]}
              initialValue="other"
              style={{ marginBottom: '12px' }}
            >
              <Select placeholder="Select Source">
                {SOURCE_OPTIONS.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Stage"
              name="stage"
              rules={[{ required: true, message: 'Please select the stage!' }]}
              initialValue="lead"
              style={{ marginBottom: '12px' }}
            >
              <Select placeholder="Select Stage">
                {STAGE_OPTIONS.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            label="Assign To"
            name="assigned_to"
            style={{ marginBottom: '0' }}
          >
            <Select 
              placeholder="Select User (Optional)" 
              allowClear
              loading={loadingUsers}
            >
              {users.map(user => (
                <Option key={user.id} value={user.id}>
                  {user.fullname} ({user.role})
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Card>

        {/* Notes Card */}
        <Card 
          size="small"
          style={{ marginBottom: '16px' }}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1890ff' }}>
              <FileTextOutlined />
              Notes
            </span>
          }
        >
          <Form.Item
            name="notes"
            style={{ marginBottom: '0' }}
          >
            <TextArea rows={4} placeholder="Additional notes about this customer..." />
          </Form.Item>
        </Card>

        <Form.Item style={{ marginBottom: '0', marginTop: '24px' }}>
          <Button htmlType="submit" type="primary" block loading={loading} size="large">
            {editingCustomer ? "Update Customer" : "Add Customer"}
          </Button>
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default AddCustomerForm;

