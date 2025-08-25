import React from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import PublicNav from "./PublicNav";
import DashboardNavbar from "./DashboardNavbar";
import CanvasNavbar from "./CanvasNavbar";

function Nav() {
    const location = useLocation();
    const { isAuthenticated } = useAuth();
    
    // Define public pages (non-authenticated)
    const publicPages = ['/', '/login', '/signup', '/about'];
    const isPublicPage = publicPages.includes(location.pathname);
    
    // Define authenticated pages
    const isDashboardPage = location.pathname === '/dashboard';
    const isCanvasPage = location.pathname.startsWith('/canvas') || location.pathname.startsWith('/boards/');
    
    // Select the appropriate navbar based on current page and auth status
    if (isPublicPage || !isAuthenticated) {
        // Public pages or non-authenticated users always see PublicNav
        return <PublicNav />;
    } else if (isDashboardPage) {
        // Dashboard page shows DashboardNavbar
        return <DashboardNavbar />;
    } else if (isCanvasPage) {
        // Canvas page shows CanvasNavbar
        return <CanvasNavbar />;
    } else {
        // Default to DashboardNavbar for other authenticated pages
        return <DashboardNavbar />;
    }
}

export default Nav;
