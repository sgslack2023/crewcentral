import { useState } from 'react';
import { Button, Card, Alert, Form, Input, Select } from 'antd';
import { UserOutlined, MailOutlined, TeamOutlined, ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CreateUserUrl } from '../utils/network';
import { CustomAxiosError } from '../utils/types';

interface SignupData {
  name: string;
  email: string;
  requestedRole: string;
}

const ROLE_CONFIG = {
  Admin: {
    label: "Admin",
    description: "Full system access and user management",
  },
  User: {
    label: "User",
    description: "Standard user access with basic operations",
  },
};

function RequestAccount() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>("");
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const handleSubmit = async (values: SignupData) => {
    setLoading(true);
    setError("");
    
    try {
      // Create user with approved=false (pending approval)
      const userData = {
        fullname: values.name,
        email: values.email,
        role: values.requestedRole,
        approved: false
      };
      
      console.log('Sending userData:', userData);
      const response = await axios.post(CreateUserUrl, userData);
      console.log('Response received:', response);
      
      if (response) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Submit error:', error);
      const e = error as CustomAxiosError;
      
      // Handle specific error cases
      const errorData = e.response?.data;
      if (errorData?.status) {
        switch (errorData.status) {
          case 'active':
            setError("Account already exists and is active. Please try logging in instead.");
            break;
          case 'pending':
            setError("Your previous account request is still pending approval. Please wait for administrator review.");
            break;
          case 'denied':
            setError("Your previous account request was denied. We've sent you an email with the details. Please contact support if you have questions.");
            break;
          default:
            setError(errorData.message || errorData.error || "Failed to submit account request. Please try again.");
        }
      } else {
        setError(errorData?.error || errorData?.message || "Failed to submit account request. Please try again.");
      }
    }
    setLoading(false);
  };

  // Success screen after submission
  if (submitted) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        padding: '20px'
      }}>
        <Card style={{ 
          width: '100%', 
          maxWidth: '500px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ padding: '40px 20px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#f6ffed',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <CheckCircleOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
            </div>
            
            <h2 style={{ fontSize: '24px', fontWeight: 500, marginBottom: '12px', color: '#262626' }}>
              Request Submitted
            </h2>
            <p style={{ color: '#8c8c8c', fontSize: '14px', lineHeight: '1.5', marginBottom: '32px' }}>
              Your account request has been sent to an administrator for approval. 
              You'll receive an email notification once your account is reviewed.
            </p>

            <Button 
              type="primary" 
              size="large"
              block
              onClick={() => navigate('/')}
              style={{
                backgroundColor: '#000',
                borderColor: '#000',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              Return to Sign In
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8f9fa',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{ width: '100%', maxWidth: '448px' }}>
        {/* Logo/Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#1890ff',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TeamOutlined style={{ fontSize: '28px', color: 'white' }} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 500, margin: 0, color: '#000' }}>
                EmployPro
              </h1>
              <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              </p>
            </div>
          </div>
        </div>

        <Card style={{ 
          backgroundColor: '#ffffff',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          {/* Card Header */}
          <div style={{ padding: '24px 24px 0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button
                type="text"
                size="small"
                icon={<ArrowLeftOutlined style={{ fontSize: '16px' }} />}
                onClick={() => navigate('/')}
                style={{ padding: '0', height: 'auto', minWidth: 'auto' }}
              />
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 8px 0', color: '#000' }}>
                  Request Account Access
                </h2>
                <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                  Submit a request for admin approval to access the system
                </p>
              </div>
            </div>
          </div>

          {/* Card Content */}
          <div style={{ padding: '24px' }}>
            {error && (
              <Alert
                message={error}
                type="error"
                showIcon
                style={{ 
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  marginBottom: '16px'
                }}
              />
            )}

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{
                name: "",
                email: "",
                requestedRole: "User"
              }}
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              {/* Name Field */}
              <Form.Item
                name="name"
                label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#000' }}>Full Name</span>}
                rules={[{ required: true, message: 'Please enter your full name' }]}
                style={{ marginBottom: '16px' }}
              >
                <Input
                  prefix={<UserOutlined style={{ fontSize: '16px', color: '#666' }} />}
                  placeholder="Enter your full name"
                  style={{
                    height: '40px',
                    backgroundColor: '#f3f3f5',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  onFocus={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.borderColor = '#000';
                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 0, 0, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.backgroundColor = '#f3f3f5';
                    e.target.style.borderColor = 'rgba(0, 0, 0, 0.1)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </Form.Item>

              {/* Email Field */}
              <Form.Item
                name="email"
                label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#000' }}>Email Address</span>}
                rules={[
                  { required: true, message: 'Please enter your email address' },
                  { type: 'email', message: 'Please enter a valid email address' }
                ]}
                style={{ marginBottom: '16px' }}
              >
                <Input
                  prefix={<MailOutlined style={{ fontSize: '16px', color: '#666' }} />}
                  placeholder="Enter your email address"
                  style={{
                    height: '40px',
                    backgroundColor: '#f3f3f5',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  onFocus={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.borderColor = '#000';
                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 0, 0, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.backgroundColor = '#f3f3f5';
                    e.target.style.borderColor = 'rgba(0, 0, 0, 0.1)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </Form.Item>

              {/* Role Selection */}
              <Form.Item
                name="requestedRole"
                label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#000' }}>Requested Role</span>}
                style={{ marginBottom: '8px' }}
              >
                <Select
                  placeholder="Select a role"
                  style={{
                    height: '40px'
                  }}
                  dropdownStyle={{
                    borderRadius: '6px'
                  }}
                >
                  {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                    <Select.Option key={role} value={role}>
                      {config.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.requestedRole !== currentValues.requestedRole}>
                {({ getFieldValue }) => {
                  const currentRole = getFieldValue('requestedRole');
                  return (
                    <p style={{ fontSize: '12px', color: '#666', margin: '0 0 16px 0' }}>
                      {currentRole && ROLE_CONFIG[currentRole as keyof typeof ROLE_CONFIG]?.description}
                    </p>
                  );
                }}
              </Form.Item>

              {/* Submit Button */}
              <Form.Item style={{ marginBottom: 0, marginTop: '8px' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={loading}
                  style={{
                    height: '40px',
                    backgroundColor: '#000',
                    borderColor: '#000',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  {loading ? "Submitting Request..." : "Submit Request"}
                </Button>
              </Form.Item>
            </Form>

            {/* Info Alert */}
            <Alert
              message={
                <div style={{ fontSize: '14px' }}>
                  <strong>Note:</strong> Your account will be reviewed by an administrator. 
                  You'll receive an email notification once approved and can then sign in to the system.
                </div>
              }
              type="info"
              showIcon={false}
              style={{ 
                marginTop: '16px',
                backgroundColor: '#f0f9ff',
                border: '1px solid #e0f2fe',
                borderRadius: '6px'
              }}
            />
          </div>
        </Card>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
            © 2024 EmployPro. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RequestAccount;
