import React from "react"

import { AuthProvider } from "../contexts/AuthContext";
import Nav from "./Nav.jsx";
import DashboardNav from "./DashboardNav.jsx";
import Content from "./Content.jsx";
import Image from "./Image.jsx";
import Login from "../pages/Login.jsx";
import Signup from "../pages/Signup.jsx";
import About from "../pages/About.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import CanvasPageFixed from "../pages/CanvasPageFixed.jsx";
import AuthSuccess from "./AuthSuccess.jsx";
import PageTransition from "./PageTransition.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import PublicRoute from "./PublicRoute.jsx";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";

function AppRoutes() {
    const location = useLocation();
    return (
        <Image>
            <div className="w-full flex justify-center">
                <PageTransition locationKey={location.key}>
                    <Routes location={location}>
                        {/* Public routes - accessible without authentication */}
                        <Route path="/" element={
                            <PublicRoute>
                                <Content />
                            </PublicRoute>
                        } />
                        <Route path="/login" element={
                            <PublicRoute>
                                <Login />
                            </PublicRoute>
                        } />
                        <Route path="/signup" element={
                            <PublicRoute>
                                <Signup />
                            </PublicRoute>
                        } />
                        <Route path="/about" element={
                            <PublicRoute>
                                <About />
                            </PublicRoute>
                        } />
                        <Route path="/content" element={
                            <PublicRoute>
                                <Content />
                            </PublicRoute>
                        } />
                        <Route path="/auth/success" element={
                            <PublicRoute>
                                <AuthSuccess />
                            </PublicRoute>
                        } />

                        {/* Protected routes - require authentication */}
                        <Route path="/dashboard" element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        } />
                        <Route path="/canvas" element={
                            <ProtectedRoute>
                                <CanvasPageFixed />
                            </ProtectedRoute>
                        } />
                        
                        {/* Shared board route */}
                        <Route path="/boards/:boardId" element={
                            <ProtectedRoute>
                                <CanvasPageFixed />
                            </ProtectedRoute>
                        } />

                        {/* Share token route - allows access via share link */}
                        <Route path="/share/:token" element={<CanvasPageFixed />} />

                        {/* Catch all route */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </PageTransition>
            </div>
        </Image>
    );
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <RouteAwareNav />
                <AppRoutes />
            </Router>
        </AuthProvider>
    );
}


function RouteAwareNav() {
    const location = useLocation();
    if (location.pathname === "/dashboard") {
        return <DashboardNav />;
    }
    if (location.pathname === "/canvas" || location.pathname.startsWith("/boards/")) {
        return null; // No global navbar for canvas page - it has its own custom navbar
    }
    return <Nav />;
}

export default App;