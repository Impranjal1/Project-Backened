import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import dashboardIcon from "../assets/bgimage.png";

// Navbar for non-authenticated pages (Content, Login, Signup, About)
function PublicNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const [drawerOpen, setDrawerOpen] = useState(false);

    return (
        <nav
            className="fixed w-full z-20 top-0 bg-[#e1ee90] border-b border-gray-200 shadow-sm"
        >
            <div className="flex items-center justify-between px-4 py-3">
                {/* Branding */}
                <div className="flex flex-row items-center gap-4 cursor-pointer" onClick={() => navigate('/')}>
                    <img src={dashboardIcon} alt="Dashboard Icon" className="w-12 h-12 rounded-lg border-2 border-gray-400 bg-white" />
                    <span className="borel-regular" style={{ fontSize: '40px', lineHeight: '40px', marginLeft: '8px', display: 'inline-block', verticalAlign: 'middle' }}>Dashboard</span>
                </div>
                {/* Hamburger for mobile */}
                <button
                    className="md:hidden flex flex-col justify-center items-center w-12 h-12 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                    onClick={() => setDrawerOpen(!drawerOpen)}
                >
                    <span className={`block w-8 h-1 bg-gray-800 rounded transition-all duration-300 ${drawerOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                    <span className={`block w-8 h-1 bg-gray-800 rounded my-1 transition-all duration-300 ${drawerOpen ? 'opacity-0' : ''}`}></span>
                    <span className={`block w-8 h-1 bg-gray-800 rounded transition-all duration-300 ${drawerOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
                </button>
                {/* Desktop navigation */}
                <ul className="hidden md:flex flex-row p-4 md:px-16 md:py-2 md:p-0 mt-4 font-semibold text-lg border border-gray-100 rounded-lg bg-gray-700 md:space-x-8 rtl:space-x-reverse md:mt-0 md:border-0 md:bg-gray-700 dark:bg-gray-600 dark:border-gray-700 w-auto min-w-[400px] justify-end items-center">
                    <li><button onClick={() => navigate('/')} className={`text-gray-900 dark:text-white px-4 py-2 rounded hover:bg-gray-800 hover:text-white transition-colors ${location.pathname === '/' ? 'bg-gray-800 text-white' : ''}`}>Home</button></li>
                    <li><button onClick={() => navigate('/about')} className={`text-gray-900 dark:text-white px-4 py-2 rounded hover:bg-gray-800 hover:text-white transition-colors ${location.pathname === '/about' ? 'bg-gray-800 text-white' : ''}`}>About</button></li>
                    {/* Show login/signup buttons only if not already on those pages */}
                    {location.pathname !== '/login' && location.pathname !== '/signup' && (
                        <>
                            <li><button onClick={() => navigate('/login')} className="text-gray-900 dark:text-white px-4 py-2 rounded hover:bg-gray-800 hover:text-white transition-colors">Login</button></li>
                            <li><button onClick={() => navigate('/signup')} className="text-gray-900 dark:text-white px-4 py-2 rounded hover:bg-gray-800 hover:text-white transition-colors">Sign Up</button></li>
                        </>
                    )}
                </ul>
                {/* Mobile Drawer */}
                <div
                    className={`fixed top-0 left-0 h-full w-64 bg-gray-700 dark:bg-gray-600 shadow-lg z-50 transform ${drawerOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 md:hidden`}
                >
                    <div className="flex justify-between items-center p-4 border-b border-gray-600">
                        <span className="text-white font-semibold text-lg">Menu</span>
                        <button
                            onClick={() => setDrawerOpen(false)}
                            className="text-white hover:text-gray-300 focus:outline-none"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <ul className="flex flex-col p-4 space-y-2">
                        <li><button onClick={() => { navigate('/'); setDrawerOpen(false); }} className={`text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors w-full text-left ${location.pathname === '/' ? 'bg-gray-800' : ''}`}>Home</button></li>
                        <li><button onClick={() => { navigate('/about'); setDrawerOpen(false); }} className={`text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors w-full text-left ${location.pathname === '/about' ? 'bg-gray-800' : ''}`}>About</button></li>
                        {/* Show login/signup buttons only if not already on those pages */}
                        {location.pathname !== '/login' && location.pathname !== '/signup' && (
                            <>
                                <li><button onClick={() => { navigate('/login'); setDrawerOpen(false); }} className="text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors w-full text-left">Login</button></li>
                                <li><button onClick={() => { navigate('/signup'); setDrawerOpen(false); }} className="text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors w-full text-left">Sign Up</button></li>
                            </>
                        )}
                    </ul>
                </div>
                {/* Overlay */}
                {drawerOpen && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                        onClick={() => setDrawerOpen(false)}
                    ></div>
                )}
            </div>
        </nav>
    );
}

export default PublicNav;
