import React from "react";
import { useNavigate } from "react-router-dom";
import dashboardIcon from "../assets/bgimage.png";

// Simple navbar for login/signup pages - NO user info ever
function AuthNav() {
    const navigate = useNavigate();

    return (
        <nav className="fixed w-full z-20 top-0 bg-gray-700 dark:bg-gray-600 border-b border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3">
                {/* Logo */}
                <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
                    <img src={dashboardIcon} alt="Dashboard Icon" className="w-12 h-12 rounded-lg border-2 border-gray-400 bg-white" />
                    <span className="borel-regular text-white" style={{ fontSize: '40px', lineHeight: '40px', marginLeft: '8px', display: 'inline-block', verticalAlign: 'middle' }}>Dashboard</span>
                </div>
                
                {/* Simple nav links */}
                <div className="flex items-center space-x-4">
                    <button onClick={() => navigate('/')} className="text-white px-4 py-2 rounded hover:bg-gray-800 hover:text-white transition-colors">
                        Home
                    </button>
                    <button onClick={() => navigate('/about')} className="text-white px-4 py-2 rounded hover:bg-gray-800 hover:text-white transition-colors">
                        About
                    </button>
                </div>
            </div>
        </nav>
    );
}

export default AuthNav;
