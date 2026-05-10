<div align="center">

# EventHub - Event Management Platform

![Project Screenshot](/image.png)

A comprehensive, production-ready full-stack event management platform built with the MERN stack. EventHub allows organizers to create and manage events, and attendees to discover and book tickets seamlessly.

</div>

---

## ✨ Features

### 👤 For Attendees
- **Discover Events:** Browse and search for upcoming events with advanced filtering.
- **Ticket Booking:** Securely book event tickets using Stripe payment integration.
- **User Dashboard:** Manage your profile, view booking history, and access digital tickets.
- **Real-Time Notifications:** Get instant updates via Socket.IO.

### 🏢 For Organizers
- **Event Creation:** Seamlessly create and publish new events with rich details.
- **Organizer Dashboard:** Monitor real-time analytics, ticket sales, and track revenue.
- **Manage Attendees:** Track check-ins and manage your event's audience.

### 🛡️ Security & Performance
- **Authentication:** Secure JWT-based authentication with Refresh tokens.
- **Role-Based Access Control (RBAC):** Distinct roles for Attendees, Organizers, and Admins.
- **Security Middleware:** Rate limiting, XSS protection, Data sanitization, and Helmet configuration.

---

## 🛠️ Tech Stack

**Frontend:**
- React 19 (via Vite)
- Tailwind CSS v4
- React Router DOM
- React Icons & Lucide React
- Socket.IO Client
- Stripe Elements (React Stripe JS)

**Backend:**
- Node.js & Express.js
- MongoDB & Mongoose
- JSON Web Tokens (JWT) & bcryptjs
- Stripe API
- Socket.IO Server
- Multer & Sharp (Image processing)

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/event-management-website.git
   cd event-management-website
   ```

2. **Install Backend Dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../client
   npm install
   ```

### Environment Configuration

Create a `.env` file in both the `server` and `client` directories using the provided example files.

**Server (`server/.env`)**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/event-management
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:5173
```

**Client (`client/.env`)**
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_APP_NAME=EventHub
```

### Running the Application

1. **Start the Backend Server** (from the `server` directory)
   ```bash
   npm run dev
   # or
   node index.js
   ```

2. **Start the Frontend Application** (from the `client` directory)
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173` (Frontend) and `http://localhost:5000` (Backend API).

---

## 📄 License

This project is licensed under the ISC License.
