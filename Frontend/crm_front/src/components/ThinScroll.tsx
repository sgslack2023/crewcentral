import React from 'react';

interface ThinScrollProps {
    children: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
    maxHeight?: string | number;
    height?: string | number;
    overflowX?: 'auto' | 'scroll' | 'hidden' | 'visible';
    overflowY?: 'auto' | 'scroll' | 'hidden' | 'visible';
}

/**
 * A wrapper component that provides a thin, themed scrollbar for its content.
 * Uses the brand color #5b6cf9 for consistent UI throughout the application.
 */
const ThinScroll: React.FC<ThinScrollProps> = ({
    children,
    style,
    className = '',
    maxHeight,
    height,
    overflowX = 'auto',
    overflowY = 'auto'
}) => {
    return (
        <div
            className={`custom-thin-scroll ${className}`}
            style={{
                maxHeight,
                height,
                overflowX,
                overflowY,
                ...style
            }}
        >
            {children}
        </div>
    );
};

export default ThinScroll;
