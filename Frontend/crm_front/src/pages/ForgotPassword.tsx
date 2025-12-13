import { useState } from "react";
import { notification, Form, Input, Button } from 'antd';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ForgotPasswordUrl } from '../utils/network';
import { useNavigate } from 'react-router-dom';

function ForgetPassword() {
    const [loading, setLoading] = useState(false);
    const history = useNavigate();

    const onSubmit = async (values:any) => {
        setLoading(true);
        try {
            const response = await axios.post(ForgotPasswordUrl, values);
            notification.success({
                message: "Reset Password Link Sent",
                description: "A reset password link has been sent to your email.",
                title: "Reset Password Link Sent"
            });
            history("/login"); // Redirect to login page after sending reset password link
        } catch (error: any) {
            notification.error({
                message: "Forgot Password Error",
                description: error.response?.data?.error || "Failed to send reset password email. Please try again.",
                title: "Forgot Password Error"
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
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                                <line x1="12" y1="22.08" x2="12" y2="12"/>
                            </svg>
                        </div>
                        <div className="brand-text">
                            <h1>EmployPro</h1>
                        </div>
                    </div>
                </div>

                <div className="login-card">
                    <div className="card-header">
                        <h2 className="card-title">Reset Password</h2>
                        <p className="card-description">
                            Enter your email address and we'll send you a link to reset your password
                        </p>
                    </div>

                    <div className="card-content">
                        <Form layout="vertical" onFinish={onSubmit}>
                            <Form.Item
                                name="email"
                                rules={[
                                    { required: true, message: 'Please input your email!' },
                                    { type: 'email', message: 'Please enter a valid email address!' }
                                ]}
                                style={{ marginBottom: '16px' }}
                            >
                                <div className="input-group">
                                    <label htmlFor="email" className="input-label">Email Address</label>
                                    <div className="input-wrapper">
                                        <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                            <polyline points="22,6 12,13 2,6"/>
                                        </svg>
                                        <Input 
                                            id="email"
                                            type="email" 
                                            placeholder="Enter your email address"
                                            className="modern-input"
                                        />
                                    </div>
                                </div>
                            </Form.Item>

                            <Form.Item style={{ marginBottom: '16px' }}>
                                <Button 
                                    htmlType="submit" 
                                    block 
                                    loading={loading}
                                    className="modern-submit-btn"
                                >
                                    {loading ? "Sending..." : "Send Reset Link"}
                                </Button>
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
                    <p>© 2024 EmployPro. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}

export default ForgetPassword;