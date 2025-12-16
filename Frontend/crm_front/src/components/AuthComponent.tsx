import { Form, Input, Button } from 'antd';
import { Link } from 'react-router-dom';
import { DataProps } from '../utils/types';
import logo from '../assets/logo.png';

interface AuthComponentProps {
  titleText?: string;
  isPassword?: boolean;
  bottonText?: string;
  linkText?: string;
  linkPath?: string;
  onSubmit: (value: DataProps) => void;
  loading?: boolean;
  isUpdatePassword?: boolean;
}

function AuthComponent({
  titleText = 'Sign in',
  isPassword = true,
  bottonText = 'Login',
  linkText = 'Forgot Password?',
  linkPath = '/forgotpassword',
  onSubmit,
  loading = false,
  isUpdatePassword = false,
}: AuthComponentProps) {

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
              <h1>Baltic Van Lines</h1>
            </div>
          </div>
        </div>

        <div className="login-card">
          <div className="card-header">
            <h2 className="card-title">Welcome Back</h2>
            <p className="card-description">
              Sign in to your account to continue
            </p>
        </div>
 
          <div className="card-content">
          <Form layout="vertical" onFinish={onSubmit}>
              {/* Email Field */}
              <Form.Item
                name="email"
                rules={[{ required: true, message: 'Please input your email!' }]}
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
                      placeholder="Enter your email"
                      className="modern-input"
                    />
                  </div>
                </div>
              </Form.Item>

              {/* Password Field */}
              {isPassword && (
              <Form.Item
                name="password"
                rules={[{ required: true, message: 'Please input your password!' }]}
                  style={{ marginBottom: '16px' }}
                >
                  <div className="input-group">
                    <label htmlFor="password" className="input-label">Password</label>
                    <div className="input-wrapper">
                      <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <circle cx="12" cy="16" r="1"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      <Input.Password 
                        id="password"
                        placeholder="Enter your password"
                        className="modern-input"
                      />
                    </div>
                  </div>
              </Form.Item>
            )}

            {isUpdatePassword && (
              <Form.Item
                name="cpassword"
                rules={[{ required: true, message: 'Please input your password confirmation!' }]}
                  style={{ marginBottom: '16px' }}
                >
                  <div className="input-group">
                    <label htmlFor="cpassword" className="input-label">Confirm Password</label>
                    <div className="input-wrapper">
                      <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <circle cx="12" cy="16" r="1"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      <Input.Password 
                        id="cpassword"
                        placeholder="Confirm your password"
                        className="modern-input"
                      />
                    </div>
                  </div>
              </Form.Item>
            )}

              {/* Submit Button */}
              <Form.Item style={{ marginBottom: '16px' }}>
                <Button 
                  htmlType="submit" 
                  block 
                  loading={loading}
                  className="modern-submit-btn"
                >
                  {loading ? "Please wait..." : bottonText}
              </Button>
            </Form.Item>

              {/* Forgot Password Link - Navigate to dedicated page */}
              <div className="forgot-password-section">
                <Link to="/forgotpassword" className="forgot-password-link">
                  Forgot your password?
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

export default AuthComponent;