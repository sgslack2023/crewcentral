import React from 'react';
import { Card } from 'antd';
import { 
  BranchesOutlined,
  TagsOutlined,
  FileTextOutlined,
  CarOutlined,
  HomeOutlined,
  CalculatorOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { fullname, role, email } from '../utils/data';
import Header from '../components/Header';

const Settings: React.FC = () => {
  const navigate = useNavigate();

  const currentUser = {
    role: localStorage.getItem(role) || 'user',
    fullname: localStorage.getItem(fullname) || 'User',
    email: localStorage.getItem(email) || ''
  };

  const settingsTiles = [
    {
      title: 'Branches',
      description: 'Manage branch locations and dispatch centers',
      icon: <BranchesOutlined />,
      iconColor: '#1890ff',
      bgColor: '#e6f7ff',
      borderColor: '#91d5ff',
      path: '/branches'
    },
    {
      title: 'Service Types',
      description: 'Configure service types and scaling factors',
      icon: <TagsOutlined />,
      iconColor: '#722ed1',
      bgColor: '#f9f0ff',
      borderColor: '#d3adf7',
      path: '/service-types'
    },
    {
      title: 'Document Library',
      description: 'Manage documents and their mappings',
      icon: <FileTextOutlined />,
      iconColor: '#13c2c2',
      bgColor: '#e6fffb',
      borderColor: '#87e8de',
      path: '/documents'
    },
    {
      title: 'Move Types',
      description: 'Manage move types with cubic feet and weight',
      icon: <CarOutlined />,
      iconColor: '#fa8c16',
      bgColor: '#fff7e6',
      borderColor: '#ffd591',
      path: '/move-types'
    },
    {
      title: 'Room Sizes',
      description: 'Manage room sizes with cubic feet and weight',
      icon: <HomeOutlined />,
      iconColor: '#52c41a',
      bgColor: '#f6ffed',
      borderColor: '#b7eb8f',
      path: '/room-sizes'
    },
    {
      title: 'Estimate Templates',
      description: 'Manage estimate templates and charge definitions',
      icon: <CalculatorOutlined />,
      iconColor: '#eb2f96',
      bgColor: '#fff0f6',
      borderColor: '#ffadd2',
      path: '/estimate-templates'
    },
    {
      title: 'Time Windows',
      description: 'Configure arrival time windows for pickups and deliveries',
      icon: <ClockCircleOutlined />,
      iconColor: '#fa541c',
      bgColor: '#fff2e8',
      borderColor: '#ffbb96',
      path: '/time-windows'
    }
  ];

  return (
    <div>
      <Header currentUser={currentUser} />
      
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0, marginBottom: '4px' }}>⚙️ Settings</h1>
          <p style={{ color: '#666', margin: 0, fontSize: '13px' }}>
            Configure system settings and manage master data
          </p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '20px',
          marginTop: '24px'
        }}>
          {settingsTiles.map((tile, index) => (
            <Card
              key={index}
              hoverable
              style={{
                borderRadius: '12px',
                border: `1px solid ${tile.borderColor}`,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              bodyStyle={{ 
                padding: '24px',
                backgroundColor: tile.bgColor
              }}
              onClick={() => navigate(tile.path)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '12px',
                  backgroundColor: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  color: tile.iconColor,
                  fontSize: '32px'
                }}>
                  {tile.icon}
                </div>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  color: '#000', 
                  textAlign: 'center', 
                  margin: 0, 
                  marginBottom: '8px' 
                }}>
                  {tile.title}
                </h3>
                <p style={{ 
                  fontSize: '13px', 
                  color: '#666', 
                  textAlign: 'center', 
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  {tile.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;

