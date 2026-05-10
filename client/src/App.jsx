import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import Home from './pages/public/Home';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import Events from './pages/public/Events';
import EventDetails from './pages/public/EventDetails';
import Booking from './pages/public/Booking';
import CreateEvent from './pages/organizer/CreateEvent';
import OrganizerDashboard from './pages/organizer/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import MyBookings from './pages/user/MyBookings';
import Profile from './pages/user/Profile';
import UserDashboard from './pages/user/Dashboard';

// Dashboard redirect component based on user role
const DashboardRedirect = () => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  switch (user.role) {
    case 'admin':
      return <Navigate to="/admin/dashboard" />;
    case 'organizer':
      return <Navigate to="/organizer/dashboard" />;
    default:
      return <Navigate to="/user/dashboard" />;
  }
};

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
            <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/user/dashboard" element={<MainLayout><UserDashboard /></MainLayout>} />
            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route path="/my-bookings" element={<MainLayout><MyBookings /></MainLayout>} />
            <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
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
