import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    const handleAuthSuccess = async () => {
      try {
        // Extract token from URL parameters
        const urlParams = new URLSearchParams(location.search);
        const token = urlParams.get('token');
        const error = urlParams.get('error');

        if (error) {
          setStatus('error');
          console.error('Authentication error:', error);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        if (token) {
          const success = await login(token);
          if (success) {
            setStatus('success');
            // Redirect to dashboard after successful login
            setTimeout(() => navigate('/dashboard'), 1500);
          } else {
            setStatus('error');
            setTimeout(() => navigate('/login'), 3000);
          }
        } else {
          setStatus('error');
          setTimeout(() => navigate('/login'), 3000);
        }
      } catch (error) {
        console.error('Error handling auth success:', error);
        setStatus('error');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleAuthSuccess();
  }, [location, login, navigate]);

  const renderContent = () => {
    switch (status) {
      case 'processing':
        return (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Authenticating...</h2>
            <p className="text-gray-600">Please wait while we sign you in.</p>
          </div>
        );
      
      case 'success':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Welcome!</h2>
            <p className="text-gray-600">Successfully signed in. Redirecting to dashboard...</p>
          </div>
        );
      
      case 'error':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Authentication Failed</h2>
            <p className="text-gray-600">There was a problem signing you in. Redirecting to login...</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#e1ee90] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default AuthSuccess;
