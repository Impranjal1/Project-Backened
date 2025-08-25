const mongoose = require('mongoose');

const boardTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  category: {
    type: String,
    enum: [
      'brainstorming',
      'planning',
      'design',
      'education',
      'presentation',
      'workflow',
      'meeting',
      'project_management',
      'wireframe',
      'diagram',
      'other'
    ],
    default: 'other',
  },
  thumbnail: {
    type: String, // URL to thumbnail image
  },
  // Template configuration
  template: {
    elements: [{
      id: String,
      type: {
        type: String,
        enum: ['text', 'sticky', 'shape', 'line', 'arrow', 'pen', 'freehand'],
        required: true,
      },
      x: Number,
      y: Number,
      width: Number,
      height: Number,
      strokeColor: String,
      strokeWidth: Number,
      backgroundColor: String,
      borderColor: String,
      textColor: String,
      text: String,
      fontSize: Number,
      fontFamily: String,
      textAlign: String,
      x2: Number,
      y2: Number,
      points: [{
        x: Number,
        y: Number,
      }],
      zIndex: Number,
    }],
    settings: {
      theme: {
        type: String,
        enum: ['light', 'dark'],
        default: 'light',
      },
      backgroundColor: {
        type: String,
        default: '#ffffff',
      },
      gridSize: {
        type: Number,
        default: 20,
      },
      showGrid: {
        type: Boolean,
        default: false,
      },
      canvasSize: {
        width: {
          type: Number,
          default: 5000,
        },
        height: {
          type: Number,
          default: 5000,
        },
      },
    },
  },
  // Template metadata
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  isOfficial: {
    type: Boolean,
    default: false, // Set by admin for official templates
  },
  // Usage statistics
  stats: {
    timesUsed: {
      type: Number,
      default: 0,
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    favorites: {
      type: Number,
      default: 0,
    },
  },
  // Tags for searchability
  tags: [{
    type: String,
    lowercase: true,
    trim: true,
  }],
  // Ratings and reviews
  ratings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    review: {
      type: String,
      maxlength: 500,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  // Users who favorited this template
  favoritedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // Version control
  version: {
    type: String,
    default: '1.0.0',
  },
  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
  },
}, {
  timestamps: true,
});

// Index for better query performance
boardTemplateSchema.index({ category: 1, isPublic: 1 });
boardTemplateSchema.index({ creator: 1 });
boardTemplateSchema.index({ tags: 1 });
boardTemplateSchema.index({ 'stats.timesUsed': -1 });
boardTemplateSchema.index({ 'stats.rating.average': -1 });
boardTemplateSchema.index({ createdAt: -1 });
boardTemplateSchema.index({ status: 1 });

// Text index for search
boardTemplateSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text'
});

// Method to increment usage count
boardTemplateSchema.methods.incrementUsage = function() {
  this.stats.timesUsed += 1;
  return this.save();
};

// Method to add rating
boardTemplateSchema.methods.addRating = function(userId, rating, review = '') {
  // Remove existing rating from this user
  this.ratings = this.ratings.filter(
    r => r.user.toString() !== userId.toString()
  );
  
  // Add new rating
  this.ratings.push({
    user: userId,
    rating,
    review,
  });
  
  // Recalculate average rating
  this.calculateAverageRating();
  
  return this.save();
};

// Method to calculate average rating
boardTemplateSchema.methods.calculateAverageRating = function() {
  if (this.ratings.length === 0) {
    this.stats.rating.average = 0;
    this.stats.rating.count = 0;
  } else {
    const sum = this.ratings.reduce((acc, rating) => acc + rating.rating, 0);
    this.stats.rating.average = Math.round((sum / this.ratings.length) * 10) / 10;
    this.stats.rating.count = this.ratings.length;
  }
};

// Method to add to favorites
boardTemplateSchema.methods.addToFavorites = function(userId) {
  if (!this.favoritedBy.includes(userId)) {
    this.favoritedBy.push(userId);
    this.stats.favorites = this.favoritedBy.length;
  }
  return this.save();
};

// Method to remove from favorites
boardTemplateSchema.methods.removeFromFavorites = function(userId) {
  this.favoritedBy = this.favoritedBy.filter(
    id => id.toString() !== userId.toString()
  );
  this.stats.favorites = this.favoritedBy.length;
  return this.save();
};

// Method to check if user has favorited
boardTemplateSchema.methods.isFavoritedBy = function(userId) {
  return this.favoritedBy.includes(userId);
};

// Static method to find public templates
boardTemplateSchema.statics.findPublic = function(category = null, limit = 20) {
  const query = { 
    isPublic: true, 
    status: 'published' 
  };
  
  if (category) {
    query.category = category;
  }
  
  return this.find(query)
    .populate('creator', 'name email avatar')
    .sort({ 'stats.timesUsed': -1, createdAt: -1 })
    .limit(limit);
};

// Static method to find popular templates
boardTemplateSchema.statics.findPopular = function(limit = 10) {
  return this.find({ 
    isPublic: true, 
    status: 'published',
    'stats.timesUsed': { $gte: 5 }
  })
  .populate('creator', 'name email avatar')
  .sort({ 'stats.timesUsed': -1, 'stats.rating.average': -1 })
  .limit(limit);
};

// Static method to find templates by user
boardTemplateSchema.statics.findByUser = function(userId) {
  return this.find({ creator: userId })
    .sort({ createdAt: -1 });
};

// Static method to search templates
boardTemplateSchema.statics.searchTemplates = function(searchTerm, category = null, limit = 20) {
  const query = {
    $text: { $search: searchTerm },
    isPublic: true,
    status: 'published'
  };
  
  if (category) {
    query.category = category;
  }
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .populate('creator', 'name email avatar')
    .sort({ score: { $meta: 'textScore' }, 'stats.timesUsed': -1 })
    .limit(limit);
};

// Static method to get featured templates
boardTemplateSchema.statics.findFeatured = function(limit = 5) {
  return this.find({ 
    isOfficial: true,
    isPublic: true,
    status: 'published'
  })
  .populate('creator', 'name email avatar')
  .sort({ 'stats.rating.average': -1, 'stats.timesUsed': -1 })
  .limit(limit);
};

module.exports = mongoose.model('BoardTemplate', boardTemplateSchema);
