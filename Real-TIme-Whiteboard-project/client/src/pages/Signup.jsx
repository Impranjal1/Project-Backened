import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import PageBox from "../components/PageBox.jsx";

function Signup() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [signupLoading, setSignupLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    // Redirect to dashboard if already authenticated
    if (isAuthenticated && !loading) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    setError('');
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSignupLoading(true);
    setError('');

    try {
      const response = await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password
      });

      if (response.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(response.message || 'Registration failed');
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setSignupLoading(false);
    }
  };

  if (loading) {
    return (
      <PageBox>
        <div className="flex flex-col items-center justify-center min-h-[400px] w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </PageBox>
    );
  }
  return (
    <PageBox>
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full">
        <h2 className="text-6xl borel-regular text-[#7a6c5d] mb-8">SignUP</h2>
        
        {/* Info about test accounts */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 w-full" style={{ maxWidth: '54rem' }}>
          <h3 className="text-lg font-semibold text-blue-800 mb-3">🧪 Test Accounts Available</h3>
          <p className="text-blue-700 mb-3">
            For testing purposes, you can use these pre-created accounts instead of signing up:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white rounded p-3 border border-blue-200">
              <p className="font-medium text-blue-800">Test User</p>
              <p className="text-sm text-blue-600">test@example.com</p>
              <p className="text-xs text-blue-500">Password: test123</p>
            </div>
            <div className="bg-white rounded p-3 border border-green-200">
              <p className="font-medium text-green-800">Demo User</p>
              <p className="text-sm text-green-600">demo@example.com</p>
              <p className="text-xs text-green-500">Password: demo123</p>
            </div>
            <div className="bg-white rounded p-3 border border-red-200">
              <p className="font-medium text-red-800">Admin User</p>
              <p className="text-sm text-red-600">admin@example.com</p>
              <p className="text-xs text-red-500">Password: admin123</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try Test Login →
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full" style={{ maxWidth: '32rem' }}>
          {error && (
            <div className="p-3 rounded bg-red-100 border border-red-300 text-red-700 text-sm">
              {error}
            </div>
          )}
          
          <div>
            <input 
              type="text" 
              name="name"
              placeholder="Full Name" 
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full p-4 rounded border ${validationErrors.name ? 'border-red-300' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-400`}
              required
            />
            {validationErrors.name && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.name}</p>
            )}
          </div>
          
          <div>
            <input 
              type="email" 
              name="email"
              placeholder="Email Address" 
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full p-4 rounded border ${validationErrors.email ? 'border-red-300' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-400`}
              required
            />
            {validationErrors.email && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
            )}
          </div>
          
          <div>
            <input 
              type="password" 
              name="password"
              placeholder="Password (min. 6 characters)" 
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full p-4 rounded border ${validationErrors.password ? 'border-red-300' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-400`}
              required
            />
            {validationErrors.password && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.password}</p>
            )}
          </div>
          
          <div>
            <input 
              type="password" 
              name="confirmPassword"
              placeholder="Confirm Password" 
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`w-full p-4 rounded border ${validationErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-400`}
              required
            />
            {validationErrors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.confirmPassword}</p>
            )}
          </div>
          
          <button 
            type="submit"
            disabled={signupLoading}
            className={`p-4 rounded font-medium text-white transition-colors ${
              signupLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400'
            }`}
          >
            {signupLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account? 
          <button 
            onClick={() => navigate('/login')} 
            className="text-blue-600 hover:underline ml-1"
          >
            Sign in
          </button>
        </p>
      </div>
    </PageBox>
  );
}

export default Signup;
