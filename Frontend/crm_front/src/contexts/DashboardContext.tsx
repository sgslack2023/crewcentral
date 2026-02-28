import React, { createContext, useState, useContext } from 'react';

interface DashboardContextType {
    globalFilters: Record<string, any>;
    setGlobalFilters: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    applyFilter: (key: string, value: any) => void;
    clearFilter: (key: string) => void;
}

export const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [globalFilters, setGlobalFilters] = useState<Record<string, any>>({});

    const applyFilter = (key: string, value: any) => {
        setGlobalFilters(prev => {
            if (prev[key] === value) {
                const next = { ...prev };
                delete next[key];
                return next;
            }
            return { ...prev, [key]: value };
        });
    };

    const clearFilter = (key: string) => {
        setGlobalFilters(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    return (
        <DashboardContext.Provider value={{ globalFilters, setGlobalFilters, applyFilter, clearFilter }}>
            {children}
        </DashboardContext.Provider>
    );
};

export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (!context) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
};
