import React from 'react';
import {
  BranchesOutlined,
  TagsOutlined,
  FileTextOutlined,
  CarOutlined,
  HomeOutlined,
  CalculatorOutlined,
  ClockCircleOutlined,
  ApiOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { VerticalTabs } from '../components';
import DashboardBuilder from './DashboardBuilder';
import Branches from './Branches';
import ServiceTypes from './ServiceTypes';
import MoveTypes from './MoveTypes';
import RoomSizes from './RoomSizes';
import TimeWindows from './TimeWindows';
import EstimateTemplates from './EstimateTemplates';
import Documents from './Documents';
import Endpoints from './Endpoints';
import Schedulers from './Schedulers';


const Settings: React.FC = () => {
  const items = [
    {
      key: 'dashboard-builder',
      label: 'Spaces',
      icon: <DashboardOutlined />,
      children: <DashboardBuilder hideHeader={true} />,
    },
    {
      key: 'branches',

      label: 'Branches',
      icon: <BranchesOutlined />,
      children: <Branches hideHeader={true} />,
    },
    {
      key: 'service-types',
      label: 'Service Types',
      icon: <TagsOutlined />,
      children: <ServiceTypes hideHeader={true} />,
    },
    {
      key: 'move-types',
      label: 'Move Types',
      icon: <CarOutlined />,
      children: <MoveTypes hideHeader={true} />,
    },
    {
      key: 'room-sizes',
      label: 'Room Sizes',
      icon: <HomeOutlined />,
      children: <RoomSizes hideHeader={true} />,
    },
    {
      key: 'time-windows',
      label: 'Time Windows',
      icon: <ClockCircleOutlined />,
      children: <TimeWindows hideHeader={true} />,
    },
    {
      key: 'estimate-templates',
      label: 'Estimate Templates',
      icon: <CalculatorOutlined />,
      children: <EstimateTemplates hideHeader={true} />,
    },
    {
      key: 'documents',
      label: 'Documents',
      icon: <FileTextOutlined />,
      children: <Documents hideHeader={true} />,
    },
    {
      key: 'endpoints',
      label: 'Endpoints',
      icon: <ApiOutlined />,
      children: <Endpoints hideHeader={true} />,
    },
    {
      key: 'schedulers',
      label: 'Automations',
      icon: <ClockCircleOutlined />,
      children: <Schedulers hideHeader={true} />,
    }
  ];

  return (
    <div style={{ padding: '8px 16px 24px 16px', height: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ marginBottom: '16px', flexShrink: 0 }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1a1a2e' }}>Settings</h1>
        <p style={{ color: '#8e8ea8', margin: '4px 0 0 0', fontSize: '13px' }}>Manage your application preferences and configurations.</p>
      </div>

      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        flex: 1,
        minHeight: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        display: 'flex',
        overflow: 'hidden'
      }}>
        <VerticalTabs
          items={items}
          defaultActiveKey="branches"
          tabWidth={220}
        />
      </div>
    </div>
  );
};

export default Settings;

