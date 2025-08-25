import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ArrowLeft, Files, Share2 } from "lucide-react";

// Navbar for Canvas page (authenticated users)
function CanvasNavbar() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <nav className="fixed w-full z-20 top-0 bg-white border-b border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3">
                {/* Left section - Back button and board info */}
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/dashboard')} 
                        className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Back to Dashboard</span>
                    </button>
                    
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                            <Files className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-gray-900">Untitled Board</h1>
                        </div>
                    </div>
                </div>

                {/* Right section - Actions and user info */}
                <div className="flex items-center gap-3">
                    {/* Action buttons */}
                    <button className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
                        <Files className="w-4 h-4" />
                        <span className="text-sm font-medium">Files</span>
                    </button>
                    
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors">
                        <Share2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Share</span>
                    </button>

                    {/* Connection status */}
                    <div className="flex items-center gap-2 px-3 py-2 text-green-600 bg-green-50 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">Connected</span>
                    </div>

                    {/* Online users */}
                    <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                            {user && (
                                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-semibold border-2 border-white">
                                    {user?.initials || user?.name?.charAt(0) || 'U'}
                                </div>
                            )}
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold border-2 border-white">
                                T
                            </div>
                        </div>
                        <span className="text-sm text-gray-600">1 online</span>
                    </div>

                    {/* User menu */}
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            T
                        </div>
                        <span className="text-sm font-medium text-gray-700">Test User</span>
                        <button 
                            onClick={handleLogout}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default CanvasNavbar;
