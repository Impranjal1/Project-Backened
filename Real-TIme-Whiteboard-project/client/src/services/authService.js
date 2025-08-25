import api from './api';

class AuthService {
  // Register new user with email/password
  async register(userData) {
    try {
      const response = await api.post('/auth/register', userData);
      if (response.data.success && response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('Error during registration:', error);
      throw error.response?.data || { success: false, message: 'Registration failed' };
    }
  }

  // Login user with email/password
  async login(credentials) {
    try {
      const response = await api.post('/auth/login', credentials);
      if (response.data.success && response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('Error during login:', error);
      throw error.response?.data || { success: false, message: 'Login failed' };
    }
  }

  // Check authentication status
  async checkAuthStatus() {
    try {
      const response = await api.get('/auth/status');
      return response.data;
    } catch (error) {
      console.error('Error checking auth status:', error);
      return { isAuthenticated: false, user: null };
    }
  }

  // Get current user profile
  async getCurrentUser() {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  }

  // Start Google OAuth flow
  initiateGoogleLogin() {
    window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/google`;
  }

  // Handle auth success (called from auth success page)
  handleAuthSuccess(token) {
    if (token) {
      localStorage.setItem('token', token);
      return true;
    }
    return false;
  }

  // Logout user
  async logout() {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      // Clear local storage even if API call fails
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return false;
    }
  }

  // Update user profile
  async updateProfile(profileData) {
    try {
      const response = await api.put('/auth/profile', profileData);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  // Get stored token
  getToken() {
    return localStorage.getItem('token');
  }

  // Check if user is authenticated (based on stored token)
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      // Basic token validation (check if it's not expired)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch (error) {
      return false;
    }
  }

  // Get stored user data
  getStoredUser() {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      return null;
    }
  }

  // Store user data
  setStoredUser(userData) {
    localStorage.setItem('user', JSON.stringify(userData));
  }
}

const authService = new AuthService();
export default authService;
