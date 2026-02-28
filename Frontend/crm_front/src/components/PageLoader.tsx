import React from 'react';
import { PropagateLoader } from 'react-spinners';

interface PageLoaderProps {
    loading?: boolean;
    color?: string;
    size?: number;
    text?: string;
    fullPage?: boolean;
}

const PageLoader: React.FC<PageLoaderProps> = ({
    loading = true,
    color = '#5b6cf9',
    size = 12, // Slightly smaller for professional look
    text,
    fullPage = false
}) => {
    if (!loading) return null;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: fullPage ? '100vh' : '100%',
            width: '100%',
            flex: 1,
            minHeight: fullPage ? '100vh' : '300px',
            backgroundColor: 'transparent',
            gap: '30px'
        }}>
            <PropagateLoader color={color} size={size} loading={loading} />
            {text && (
                <div style={{
                    color: '#8e8ea8',
                    fontSize: '14px',
                    fontWeight: 500,
                    marginTop: '10px'
                }}>
                    {text}
                </div>
            )}
        </div>
    );
};

export default PageLoader;
