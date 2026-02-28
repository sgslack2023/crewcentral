import React from 'react';
import { Card } from 'antd';

const Dashboard = ({ currentUser }: { currentUser?: any }) => {
  return (
    <div style={{ padding: '12px 24px 24px 24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1a1a2e' }}>Dashboard</h1>
        <p style={{ color: '#8e8ea8', margin: '4px 0 0 0', fontSize: '13px' }}>Welcome back! Here's what's happening today.</p>
      </div>
      <Card>
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          Dashboard content coming soon...
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;