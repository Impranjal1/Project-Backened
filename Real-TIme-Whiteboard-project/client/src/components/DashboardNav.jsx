import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import dashboardIcon from "../assets/bgimage.png";

// Helper function to get user initials
function getUserInitials(user) {
  if (!user) return 'U';
  
  if (user.initials) {
    return user.initials.toUpperCase();
  }
  
  if (user.name) {
    const names = user.name.trim().split(' ');
    if (names.length >= 2) {
      return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    }
    return names[0].charAt(0).toUpperCase();
  }
  
  if (user.email) {
    return user.email.charAt(0).toUpperCase();
  }
  
  return 'U';
}

function DashboardNav() {
    const navigate = useNavigate();
    const { logout, user } = useAuth();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        setDrawerOpen(false);
        navigate('/');
    };
    return (
        <nav
            className="fixed w-full z-20 top-0 bg-[#e1ee90] border-b border-gray-200 shadow-sm"
        >
            <div className="flex items-center justify-between px-4 py-3">
                {/* Branding */}
                <div className="flex flex-row items-center gap-4 cursor-pointer" onClick={() => navigate('/dashboard') }>
                    <img src={dashboardIcon} alt="Dashboard Icon" className="w-12 h-12 rounded-lg border-2 border-gray-400 bg-white" />
                    <span className="borel-regular" style={{ fontSize: '40px', lineHeight: '40px', marginLeft: '8px', display: 'inline-block', verticalAlign: 'middle' }}>Dashboard</span>
                </div>
                {/* Hamburger for mobile */}
                <button
                    className="md:hidden flex flex-col justify-center items-center w-12 h-12 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                    onClick={() => setDrawerOpen(!drawerOpen)}
                    aria-label="Open navigation menu"
                >
                    <span className={`block w-8 h-1 bg-gray-800 rounded transition-all duration-300 ${drawerOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                    <span className={`block w-8 h-1 bg-gray-800 rounded my-1 transition-all duration-300 ${drawerOpen ? 'opacity-0' : ''}`}></span>
                    <span className={`block w-8 h-1 bg-gray-800 rounded transition-all duration-300 ${drawerOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
                </button>
                {/* Desktop Nav - Dashboard only: User info, Logout and Help */}
                <ul className="hidden md:flex flex-row p-4 md:px-16 md:py-2 md:p-0 mt-4 font-semibold text-lg border border-gray-100 rounded-lg bg-gray-700 md:space-x-8 rtl:space-x-reverse md:mt-0 md:border-0 md:bg-gray-700 dark:bg-gray-600 dark:border-gray-700 w-auto min-w-[400px] justify-end items-center">
                    <li className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {getUserInitials(user)}
                        </div>
                        <span className="text-white text-sm">{user?.name || 'User'}</span>
                    </li>
                    <li><button onClick={handleLogout} className="text-gray-900 dark:text-white px-4 py-2 rounded hover:bg-gray-800 hover:text-white transition-colors">Logout</button></li>
                    <li><button onClick={() => alert('Help coming soon!')} className="text-gray-900 dark:text-white px-4 py-2 rounded hover:bg-gray-800 hover:text-white transition-colors">Help</button></li>
                </ul>
            </div>
            {/* Mobile Side Drawer - Dashboard only: Logout and Help */}
            <div
                className={`fixed top-0 left-0 h-full w-64 bg-gray-700 dark:bg-gray-600 shadow-lg z-50 transform ${drawerOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 md:hidden`}
                style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
            >
                <div className="flex flex-row items-center gap-4 p-4 border-b border-gray-600">
                    <span className="borel-regular text-2xl text-white">Menu</span>
                    <button
                        className="ml-auto text-white text-3xl font-bold focus:outline-none"
                        onClick={() => setDrawerOpen(false)}
                        aria-label="Close navigation menu"
                    >
                        &times;
                    </button>
                </div>
                <ul className="flex flex-col p-4 space-y-4">
                    <li className="flex items-center gap-3 px-4 py-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {getUserInitials(user)}
                        </div>
                        <span className="text-white text-sm">{user?.name || 'User'}</span>
                    </li>
                    <li><button onClick={handleLogout} className="text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors w-full text-left">Logout</button></li>
                    <li><button onClick={() => { alert('Help coming soon!'); setDrawerOpen(false);}} className="text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors w-full text-left">Help</button></li>
                </ul>
            </div>
            {/* Overlay for drawer */}
            {drawerOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-30 z-40 md:hidden"
                    onClick={() => setDrawerOpen(false)}
                />
            )}
        </nav>
    );
}

export default DashboardNav;
