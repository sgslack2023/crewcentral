import React, { useState, useEffect } from "react";
import { notification, Form, Input, Button } from 'antd';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ResetPasswordUrl } from '../utils/network';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BlackButton } from '../components';

function ResetPassword() {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const history = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        // If token is passed as URL parameter, pre-fill it
        const tokenFromUrl = searchParams.get('token');
        if (tokenFromUrl) {
            form.setFieldsValue({ token: tokenFromUrl });
        }
    }, [searchParams, form]);

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            // Only send password and token to backend
            const resetData = {
                password: values.password,
                token: values.token
            };

            const response = await axios.post(ResetPasswordUrl, resetData);
            notification.success({
                message: "Password Reset Successful",
                description: "Your password has been reset successfully. You can now login with your new password.",
                title: "Password Reset Successful"
            });
            history("/login"); // Redirect to login page after password reset
        } catch (error: any) {
            notification.error({
                message: "Password Reset Error",
                description: error.response?.data?.error || "An error occurred while resetting your password. Please check your token and try again.",
                title: "Password Reset Error"
            });
        }
        setLoading(false);
    };

    return (
        <div className="modern-login-container">
            <div className="modern-login-content">
                {/* Logo/Brand Header */}
                <div className="brand-header">
                    <div className="brand-logo-container">
                        <div className="brand-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                <polyline points="3.27,6.96 12,12.01 20.73,6.96" />
                                <line x1="12" y1="22.08" x2="12" y2="12" />
                            </svg>
                        </div>
                        <div className="brand-text">
                            <h1>Baltic Van Lines</h1>
                        </div>
                    </div>
                </div>

                <div className="login-card">
                    <div className="card-header">
                        <h2 className="card-title">Set New Password</h2>
                        <p className="card-description">
                            Enter your new password below to complete the reset process
                        </p>
                    </div>

                    <div className="card-content">
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={onFinish}
                        >
                            {/* Hidden token field */}
                            <Form.Item
                                name="token"
                                rules={[{ required: true, message: 'Token is required!' }]}
                                style={{ display: 'none' }}
                            >
                                <Input type="hidden" />
                            </Form.Item>

                            {/* New Password Field */}
                            <Form.Item
                                name="password"
                                rules={[
                                    { required: true, message: 'Please input your new password!' },
                                    { min: 6, message: 'Password must be at least 6 characters long!' }
                                ]}
                                style={{ marginBottom: '16px' }}
                            >
                                <div className="input-group">
                                    <label htmlFor="password" className="input-label">New Password</label>
                                    <div className="input-wrapper">
                                        <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <circle cx="12" cy="16" r="1" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                        <Input.Password
                                            id="password"
                                            placeholder="Enter your new password"
                                            className="modern-input"
                                        />
                                    </div>
                                </div>
                            </Form.Item>

                            {/* Confirm Password Field */}
                            <Form.Item
                                name="cpassword"
                                rules={[
                                    { required: true, message: 'Please confirm your password!' },
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (!value || getFieldValue('password') === value) {
                                                return Promise.resolve();
                                            }
                                            return Promise.reject(new Error('Passwords do not match!'));
                                        },
                                    }),
                                ]}
                                style={{ marginBottom: '16px' }}
                            >
                                <div className="input-group">
                                    <label htmlFor="cpassword" className="input-label">Confirm New Password</label>
                                    <div className="input-wrapper">
                                        <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <circle cx="12" cy="16" r="1" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                        <Input.Password
                                            id="cpassword"
                                            placeholder="Confirm your new password"
                                            className="modern-input"
                                        />
                                    </div>
                                </div>
                            </Form.Item>

                            {/* Submit Button */}
                            <Form.Item style={{ marginBottom: '16px' }}>
                                <BlackButton
                                    htmlType="submit"
                                    block
                                    loading={loading}
                                >
                                    {loading ? "Updating..." : "Update Password"}
                                </BlackButton>
                            </Form.Item>

                            <div className="forgot-password-section">
                                <Link to="/login" className="forgot-password-link">
                                    Back to sign in
                                </Link>
                            </div>
                        </Form>
                    </div>
                </div>

                {/* Sign Up Link */}
                <div className="signup-section">
                    <p>
                        Need access to the system?{" "}
                        <Link to="/signup" className="signup-link">
                            Request an account
                        </Link>
                    </p>
                </div>

                {/* Footer */}
                <div className="login-footer">
                    <p>© 2024 Baltic Van Lines. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}

export default ResetPassword;