const mongoose = require('mongoose');
const { User, Board, BoardTemplate, Comment, Notification, Session } = require('../models');

const initializeDatabase = async () => {
  try {
    console.log('Initializing database...');

    // Ensure all indexes are created (with error handling for existing indexes)
    console.log('Creating indexes...');
    
    try {
      await User.createIndexes();
    } catch (error) {
      if (error.code !== 86) { // Ignore IndexKeySpecsConflict errors
        console.warn('User indexes warning:', error.message);
      }
    }
    
    try {
      await Board.createIndexes();
    } catch (error) {
      if (error.code !== 86) {
        console.warn('Board indexes warning:', error.message);
      }
    }
    
    try {
      await BoardTemplate.createIndexes();
    } catch (error) {
      if (error.code !== 86) {
        console.warn('BoardTemplate indexes warning:', error.message);
      }
    }
    
    try {
      await Comment.createIndexes();
    } catch (error) {
      if (error.code !== 86) {
        console.warn('Comment indexes warning:', error.message);
      }
    }
    
    try {
      await Notification.createIndexes();
    } catch (error) {
      if (error.code !== 86) {
        console.warn('Notification indexes warning:', error.message);
      }
    }
    
    try {
      await Session.createIndexes();
    } catch (error) {
      if (error.code !== 86) {
        console.warn('Session indexes warning:', error.message);
      }
    }
    
    console.log('✓ All indexes created/verified successfully');

    // Create default board templates if they don't exist
    const existingTemplates = await BoardTemplate.countDocuments({ isOfficial: true });
    
    if (existingTemplates === 0) {
      console.log('Creating default board templates...');
      
      const defaultTemplates = [
        {
          name: 'Blank Canvas',
          description: 'Start with a clean slate for unlimited creativity',
          category: 'other',
          template: {
            elements: [],
            settings: {
              theme: 'light',
              backgroundColor: '#ffffff',
              gridSize: 20,
              showGrid: false,
              canvasSize: { width: 5000, height: 5000 }
            }
          },
          isPublic: true,
          isOfficial: true,
          status: 'published',
          tags: ['blank', 'canvas', 'basic'],
        },
        {
          name: 'Brainstorming Session',
          description: 'Perfect for team brainstorming with sticky notes and mind mapping',
          category: 'brainstorming',
          template: {
            elements: [
              {
                id: 'title-1',
                type: 'text',
                x: 2400,
                y: 2300,
                width: 200,
                height: 50,
                text: 'Brainstorming Session',
                fontSize: 24,
                fontFamily: 'Arial',
                textAlign: 'center',
                textColor: '#111827',
                backgroundColor: 'transparent',
                zIndex: 1,
              },
              {
                id: 'sticky-1',
                type: 'sticky',
                x: 2200,
                y: 2400,
                width: 150,
                height: 150,
                text: 'Idea 1',
                backgroundColor: '#FEF08A',
                textColor: '#111827',
                borderColor: '#FDE047',
                zIndex: 1,
              },
              {
                id: 'sticky-2',
                type: 'sticky',
                x: 2400,
                y: 2400,
                width: 150,
                height: 150,
                text: 'Idea 2',
                backgroundColor: '#DBEAFE',
                textColor: '#111827',
                borderColor: '#93C5FD',
                zIndex: 1,
              },
              {
                id: 'sticky-3',
                type: 'sticky',
                x: 2600,
                y: 2400,
                width: 150,
                height: 150,
                text: 'Idea 3',
                backgroundColor: '#DCFCE7',
                textColor: '#111827',
                borderColor: '#86EFAC',
                zIndex: 1,
              },
            ],
            settings: {
              theme: 'light',
              backgroundColor: '#ffffff',
              gridSize: 20,
              showGrid: true,
              canvasSize: { width: 5000, height: 5000 }
            }
          },
          isPublic: true,
          isOfficial: true,
          status: 'published',
          tags: ['brainstorming', 'sticky', 'notes', 'ideas', 'team'],
        },
        {
          name: 'Project Planning',
          description: 'Organize tasks, timelines, and project milestones',
          category: 'planning',
          template: {
            elements: [
              {
                id: 'title-1',
                type: 'text',
                x: 2400,
                y: 2200,
                width: 200,
                height: 40,
                text: 'Project Planning',
                fontSize: 24,
                fontFamily: 'Arial',
                textAlign: 'center',
                textColor: '#111827',
                backgroundColor: 'transparent',
                zIndex: 1,
              },
              {
                id: 'phase1',
                type: 'shape',
                x: 2200,
                y: 2300,
                width: 180,
                height: 100,
                backgroundColor: '#3B82F6',
                borderColor: '#2563EB',
                zIndex: 1,
              },
              {
                id: 'phase1-text',
                type: 'text',
                x: 2230,
                y: 2330,
                width: 120,
                height: 40,
                text: 'Phase 1\nPlanning',
                fontSize: 14,
                fontFamily: 'Arial',
                textAlign: 'center',
                textColor: '#ffffff',
                backgroundColor: 'transparent',
                zIndex: 2,
              },
              {
                id: 'arrow1',
                type: 'arrow',
                x: 2380,
                y: 2350,
                x2: 2420,
                y2: 2350,
                strokeColor: '#111827',
                strokeWidth: 2,
                zIndex: 1,
              },
              {
                id: 'phase2',
                type: 'shape',
                x: 2420,
                y: 2300,
                width: 180,
                height: 100,
                backgroundColor: '#10B981',
                borderColor: '#059669',
                zIndex: 1,
              },
              {
                id: 'phase2-text',
                type: 'text',
                x: 2450,
                y: 2330,
                width: 120,
                height: 40,
                text: 'Phase 2\nExecution',
                fontSize: 14,
                fontFamily: 'Arial',
                textAlign: 'center',
                textColor: '#ffffff',
                backgroundColor: 'transparent',
                zIndex: 2,
              },
            ],
            settings: {
              theme: 'light',
              backgroundColor: '#ffffff',
              gridSize: 20,
              showGrid: true,
              canvasSize: { width: 5000, height: 5000 }
            }
          },
          isPublic: true,
          isOfficial: true,
          status: 'published',
          tags: ['planning', 'project', 'timeline', 'phases', 'workflow'],
        },
        {
          name: 'Design Wireframe',
          description: 'Create UI/UX wireframes and mockups',
          category: 'design',
          template: {
            elements: [
              {
                id: 'header',
                type: 'shape',
                x: 2300,
                y: 2200,
                width: 400,
                height: 80,
                backgroundColor: '#F3F4F6',
                borderColor: '#D1D5DB',
                zIndex: 1,
              },
              {
                id: 'header-text',
                type: 'text',
                x: 2480,
                y: 2230,
                width: 40,
                height: 20,
                text: 'Header',
                fontSize: 16,
                fontFamily: 'Arial',
                textAlign: 'center',
                textColor: '#111827',
                backgroundColor: 'transparent',
                zIndex: 2,
              },
              {
                id: 'content',
                type: 'shape',
                x: 2300,
                y: 2300,
                width: 400,
                height: 300,
                backgroundColor: '#ffffff',
                borderColor: '#D1D5DB',
                zIndex: 1,
              },
              {
                id: 'content-text',
                type: 'text',
                x: 2470,
                y: 2430,
                width: 60,
                height: 20,
                text: 'Content Area',
                fontSize: 14,
                fontFamily: 'Arial',
                textAlign: 'center',
                textColor: '#6B7280',
                backgroundColor: 'transparent',
                zIndex: 2,
              },
            ],
            settings: {
              theme: 'light',
              backgroundColor: '#F9FAFB',
              gridSize: 20,
              showGrid: true,
              canvasSize: { width: 5000, height: 5000 }
            }
          },
          isPublic: true,
          isOfficial: true,
          status: 'published',
          tags: ['design', 'wireframe', 'ui', 'ux', 'mockup', 'layout'],
        },
      ];

      // Create templates with a system user (will be created if doesn't exist)
      let systemUser = await User.findOne({ email: 'system@dashboard.com' });
      if (!systemUser) {
        systemUser = await User.create({
          name: 'System',
          email: 'system@dashboard.com',
          provider: 'local',
          password: 'system-password-not-used', // Placeholder password
          isVerified: true,
        });
      }

      for (const templateData of defaultTemplates) {
        templateData.creator = systemUser._id;
        await BoardTemplate.create(templateData);
      }

      console.log('✓ Default board templates created successfully');
    } else {
      console.log('✓ Default templates already exist');
    }

    console.log('✓ Database initialization completed successfully');
    return true;

  } catch (error) {
    console.error('✗ Database initialization failed:', error);
    throw error;
  }
};

// Cleanup function for old data
const cleanupOldData = async () => {
  try {
    console.log('Cleaning up old data...');

    // Clean up old notifications (older than 30 days)
    await Notification.cleanupOld(30);

    // Clean up inactive sessions (older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const inactiveSessions = await Session.find({
      isActive: true,
      lastActivity: { $lt: sevenDaysAgo }
    });
    
    for (const session of inactiveSessions) {
      await session.endSession();
    }

    // Clean up expired comments (if any have expiration)
    await Comment.deleteMany({
      expiresAt: { $lt: new Date() }
    });

    console.log('✓ Old data cleanup completed');
    return true;

  } catch (error) {
    console.error('✗ Data cleanup failed:', error);
    throw error;
  }
};

module.exports = {
  initializeDatabase,
  cleanupOldData,
};
