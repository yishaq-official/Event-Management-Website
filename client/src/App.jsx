
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import Home from './pages/public/Home';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import Events from './pages/public/Events';
import EventDetails from './pages/public/EventDetails';
import Booking from './pages/public/Booking';
import CreateEvent from './pages/organizer/CreateEvent';
import MyBookings from './pages/user/MyBookings';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            <Route path="/" element={<MainLayout><Home /></MainLayout>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/events" element={<MainLayout><Events /></MainLayout>} />
            <Route path="/events/:id" element={<MainLayout><EventDetails /></MainLayout>} />
            <Route path="/events/:id/book" element={<Booking />} />
            <Route path="/organizer/create-event" element={<CreateEvent />} />
            <Route path="/my-bookings" element={<MainLayout><MyBookings /></MainLayout>} />
          </Routes>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
