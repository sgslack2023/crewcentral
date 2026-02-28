import { FC, useContext } from "react";
import React from "react";
import Sidebar from "./Sidebar";
import { store } from "../utils/store";

interface Props {
    children: React.ReactNode;
}

const Layout: FC<Props> = ({ children }) => {
    const { state } = useContext(store);
    const currentUser = state.user;

    return (
        <div className="layout" style={{ display: 'flex', height: '100vh', backgroundColor: '#f4f6f8', overflow: 'hidden' }}>
            {/* Left Sidebar */}
            <Sidebar currentUser={currentUser} />

            {/* Main Content Area */}
            {/* NOTE: style.scss defines `.main-container` with padding/min-height; override here to allow full-height pages */}
            <div
                className="main-container"
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    height: '100%',
                    minHeight: 0,
                    padding: 0,
                }}
            >
                {children}
            </div>
        </div>
    )
}
export default Layout