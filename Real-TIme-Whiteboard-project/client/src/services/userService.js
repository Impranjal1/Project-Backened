import api from './api';

class UserService {
  // Search users by email or name
  async searchUsers(query, limit = 10) {
    try {
      const response = await api.get(`/users/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  // Get user profile by ID
  async getUserProfile(userId) {
    try {
      const response = await api.get(`/users/profile/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  // Get user statistics
  async getUserStats() {
    try {
      const response = await api.get('/users/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  }

  // Update user preferences
  async updatePreferences(preferences) {
    try {
      const response = await api.put('/users/preferences', preferences);
      return response.data;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  // Get user activity feed
  async getUserActivity(page = 1, limit = 20) {
    try {
      const response = await api.get(`/users/activity?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user activity:', error);
      throw error;
    }
  }
}

export default new UserService();
