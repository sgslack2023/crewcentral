import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button, Select, Collapse, Dropdown, Avatar } from 'antd';
import { getUsers, getCustomerStatistics } from '../utils/functions';
import { UserProps, CustomerStatsProps } from '../utils/types';
import {
  ClockCircleOutlined,
  UserOutlined,
  SettingOutlined,
  BarChartOutlined,
  HomeOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  ContactsOutlined,
  UserAddOutlined
} from '@ant-design/icons';
import '../style.scss';

const { Panel } = Collapse;
const { Option } = Select;

interface DashboardProps {
  currentUser?: {
    role: string;
    fullname: string;
    email?: string;
  };
  onPageChange?: (page: string) => void;
}

// Navigation types and configurations
type NavigationPage = 'dashboard' | 'inventory-count' | 'global-count' | 
  'staging' | 'transfers' | 'order-requests' | 'order-management' | 'invoices' | 'recipes' | 
  'kitchen-recipes' | 'user-management' | 'settings' | 'alerts' | 'profile';

interface NavigationItem {
  id: NavigationPage;
  label: string;
  icon: any;
  description: string;
  hasAlerts?: boolean;
}

interface NavigationCategory {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  items: NavigationItem[];
}

// Role-based navigation configuration
const ROLE_NAVIGATION: Record<string, NavigationPage[]> = {
  admin: ['dashboard', 'inventory-count', 'global-count', 'staging', 'transfers', 'user-management', 'order-requests', 'order-management', 'invoices', 'settings', 'recipes', 'alerts', 'profile'],
  user: ['dashboard', 'profile']
};

