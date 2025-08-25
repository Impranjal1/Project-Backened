import React, { useState, useEffect } from 'react';
import { Users, Crown, Shield, Eye, X, UserMinus, UserPlus } from 'lucide-react';

const ActiveUsersModal = ({ board, user, isOpen, onClose, connectedUsers, realtimeCollab }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Check if current user is the board owner
  const isOwner = user && board && board.owner && 
    (board.owner._id || board.owner) === user._id;

  useEffect(() => {
    if (isOpen && board) {
      fetchActiveUsers();
    }
  }, [isOpen, board]);

  const fetchActiveUsers = async () => {
    setLoading(true);
    try {
      // Get board collaborators
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/boards/${board._id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Combine board collaborators with currently connected users
        const collaborators = data.collaborators || [];
        const connectedUsersList = connectedUsers || [];
        
        // Create a combined list with connection status
        const activeUsersList = collaborators.map(collab => {
          const userId = collab.user._id || collab.user;
          
          // Check multiple ways a user might be connected
          const isConnected = connectedUsersList.some(connUser => 
            connUser.userId === userId || 
            connUser.user?._id === userId ||
            (connUser.user && connUser.user._id === userId)
          );
          
          // If this collaborator is the current user, they should be shown as online
          const isCurrentUser = user && (userId === user._id || userId.toString() === user._id.toString());
          
          return {
            ...collab,
            isConnected: isConnected || isCurrentUser,
            connectedUser: connectedUsersList.find(connUser => 
              connUser.userId === userId || 
              connUser.user?._id === userId ||
              (connUser.user && connUser.user._id === userId)
            ) || (isCurrentUser ? { 
              userId: user._id, 
              user: user, 
              joinedAt: new Date().toISOString() 
            } : null)
          };
        });

        // Add owner to the list if not already included
        const ownerInList = activeUsersList.some(u => 
          (u.user._id || u.user) === (board.owner._id || board.owner)
        );

        if (!ownerInList) {
          // Check if owner is connected via Socket.IO with multiple comparison methods
          const ownerId = board.owner._id || board.owner;
          const ownerConnected = connectedUsersList.some(connUser => 
            connUser.userId === ownerId || 
            connUser.user?._id === ownerId ||
            (connUser.user && connUser.user._id === ownerId)
          );
          
          // If the current user is the owner, they should always be shown as online
          const isCurrentUserOwner = user && (
            ownerId === user._id || 
            ownerId.toString() === user._id.toString()
          );
          
          activeUsersList.unshift({
            user: board.owner,
            role: 'owner',
            isConnected: ownerConnected || isCurrentUserOwner,
            connectedUser: connectedUsersList.find(connUser => 
              connUser.userId === ownerId || 
              connUser.user?._id === ownerId ||
              (connUser.user && connUser.user._id === ownerId)
            ) || (isCurrentUserOwner ? { 
              userId: user._id, 
              user: user, 
              joinedAt: new Date().toISOString() 
            } : null)
          });
        } else {
          // If owner is in the list, ensure they're marked as connected if they're the current user
          const ownerIndex = activeUsersList.findIndex(u => 
            (u.user._id || u.user) === (board.owner._id || board.owner)
          );
          
          if (ownerIndex !== -1) {
            const ownerId = board.owner._id || board.owner;
            const isCurrentUserOwner = user && (
              ownerId === user._id || 
              ownerId.toString() === user._id.toString()
            );
            
            if (isCurrentUserOwner && !activeUsersList[ownerIndex].isConnected) {
              activeUsersList[ownerIndex].isConnected = true;
              activeUsersList[ownerIndex].connectedUser = activeUsersList[ownerIndex].connectedUser || { 
                userId: user._id, 
                user: user, 
                joinedAt: new Date().toISOString() 
              };
            }
          }
        }

        setUsers(activeUsersList);
      }
    } catch (error) {
      console.error('Error fetching active users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    // Double-check that only owners can update roles
    if (!isOwner) {
      alert('Only board owners can manage user permissions');
      return;
    }

    // Prevent owners from changing their own role or other owners' roles
    if (userId === user._id) {
      alert('You cannot change your own role');
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/boards/${board._id}/collaborators/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        await fetchActiveUsers(); // Refresh the list
        
        // Notify other users of the permission change via socket
        if (realtimeCollab?.socketService) {
          realtimeCollab.socketService.emit('permission-updated', {
            userId,
            newRole,
            boardId: board._id
          });
        }
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to update user permissions');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user permissions');
    }
  };

  const removeUser = async (userId) => {
    // Double-check that only owners can remove users
    if (!isOwner) {
      alert('Only board owners can remove users');
      return;
    }

    // Prevent owners from removing themselves
    if (userId === user._id) {
      alert('You cannot remove yourself from the board');
      return;
    }

    if (!window.confirm('Are you sure you want to remove this user from the board?')) {
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/boards/${board._id}/collaborators/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        await fetchActiveUsers(); // Refresh the list
        
        // Notify the removed user via socket
        if (realtimeCollab?.socketService) {
          realtimeCollab.socketService.emit('user-removed', {
            userId,
            boardId: board._id
          });
        }
        
        alert('User removed successfully');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to remove user');
      }
    } catch (error) {
      console.error('Error removing user:', error);
      alert('Failed to remove user');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-red-500" />;
      case 'edit':
        return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'view':
        return <Eye className="w-4 h-4 text-gray-500" />;
      default:
        return <Users className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return 'text-yellow-600 bg-yellow-50';
      case 'admin': return 'text-red-600 bg-red-50';
      case 'edit': return 'text-blue-600 bg-blue-50';
      case 'view': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getUserInitials = (userObj) => {
    if (!userObj) return 'U';
    
    const userData = userObj.user || userObj;
    
    if (userData.initials) {
      return userData.initials.toUpperCase();
    }
    
    if (userData.name) {
      const names = userData.name.trim().split(' ');
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
      }
      return names[0].charAt(0).toUpperCase();
    }
    
    if (userData.email) {
      return userData.email.charAt(0).toUpperCase();
    }
    
    return 'U';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {isOwner ? 'Manage Active Users' : 'Active Users'}
            </h2>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
              {users.filter(u => u.isConnected).length} online
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No active users found</p>
                </div>
              ) : (
                users.map((userItem, index) => {
                  const userData = userItem.user || userItem;
                  const canManage = isOwner && userData._id !== user._id && userItem.role !== 'owner';
                  const isCurrentUser = userData._id === user._id;
                  
                  return (
                    <div
                      key={userData._id || index}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                        userItem.isConnected 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                            isCurrentUser ? 'bg-blue-700' : 'bg-blue-600'
                          }`}>
                            {getUserInitials(userData)}
                          </div>
                          {/* Online indicator */}
                          {userItem.isConnected && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>

                        {/* User Info */}
                        <div>
                          <p className="font-medium text-gray-900">
                            {userData.name || 'Unknown User'}
                            {isCurrentUser && <span className="ml-2 text-sm text-blue-600 font-medium">(You)</span>}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(userItem.role)}`}>
                              {getRoleIcon(userItem.role)}
                              <span className="ml-1 capitalize">{userItem.role}</span>
                            </span>
                            {userItem.isConnected ? (
                              <span className="text-xs text-green-600 font-medium">Online</span>
                            ) : (
                              <span className="text-xs text-gray-500">Offline</span>
                            )}
                            {userItem.connectedUser?.joinedAt && (
                              <span className="text-xs text-gray-400">
                                {new Date(userItem.connectedUser.joinedAt).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions (only for owners) */}
                      {canManage ? (
                        <div className="flex items-center gap-2">
                          {/* Role Selector */}
                          <select
                            value={userItem.role}
                            onChange={(e) => updateUserRole(userData._id, e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="view">Viewer</option>
                            <option value="edit">Editor</option>
                            <option value="admin">Admin</option>
                          </select>

                          {/* Remove User */}
                          <button
                            onClick={() => removeUser(userData._id)}
                            className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
                            title="Remove user"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        // Show read-only role for non-owners
                        !isCurrentUser && (
                          <div className="text-sm text-gray-500">
                            <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                              {userItem.role}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {isOwner ? (
                <span className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-yellow-500" />
                  You can manage user permissions and access
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-gray-400" />
                  View-only access - Contact the board owner to manage permissions
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveUsersModal;
