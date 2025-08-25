import api from './api';

class BoardService {
  // Get all user boards (owned and collaborative)
  async getAllBoards(page = 1, limit = 10) {
    try {
      const response = await api.get(`/boards?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching boards:', error);
      throw error;
    }
  }

  // Get specific board by ID
  async getBoardById(boardId) {
    try {
      const response = await api.get(`/boards/${boardId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching board:', error);
      throw error;
    }
  }

  // Get board by share token
  async getBoardByShareToken(token) {
    try {
      const response = await api.get(`/boards/access/${token}`);
      return response.data;
    } catch (error) {
      console.error('Error accessing shared board:', error);
      throw error;
    }
  }

  // Alias for getBoardById for backward compatibility
  async getBoard(boardId) {
    return this.getBoardById(boardId);
  }

  // Create new board
  async createBoard(boardData) {
    try {
      const response = await api.post('/boards', boardData);
      return response.data;
    } catch (error) {
      console.error('Error creating board:', error);
      throw error;
    }
  }

  // Update board details
  async updateBoard(boardId, boardData) {
    try {
      const response = await api.put(`/boards/${boardId}`, boardData);
      return response.data;
    } catch (error) {
      console.error('Error updating board:', error);
      throw error;
    }
  }

  // Delete board
  async deleteBoard(boardId) {
    try {
      const response = await api.delete(`/boards/${boardId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting board:', error);
      throw error;
    }
  }

  // Update board elements (canvas data)
  async updateBoardElements(boardId, elements) {
    try {
      const response = await api.put(`/boards/${boardId}/elements`, { elements });
      return response.data;
    } catch (error) {
      console.error('Error updating board elements:', error);
      throw error;
    }
  }

  // Add collaborator to board
  async addCollaborator(boardId, email, role = 'viewer') {
    try {
      const response = await api.post(`/boards/${boardId}/collaborators`, { email, role });
      return response.data;
    } catch (error) {
      console.error('Error adding collaborator:', error);
      throw error;
    }
  }

  // Remove collaborator from board
  async removeCollaborator(boardId, userId) {
    try {
      const response = await api.delete(`/boards/${boardId}/collaborators/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error removing collaborator:', error);
      throw error;
    }
  }

  // Save board elements with debouncing
  debounceTimer = null;
  
  saveBoardElementsDebounced(boardId, elements, delay = 1000) {
    return new Promise((resolve, reject) => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      
      this.debounceTimer = setTimeout(async () => {
        try {
          const result = await this.updateBoardElements(boardId, elements);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  }
}

export default new BoardService();
