
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import boardService from "../services/boardService";
import PageBox from "../components/PageBox.jsx";
import dashboardIcon from "../assets/bgimage.png";

function getNowString() {
  return new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

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

function Dashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();
  const [boards, setBoards] = useState([]);
  const [collaborativeBoards, setCollaborativeBoards] = useState([]);
  const [search, setSearch] = useState("");
  const [menuOpenIdx, setMenuOpenIdx] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [error, setError] = useState("");
  const [editIdx, setEditIdx] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Load boards when component mounts or user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      loadBoards();
    }
  }, [isAuthenticated, user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  const loadBoards = async () => {
    try {
      setLoadingBoards(true);
      const response = await boardService.getAllBoards();
      if (response.success) {
        setBoards(response.data.ownedBoards || []);
        setCollaborativeBoards(response.data.collaborativeBoards || []);
      }
    } catch (error) {
      console.error('Error loading boards:', error);
      setError('Failed to load boards');
    } finally {
      setLoadingBoards(false);
    }
  };

  const handleCreate = () => {
    setShowModal(true);
    setNewTitle("");
    setNewDescription("");
    setError("");
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setError("Title is required");
      return;
    }

    try {
      setIsCreating(true);
      setError("");
      
      const boardData = {
        title: newTitle.trim(),
        description: newDescription.trim(),
        settings: {
          isPublic: false,
          allowComments: true,
          theme: 'light',
        }
      };

      const response = await boardService.createBoard(boardData);
      
      if (response.success) {
        // Add new board to the list
        setBoards(prev => [response.board, ...prev]);
        setShowModal(false);
        setNewTitle("");
        setNewDescription("");
        
        // Navigate to the new board
        navigate('/canvas', { 
          state: { 
            board: {
              ...response.board,
              id: response.board._id
            } 
          } 
        });
      }
    } catch (error) {
      console.error('Error creating board:', error);
      setError(error.response?.data?.message || 'Failed to create board');
    } finally {
      setIsCreating(false);
    }
  };

  // Combine all boards for filtering
  const allBoards = [...boards, ...collaborativeBoards];
  const filteredBoards = allBoards.filter((b) => b.title.toLowerCase().includes(search.toLowerCase()));

  // Handler functions must be defined before use in JSX
  const handleEditTitle = async (idx) => {
    const board = filteredBoards[idx];
    setEditIdx(idx);
    setEditTitle(board.title);
    setMenuOpenIdx(null);
  };

  const handleEditTitleSubmit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    
    try {
      const board = filteredBoards[editIdx];
      const response = await boardService.updateBoard(board._id, { title: editTitle.trim() });
      
      if (response.success) {
        // Update local state
        setBoards(prev => prev.map(b => 
          b._id === board._id ? { ...b, title: editTitle.trim(), lastModified: new Date() } : b
        ));
        setCollaborativeBoards(prev => prev.map(b => 
          b._id === board._id ? { ...b, title: editTitle.trim(), lastModified: new Date() } : b
        ));
      }
    } catch (error) {
      console.error('Error updating board title:', error);
      setError('Failed to update board title');
    }
    
    setEditIdx(null);
    setEditTitle("");
  };

  const handleEditTitleCancel = () => {
    setEditIdx(null);
    setEditTitle("");
  };

  const handleDelete = async (idx) => {
    const board = filteredBoards[idx];
    
    if (window.confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
      try {
        await boardService.deleteBoard(board._id);
        
        // Remove from local state
        setBoards(prev => prev.filter(b => b._id !== board._id));
        setCollaborativeBoards(prev => prev.filter(b => b._id !== board._id));
        
        setMenuOpenIdx(null);
      } catch (error) {
        console.error('Error deleting board:', error);
        setError('Failed to delete board');
      }
    }
  };

  const handleBoardClick = (board) => {
    navigate('/canvas', { 
      state: { 
        board: {
          ...board,
          id: board._id
        } 
      } 
    });
  };

  const handleModalCancel = () => {
    setShowModal(false);
    setNewTitle("");
    setError("");
  };

  return (
    <PageBox>
      {/* Header */}
      <header className="flex flex-col md:flex-row items-center justify-between w-full pb-6 mb-8 border-b border-gray-300">
        <div className="flex items-center space-x-2 mb-4 md:mb-0">
          {/* Brand Icon */}
          <img src={dashboardIcon} alt="Dashboard Icon" className="w-12 h-12 rounded-lg border-2 border-gray-400 bg-white" />
          <h1 className="text-3xl borel-regular text-[#7a6c5d] font-extrabold">Dashboard</h1>
        </div>
        <div className="flex items-center space-x-4 w-full md:w-auto justify-end">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Search boards..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-full w-48 md:w-64 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            className="flex items-center px-6 py-2 bg-blue-700 text-white font-semibold rounded-full shadow-md hover:bg-blue-800 transition-colors"
            onClick={handleCreate}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M5 12h14" /><path d="M12 5v14" />
            </svg>
            Create
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold text-white text-sm">
              {getUserInitials(user)}
            </div>
            <span className="text-gray-700 text-sm font-medium hidden sm:block">
              {user?.name || 'User'}
            </span>
          </div>
        </div>
      </header>
      {/* Boards Grid */}
      {loadingBoards ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* User's Own Boards */}
          {boards.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">My Boards</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
                {boards.filter(board => board.title.toLowerCase().includes(search.toLowerCase())).map((board, idx) => (
                  <div
                    key={board._id}
                    className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer flex flex-col relative group"
                    onClick={() => handleBoardClick(board)}
                  >
                    <div className="h-40 bg-gradient-to-br from-blue-100 to-purple-100 rounded-t-xl flex items-center justify-center p-4">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-white rounded-lg shadow-md flex items-center justify-center mb-2 mx-auto">
                          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          </svg>
                        </div>
                        <p className="text-sm text-gray-600 font-medium truncate">{board.title}</p>
                      </div>
                      {/* 3-dot menu */}
                      <div className="absolute top-2 right-2 z-10">
                        <button
                          className="p-2 rounded-full hover:bg-white hover:bg-opacity-50 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={e => { e.stopPropagation(); setMenuOpenIdx(board._id === menuOpenIdx ? null : board._id); }}
                        >
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <circle cx="5" cy="12" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="19" cy="12" r="2" />
                          </svg>
                        </button>
                        {menuOpenIdx === board._id && (
                          <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                            <button
                              className="block w-full text-left px-4 py-2 text-blue-600 hover:bg-gray-100"
                              onClick={e => { e.stopPropagation(); handleEditTitle(boards.findIndex(b => b._id === board._id)); }}
                            >
                              Edit
                            </button>
                            <button
                              className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                              onClick={e => { e.stopPropagation(); handleDelete(boards.findIndex(b => b._id === board._id)); }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">{board.title}</h3>
                      {board.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{board.description}</p>
                      )}
                      <div className="mt-auto">
                        <p className="text-xs text-gray-500">
                          Updated {new Date(board.lastModified || board.updatedAt).toLocaleDateString()}
                        </p>
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          <span>{board.elements?.length || 0} elements</span>
                          {board.collaborators && board.collaborators.length > 0 && (
                            <span className="ml-2">• {board.collaborators.length} collaborator{board.collaborators.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collaborative Boards */}
          {collaborativeBoards.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Shared with Me</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
                {collaborativeBoards.filter(board => board.title.toLowerCase().includes(search.toLowerCase())).map((board) => (
                  <div
                    key={board._id}
                    className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer flex flex-col relative group border-l-4 border-green-500"
                    onClick={() => handleBoardClick(board)}
                  >
                    <div className="h-40 bg-gradient-to-br from-green-100 to-blue-100 rounded-t-xl flex items-center justify-center p-4">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-white rounded-lg shadow-md flex items-center justify-center mb-2 mx-auto">
                          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                          </svg>
                        </div>
                        <p className="text-sm text-gray-600 font-medium truncate">{board.title}</p>
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">{board.title}</h3>
                      {board.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{board.description}</p>
                      )}
                      <div className="mt-auto">
                        <p className="text-xs text-gray-500">
                          Shared by {board.owner?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Updated {new Date(board.lastModified || board.updatedAt).toLocaleDateString()}
                        </p>
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          <span>{board.elements?.length || 0} elements</span>
                          <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                            {board.collaborators?.find(c => c.user._id === user?._id)?.role || 'viewer'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {boards.length === 0 && collaborativeBoards.length === 0 && !loadingBoards && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No boards yet</h3>
              <p className="text-gray-600 mb-4">Create your first board to start collaborating!</p>
              <button
                onClick={handleCreate}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                Create Your First Board
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal for Edit Title */}
      {editIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold" onClick={handleEditTitleCancel}>&times;</button>
            <form onSubmit={handleEditTitleSubmit} className="flex flex-col gap-6">
              <h2 className="text-2xl borel-regular text-[#7a6c5d] mb-2">Change Board Title</h2>
              <input
                type="text"
                placeholder="Enter new board title"
                className="p-4 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                autoFocus
              />
              <div className="flex gap-4 w-full justify-center">
                <button type="submit" className="px-6 py-2 rounded bg-blue-700 text-white font-medium hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300">Save</button>
                <button type="button" className="px-6 py-2 rounded bg-gray-400 text-white font-medium hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300" onClick={handleEditTitleCancel}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Create Board */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold" onClick={() => setShowModal(false)}>&times;</button>
            <form onSubmit={handleModalSubmit} className="flex flex-col gap-6">
              <h2 className="text-2xl borel-regular text-[#7a6c5d] mb-2">Create Board</h2>
              <input
                type="text"
                placeholder="Enter board title"
                className="p-4 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full"
                value={newTitle}
                onChange={e => { setNewTitle(e.target.value); setError(""); }}
                autoFocus
              />
              <textarea
                placeholder="Enter board description (optional)"
                className="p-4 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full resize-none"
                rows="3"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
              />
              {error && <div className="text-red-600 text-sm">{error}</div>}
              <div className="flex gap-4 w-full justify-center">
                <button 
                  type="submit" 
                  className="px-6 py-2 rounded bg-blue-700 text-white font-medium hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
                <button 
                  type="button" 
                  className="px-6 py-2 rounded bg-gray-400 text-white font-medium hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300" 
                  onClick={() => setShowModal(false)}
                  disabled={isCreating}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageBox>
  );
}

export default Dashboard;
