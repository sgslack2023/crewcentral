import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';

interface TabItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

interface VerticalTabsProps {
  items: TabItem[];
  defaultActiveKey?: string;
  tabWidth?: number;
  onChange?: (key: string) => void;
}

const TabsContainer = styled(Box)({
  display: 'flex',
  height: '100%',
  width: '100%',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  overflow: 'hidden',
});

const TabList = styled(Box)<{ $width: number }>(({ $width }) => ({
  width: $width,
  minWidth: $width,
  height: '100%',
  backgroundColor: '#fafafa',
  borderRight: '1px solid #f0f0f0',
  padding: '12px 0',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  overflowY: 'auto',
  flexShrink: 0,
}));

const TabButton = styled('button')<{ $active: boolean }>(({ $active }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  margin: '0 6px',
  border: 'none',
  backgroundColor: $active ? '#ffffff' : 'transparent',
  color: $active ? '#1a1a2e' : '#6b7280',
  fontSize: '12px',
  fontWeight: $active ? 600 : 500,
  textAlign: 'left',
  cursor: 'pointer',
  borderRadius: '6px',
  transition: 'all 0.2s ease',
  position: 'relative',
  fontFamily: 'inherit',

  // Active indicator
  '&::before': {
    content: '""',
    position: 'absolute',
    left: '-6px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '3px',
    height: $active ? '16px' : '0px',
    backgroundColor: '#5b6cf9',
    borderRadius: '0 4px 4px 0',
    transition: 'height 0.2s ease',
  },

  '&:hover': {
    backgroundColor: $active ? '#ffffff' : '#f3f4f6',
    color: '#1a1a2e',
  },

  // Icon styling
  '& .tab-icon': {
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: $active ? '#5b6cf9' : '#9ca3af',
    transition: 'color 0.2s ease',
  },

  '&:hover .tab-icon': {
    color: $active ? '#5b6cf9' : '#6b7280',
  },

  // Box shadow for active state
  boxShadow: $active ? '0 2px 8px rgba(0, 0, 0, 0.06)' : 'none',
}));

const TabContent = styled(Box)({
  flex: 1,
  padding: '16px',
  overflow: 'auto',
  backgroundColor: '#ffffff',
  minWidth: 0,
  minHeight: 0,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
});

const VerticalTabs: React.FC<VerticalTabsProps> = ({
  items,
  defaultActiveKey,
  tabWidth = 150,
  onChange,
}) => {
  const [activeKey, setActiveKey] = useState(defaultActiveKey || items[0]?.key || '');

  const handleTabClick = (key: string) => {
    setActiveKey(key);
    onChange?.(key);
  };

  const activeItem = items.find(item => item.key === activeKey);

  return (
    <TabsContainer>
      <TabList $width={tabWidth}>
        {items.map((item) => (
          <TabButton
            key={item.key}
            $active={activeKey === item.key}
            onClick={() => handleTabClick(item.key)}
          >
            {item.icon && <span className="tab-icon">{item.icon}</span>}
            <span>{item.label}</span>
          </TabButton>
        ))}
      </TabList>
      <TabContent>
        {activeItem?.children}
      </TabContent>
    </TabsContainer>
  );
};

export default VerticalTabs;
