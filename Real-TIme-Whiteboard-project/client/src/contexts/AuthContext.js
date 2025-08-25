import React, { createContext, useContext, useReducer, useEffect } from 'react';
import authService from '../services/authService';

// Initial state
const initialState = {
  isAuthenticated: false,
  user: null,
  loading: true,
  error: null,
};

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  UPDATE_USER: 'UPDATE_USER',
  SET_LOADING: 'SET_LOADING',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        loading: true,
        error: null,
      };
    
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        loading: false,
        error: null,
      };
    
    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        loading: false,
        error: action.payload,
      };
    
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,
      };
    
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      
      // Check if user has valid token
      if (authService.isAuthenticated()) {
        const storedUser = authService.getStoredUser();
        
        if (storedUser) {
          // Use stored user data for immediate UI update
          dispatch({ 
            type: AUTH_ACTIONS.LOGIN_SUCCESS, 
            payload: storedUser 
          });
        }
        
        // Verify with server and get latest user data
        try {
          const response = await authService.getCurrentUser();
          if (response.success) {
            authService.setStoredUser(response.user);
            dispatch({ 
              type: AUTH_ACTIONS.LOGIN_SUCCESS, 
              payload: response.user 
            });
          }
        } catch (error) {
          // If server verification fails, logout
          dispatch({ type: AUTH_ACTIONS.LOGOUT });
        }
      } else {
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      dispatch({ 
        type: AUTH_ACTIONS.LOGIN_FAILURE, 
        payload: error.message 
      });
    }
  };

  const login = async (token) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });
      
      if (authService.handleAuthSuccess(token)) {
        const response = await authService.getCurrentUser();
        if (response.success) {
          authService.setStoredUser(response.user);
          dispatch({ 
            type: AUTH_ACTIONS.LOGIN_SUCCESS, 
            payload: response.user 
          });
          return true;
        }
      }
      
      throw new Error('Invalid authentication token');
    } catch (error) {
      dispatch({ 
        type: AUTH_ACTIONS.LOGIN_FAILURE, 
        payload: error.message 
      });
      return false;
    }
  };

  // Register new user with email/password
  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });
      
      const response = await authService.register(userData);
      if (response.success) {
        dispatch({ 
          type: AUTH_ACTIONS.LOGIN_SUCCESS, 
          payload: response.user 
        });
        return response;
      }
      
      dispatch({ 
        type: AUTH_ACTIONS.LOGIN_FAILURE, 
        payload: response.message 
      });
      return response;
    } catch (error) {
      console.error('Registration error:', error);
      dispatch({ 
        type: AUTH_ACTIONS.LOGIN_FAILURE, 
        payload: error.message || 'Registration failed' 
      });
      throw error;
    }
  };

  // Login with email/password
  const loginWithPassword = async (credentials) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });
      
      const response = await authService.login(credentials);
      if (response.success) {
        dispatch({ 
          type: AUTH_ACTIONS.LOGIN_SUCCESS, 
          payload: response.user 
        });
        return response;
      }
      
      dispatch({ 
        type: AUTH_ACTIONS.LOGIN_FAILURE, 
        payload: response.message 
      });
      return response;
    } catch (error) {
      console.error('Login error:', error);
      dispatch({ 
        type: AUTH_ACTIONS.LOGIN_FAILURE, 
        payload: error.message || 'Login failed' 
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    } catch (error) {
      console.error('Error during logout:', error);
      // Still dispatch logout to clear local state
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  const updateUser = (userData) => {
    dispatch({ type: AUTH_ACTIONS.UPDATE_USER, payload: userData });
    // Update stored user data
    if (state.user) {
      authService.setStoredUser({ ...state.user, ...userData });
    }
  };

  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  const value = {
    ...state,
    login,
    register,
    loginWithPassword,
    logout,
    updateUser,
    clearError,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
