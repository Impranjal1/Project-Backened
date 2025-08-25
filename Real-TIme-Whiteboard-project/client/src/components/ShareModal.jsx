import React, { useState, useEffect } from 'react';
import { X, Copy, Eye, Edit, Shield, Clock, Users, Trash2, Plus } from 'lucide-react';

const ShareModal = ({ board, user, onClose, isOpen }) => {
  const [shareLinks, setShareLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newlyCreatedLink, setNewlyCreatedLink] = useState(null);
  const [newLink, setNewLink] = useState({
    permissions: 'view',
    expiresIn: '7d',
    description: ''
  });

  // Check if current user is the board owner
  const isOwner = user && board && board.owner && 
    (board.owner._id || board.owner) === user._id;

  useEffect(() => {
    if (isOpen && board) {
      fetchShareLinks();
    } else if (!isOpen) {
      // Clear newly created link when modal is closed
      setNewlyCreatedLink(null);
    }
  }, [isOpen, board]);

  const fetchShareLinks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/boards/${board._id}/share-links`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setShareLinks(data.shareLinks);
      }
    } catch (error) {
      console.error('Error fetching share links:', error);
    } finally {
      setLoading(false);
    }
  };

  const createShareLink = async () => {
    setCreating(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/boards/${board._id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newLink)
      });

      if (response.ok) {
        const data = await response.json();
        await fetchShareLinks(); // Refresh the list
        setNewLink({ permissions: 'view', expiresIn: '7d', description: '' });
        
        // Store the newly created link to display
        setNewlyCreatedLink(data);
        
        // Copy to clipboard
        navigator.clipboard.writeText(data.shareUrl).then(() => {
          // Don't show alert since we'll show the link in the modal
        }).catch(() => {
          // Fallback for clipboard failure
          console.log('Clipboard copy failed, but link is displayed in modal');
        });
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create share link');
      }
    } catch (error) {
      console.error('Error creating share link:', error);
      alert('Failed to create share link');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (url, event) => {
    navigator.clipboard.writeText(url).then(() => {
      // Show a brief success message
      const button = event.target.closest('button');
      const originalContent = button.innerHTML;
      button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"></polyline></svg>';
      button.style.color = '#10b981';
      
      setTimeout(() => {
        button.innerHTML = originalContent;
        button.style.color = '';
      }, 1000);
    }).catch(() => {
      // Fallback: show the URL in a prompt for manual copying
      prompt('Copy this link manually:', url);
    });
  };

  const revokeShareLink = async (linkId) => {
    if (!window.confirm('Are you sure you want to revoke this share link? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/boards/${board._id}/share-links/${linkId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });      if (response.ok) {
        await fetchShareLinks(); // Refresh the list
        alert('Share link revoked successfully');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to revoke share link');
      }
    } catch (error) {
      console.error('Error revoking share link:', error);
      alert('Failed to revoke share link');
    }
  };

  const toggleLinkStatus = async (linkId, currentStatus) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/boards/${board._id}/share-links/${linkId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (response.ok) {
        await fetchShareLinks(); // Refresh the list
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to update share link');
      }
    } catch (error) {
      console.error('Error updating share link:', error);
      alert('Failed to update share link');
    }
  };

  const getPermissionIcon = (permission) => {
    switch (permission) {
      case 'view': return <Eye size={16} className="text-blue-500" />;
      case 'edit': return <Edit size={16} className="text-green-500" />;
      case 'admin': return <Shield size={16} className="text-red-500" />;
      default: return <Eye size={16} className="text-gray-500" />;
    }
  };

  const getExpiryText = (expiresAt) => {
    if (!expiresAt) return 'Never expires';
    const date = new Date(expiresAt);
    const now = new Date();
    if (date < now) return 'Expired';
    
    const days = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    if (days === 1) return 'Expires in 1 day';
    if (days <= 7) return `Expires in ${days} days`;
    
    return `Expires ${date.toLocaleDateString()}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Share Board</h2>
            <p className="text-sm text-gray-600 mt-1">{board?.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Create New Share Link */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Plus size={20} />
              Create New Share Link
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions
                </label>
                <select
                  value={newLink.permissions}
                  onChange={(e) => setNewLink({ ...newLink, permissions: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="view">View Only</option>
                  <option value="edit">Can Edit</option>
                  {isOwner && <option value="admin">Admin Access</option>}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expires In
                </label>
                <select
                  value={newLink.expiresIn}
                  onChange={(e) => setNewLink({ ...newLink, expiresIn: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="1h">1 Hour</option>
                  <option value="1d">1 Day</option>
                  <option value="7d">7 Days</option>
                  <option value="30d">30 Days</option>
                  <option value="never">Never</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={newLink.description}
                  onChange={(e) => setNewLink({ ...newLink, description: e.target.value })}
                  placeholder="e.g., For external reviewers"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              onClick={createShareLink}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={16} />
              {creating ? 'Creating...' : 'Create Share Link'}
            </button>

            {/* Display Newly Created Link */}
            {newlyCreatedLink && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-800">Share Link Created Successfully!</span>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 mb-1">Share URL:</p>
                      <p className="text-sm font-mono text-gray-900 break-all select-all">
                        {newlyCreatedLink.shareUrl}
                      </p>
                    </div>
                    <button
                      onClick={(e) => copyToClipboard(newlyCreatedLink.shareUrl, e)}
                      className="flex-shrink-0 p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                      title="Copy to clipboard"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      {getPermissionIcon(newlyCreatedLink.permissions)}
                      {newlyCreatedLink.permissions.charAt(0).toUpperCase() + newlyCreatedLink.permissions.slice(1)} Access
                    </span>
                    {newlyCreatedLink.expiresAt && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        Expires {new Date(newlyCreatedLink.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => setNewlyCreatedLink(null)}
                  className="mt-2 text-xs text-green-600 hover:text-green-800 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

          {/* Existing Share Links */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Users size={20} />
              Existing Share Links ({shareLinks.length})
            </h3>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Loading share links...</p>
              </div>
            ) : shareLinks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users size={48} className="mx-auto mb-2 opacity-50" />
                <p>No share links created yet</p>
                <p className="text-sm">Create your first share link above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shareLinks.map((link) => {
                  const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
                  
                  return (
                    <div
                      key={link._id}
                      className={`border rounded-lg p-4 ${
                        !link.isActive || isExpired 
                          ? 'bg-gray-50 border-gray-200' 
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getPermissionIcon(link.permissions)}
                            <span className="font-medium text-gray-900 capitalize">
                              {link.permissions} Access
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              link.isActive && !isExpired
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {!link.isActive ? 'Disabled' : isExpired ? 'Expired' : 'Active'}
                            </span>
                          </div>

                          {link.description && (
                            <p className="text-sm text-gray-600 mb-2">{link.description}</p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {getExpiryText(link.expiresAt)}
                            </span>
                            <span>{link.accessCount} uses</span>
                            {link.lastAccessed && (
                              <span>Last used {new Date(link.lastAccessed).toLocaleDateString()}</span>
                            )}
                          </div>

                          <div className="mt-2 p-2 bg-gray-50 rounded border text-sm font-mono text-gray-700 break-all">
                            {link.shareUrl}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={(e) => copyToClipboard(link.shareUrl, e)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Copy link"
                          >
                            <Copy size={16} />
                          </button>

                          <button
                            onClick={() => toggleLinkStatus(link._id, link.isActive)}
                            className={`px-3 py-1 text-xs rounded transition-colors ${
                              link.isActive
                                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {link.isActive ? 'Disable' : 'Enable'}
                          </button>

                          <button
                            onClick={() => revokeShareLink(link._id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Revoke link"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
