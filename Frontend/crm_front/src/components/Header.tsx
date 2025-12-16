import React from 'react';
import { Card, Button, Avatar, Dropdown } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  HomeOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  SettingOutlined
} from '@ant-design/icons';

interface HeaderProps {
  currentUser?: {
    role: string;
    fullname: string;
    email?: string;
  };
}

const Header: React.FC<HeaderProps> = ({ currentUser }) => {
  const navigate = useNavigate();

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const handlePageChange = (page: string) => {
    switch (page) {
      case 'user-management':
        navigate('/users');
        break;
      case 'settings':
        navigate('/settings');
        break;
      default:
        break;
    }
  };

  const hasAdminAccess = currentUser?.role?.toLowerCase() === 'admin';

  // User profile menu items
  const userMenuItems = [
    {
      key: 'logout',
      label: 'Sign Out',
      icon: <LogoutOutlined style={{ color: '#ef4444' }} />,
      onClick: handleLogout,
      style: { 
        color: '#ef4444',
        fontSize: '14px',
        fontWeight: 500
      }
    }
  ];

  // Admin dropdown menu items
  const adminMenuItems = hasAdminAccess ? [
    {
      key: 'user-management',
      label: 'User Management',
      icon: <UserOutlined />,
      onClick: () => handlePageChange('user-management')
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <SettingOutlined />,
      onClick: () => handlePageChange('settings')
    }
  ] : [];

  return (
    <Card 
      className="navigation-header" 
      style={{ 
        margin: '0',
        marginTop: '0',
        marginBottom: '0',
        marginLeft: '0', 
        marginRight: '0',
        borderRadius: '0'
      }}
    >
      <div className="navigation-header-content">
        <div className="navigation-title-section">
          <h1 className="navigation-title">Baltic Van Lines</h1>
        </div>

        {/* Quicklinks */}
        <div className="navigation-quicklinks">
          <Button
            type="text"
            size="small"
            icon={<HomeOutlined />}
            onClick={() => navigate('/')}
            className="quicklink-btn"
          >
            Home
          </Button>

          {/* Admin Quicklink */}
          {hasAdminAccess && adminMenuItems.length > 0 && (
            <Dropdown menu={{ items: adminMenuItems }} placement="bottomRight">
              <Button
                type="text"
                size="small"
                icon={<SafetyCertificateOutlined />}
                className="quicklink-btn"
              >
                Admin
              </Button>
            </Dropdown>
          )}

          {/* User Profile */}
          <Dropdown 
            menu={{ items: userMenuItems }} 
            placement="bottomRight"
            trigger={['click']}
          >
            <div
              style={{
                display: 'inline-block',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <Avatar 
                size={28}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '11px',
                  border: '2px solid #ffffff',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  transition: 'all 0.2s ease'
                }}
              >
                {getUserInitials(currentUser?.fullname || 'User')}
              </Avatar>
            </div>
          </Dropdown>
        </div>
      </div>
    </Card>
  );
};

export default Header;