// Administration category
const administrationCategory: NavigationCategory = {
  id: 'administration',
  title: 'Administration',
  description: 'User management and system settings',
  icon: SafetyCertificateOutlined,
  color: 'navigation-category-gray',
  items: [
    {
      id: 'user-management',
      label: 'User Management',
      icon: UserOutlined,
      description: 'Manage users and permissions'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: SettingOutlined,
      description: 'System configuration'
    }
  ]
};

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color, bgColor, onClick }) => (
  <div 
    className={`metric-card ${bgColor} ${onClick ? 'metric-card-clickable' : ''}`}
    onClick={onClick}
    style={{ cursor: onClick ? 'pointer' : 'default' }}
  >
    <div className="metric-icon" style={{ color }}>
      {icon}
    </div>
    <div className="metric-value">{value}</div>
    <div className="metric-title">{title}</div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ currentUser, onPageChange }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProps[]>([]);
  const [usersFetching, setUsersFetching] = useState(false);
  const [customerStats, setCustomerStats] = useState<CustomerStatsProps | null>(null);
  const [customerStatsFetching, setCustomerStatsFetching] = useState(false);

  // Fetch users data only for admin users
  useEffect(() => {
    // Only fetch users data if current user is admin
    if (currentUser?.role?.toLowerCase() === 'admin') {
      getUsers(setUsers, setUsersFetching);
    }
  }, [currentUser?.role]);

  // Fetch customer statistics
  useEffect(() => {
    const fetchCustomerStats = async () => {
      setCustomerStatsFetching(true);
      try {
        const stats = await getCustomerStatistics();
        setCustomerStats(stats);
      } catch (error) {
        console.error('Error fetching customer statistics:', error);
        // Set fallback data
        setCustomerStats({
          total_customers: 0,
          total_leads: 0,
          unassigned_leads: 0,
          by_stage: {},
          by_source: {}
        });
      } finally {
        setCustomerStatsFetching(false);
      }
    };

    fetchCustomerStats();
  }, []);


  // Calculate real user counts
  const realUserCounts = useMemo(() => {
    const activeUsers = users.filter(user => user.approved && user.is_active).length;
    const pendingSignups = users.filter(user => !user.approved).length;
    return { activeUsers, pendingSignups };
  }, [users]);

  // Mock data for demonstration
  const mockData = useMemo(() => {
    return {
      system: {
        activeUsers: realUserCounts.activeUsers,
        pendingSignups: realUserCounts.pendingSignups,
        totalAlerts: 0,
        systemHealth: 98
      }
    };
  }, [realUserCounts]);

  const hasAdminAccess = currentUser?.role?.toLowerCase() === 'admin';

  // Navigation helper functions
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handlePageChange = (page: NavigationPage) => {
    // Handle specific page navigations
    switch (page) {
      case 'user-management':
        navigate('/users');
        break;
      default:
        if (onPageChange) {
          onPageChange(page);
        }
        break;
    }
  };

  const handleUserManagementNavigation = (tab: 'approved' | 'pending') => {
    // Store the desired tab in localStorage and navigate to users page
    localStorage.setItem('userManagementTab', tab);
    navigate('/users');
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  // Get allowed navigation items for current user role
  const allowedPages = ROLE_NAVIGATION[currentUser?.role?.toLowerCase() || 'user'] || [];
  
  // Filter administration category based on user permissions
  const allowedAdministrationCategory = {
    ...administrationCategory,
    items: administrationCategory.items.filter(item => allowedPages.includes(item.id))
  };

  // User profile menu - Modern Design
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

  // Admin dropdown menu
  const adminMenuItems = allowedAdministrationCategory.items.map((item) => {
    const IconComponent = item.icon;
    return {
      key: item.id,
      label: item.label,
      icon: <IconComponent />,
      onClick: () => handlePageChange(item.id)
    };
  });

  return (
    <div style={{ margin: 0, padding: 0 }}>
      {/* Navigation Header */}
      <Card className="navigation-header" style={{ 
        margin: '0',
        marginTop: '0',
        marginBottom: '0',
        marginLeft: '0', 
        marginRight: '0',
        borderRadius: '0'
      }}>
        <div className="navigation-header-content">
          <div className="navigation-title-section">
            <h1 className="navigation-title">BVL Movers</h1>
          </div>

          {/* Quicklinks */}
          <div className="navigation-quicklinks">
              <Button
                type="text"
                size="small"
                icon={<HomeOutlined />}
                onClick={() => handlePageChange('dashboard')}
                className="quicklink-btn"
              >
                Home
              </Button>

            {/* Admin Quicklink */}
            {allowedAdministrationCategory.items.length > 0 && (
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

            {/* User Profile - Modern Design */}
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


      {/* Dashboard Title - Compact */}
      {hasAdminAccess && (
        <div className="dashboard-content-header">
          <h1 className="dashboard-title">📊 Dashboard</h1>
        </div>
      )}

      {/* Customers Section */}
      <Card style={{ 
        marginBottom: '0', 
        marginLeft: '0', 
        marginRight: '0',
        borderRadius: '0',
        borderLeft: 'none',
        borderRight: 'none'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#000', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TeamOutlined style={{ fontSize: '16px', color: '#f59e0b' }} />
            Customers
          </h3>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '16px'
        }}>
          <MetricCard
            title="Total Customers"
            value={customerStatsFetching ? '...' : (customerStats?.total_customers || 0)}
            icon={<ContactsOutlined />}
            color="#2563eb"
            bgColor="blue-bg"
            onClick={() => navigate('/customers')}
          />
          <MetricCard
            title="Leads"
            value={customerStatsFetching ? '...' : (customerStats?.total_leads || 0)}
            icon={<UserAddOutlined />}
            color="#f59e0b"
            bgColor="orange-bg"
            onClick={() => navigate('/customers')}
          />
          <MetricCard
            title="Unassigned Leads"
            value={customerStatsFetching ? '...' : (customerStats?.unassigned_leads || 0)}
            icon={<UserOutlined />}
            color="#dc2626"
            bgColor="red-bg"
            onClick={() => navigate('/customers')}
          />
        </div>
      </Card>

      {/* System Health Section */}
      {/* System Health section - only show for admin users */}
      {hasAdminAccess && (
        <Card style={{ 
          marginBottom: '0', 
          marginLeft: '0', 
          marginRight: '0',
          borderRadius: '0',
          borderLeft: 'none',
          borderRight: 'none',
          borderBottom: 'none'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SettingOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#000' }}>System Health</h3>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '16px'
          }}>
            <MetricCard
              title="Active Users"
              value={mockData.system.activeUsers}
              icon={<UserOutlined />}
              color="#16a34a"
              bgColor="green-bg"
              onClick={() => handleUserManagementNavigation('approved')}
            />
            <MetricCard
              title="Pending Signups"
              value={mockData.system.pendingSignups}
              icon={<ClockCircleOutlined />}
              color="#eab308"
              bgColor="yellow-bg"
              onClick={() => handleUserManagementNavigation('pending')}
            />
            <MetricCard
              title="Settings"
              value="Configure"
              icon={<SettingOutlined />}
              color="#2563eb"
              bgColor="blue-bg"
              onClick={() => navigate('/settings')}
            />
          </div>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;