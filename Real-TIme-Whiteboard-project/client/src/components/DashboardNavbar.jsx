import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import dashboardIcon from "../assets/bgimage.png";

// Navbar for Dashboard page (authenticated users)
function DashboardNavbar() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/'); // Go back to Content page
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <nav className="fixed w-full z-20 top-0 bg-gray-700 dark:bg-gray-600 border-b border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3">
                {/* Logo */}
                <div className="flex items-center cursor-pointer" onClick={() => navigate('/dashboard')}>
                    <img src={dashboardIcon} alt="Dashboard Icon" className="w-12 h-12 rounded-lg border-2 border-gray-400 bg-white" />
                    <span className="borel-regular text-white" style={{ fontSize: '40px', lineHeight: '40px', marginLeft: '8px', display: 'inline-block', verticalAlign: 'middle' }}>Dashboard</span>
                </div>
                
                {/* Dashboard navigation */}
                <div className="flex items-center space-x-4">
                    {/* User info */}
                    {user && (
                        <div className="flex items-center gap-2 text-white">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                {user?.initials || user?.name?.charAt(0) || 'U'}
                            </div>
                            <span className="text-sm">{user?.name}</span>
                        </div>
                    )}
                    
                    <button 
                        onClick={() => navigate('/help')} 
                        className="text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors"
                    >
                        Help
                    </button>
                    
                    <button 
                        onClick={handleLogout} 
                        className="text-white px-4 py-2 rounded bg-red-600 hover:bg-red-700 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
}

export default DashboardNavbar;
