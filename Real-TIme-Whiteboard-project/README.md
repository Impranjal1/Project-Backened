# MERN Dashboard - Real-time Collaborative Canvas

A modern collaborative whiteboard application built with the MERN stack, featuring real-time editing, advanced sharing controls, and comprehensive drawing tools.

![MERN Stack](https://img.shields.io/badge/Stack-MERN-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18+-blue)

## ✨ Features

### 🎨 Real-time Collaboration
- **Live Synchronization**: Multiple users can edit simultaneously with instant updates
- **User Presence**: See who's online with real-time cursor tracking
- **Conflict Resolution**: Smart handling of concurrent edits

### 🔗 Advanced Sharing System
- **Granular Permissions**: Configure view, edit, or admin access
- **Smart Expiration**: Set link expiration (1h, 1d, 7d, 30d, or never)
- **Link Management**: Create, manage, and revoke share links easily

### 🎯 Drawing Tools
- **Text & Shapes**: Add text, rectangles, circles, and arrows
- **Freehand Drawing**: Natural drawing with customizable brush tools
- **Zoom & Pan**: Navigate large canvases with smooth interactions
- **Undo/Redo**: Full history management for all actions

### 🔐 Security & Authentication
- **JWT Authentication**: Secure user sessions and API access
- **Role-based Access**: Owner-controlled board permissions
- **Secure Sharing**: Cryptographically secure share tokens

### 🎨 Modern Interface
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Dark Theme**: Easy-on-the-eyes interface with intuitive controls
- **Export Options**: Save boards as PNG or PDF files

## 🛠️ Tech Stack

**Frontend:**
- React.js with Hooks & Context API
- Tailwind CSS for styling
- Socket.IO Client for real-time features
- Lucide React for icons

**Backend:**
- Node.js & Express.js
- MongoDB with Mongoose ODM
- Socket.IO for WebSocket communication
- JWT for authentication

**DevOps:**
- Environment-based configuration
- Production-ready deployment setup

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas)
- Git

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/yourusername/mern-dashboard.git
   cd mern-dashboard
   
   # Install server dependencies
   cd server && npm install
   
   # Install client dependencies
   cd ../client && npm install
   ```

2. **Environment Configuration**
   
   Copy and configure environment files:
   ```bash
   # Server environment
   cp server/.env.example server/.env
   # Edit server/.env with your database URL and secrets
   
   # Client environment  
   cp client/.env.example client/.env
   # Edit client/.env if needed (defaults work for local development)
   ```

3. **Start the application**
   ```bash
   # From the root directory
   npm run dev
   
   # Or start separately:
   # Terminal 1: cd server && npm start
   # Terminal 2: cd client && npm start
   ```

4. **Open your browser**
   - Application: http://localhost:3000
   - API: http://localhost:5000

## 📁 Project Structure

```
mern-dashboard/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── services/      # API services
│   └── package.json
├── server/                # Node.js backend
│   ├── routes/           # API endpoints
│   ├── models/           # Database models
│   ├── socket/           # Real-time handlers
│   └── package.json
└── README.md
```

## � API Overview

### Core Endpoints
- **Authentication**: Register, login, user management
- **Boards**: CRUD operations for boards and elements
- **Sharing**: Create and manage share links
- **Real-time**: Socket.IO events for live collaboration

### Socket Events
- Canvas updates and element synchronization
- User presence and cursor tracking
- Real-time notifications

## 🌐 Deployment

The application is ready for deployment on platforms like:
- **Frontend**: Netlify, Vercel, or any static hosting
- **Backend**: Heroku, Railway, DigitalOcean, or AWS
- **Database**: MongoDB Atlas (recommended for production)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

Built with modern web technologies and inspired by collaborative tools like Figma and Miro.

---

**⭐ Star this repo if you find it useful!**
