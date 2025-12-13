import {FC} from "react";
import React from "react";


interface Props {
    children: React.ReactNode;
}

const Layout:FC<Props>=({children}) => {
    return (
        <div className="layout">
            <div className="main-container">
                {children}
            </div>
        </div>
    )
}
export default Layout