import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, X, User, LogOut, Calendar, PlusCircle, Ticket } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/events?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <Calendar className="w-8 h-8 text-blue-600 mr-2" />
            <span className="text-xl font-bold text-gray-900">EventHub</span>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </form>
          </div>

          {/* Navigation Links - Desktop */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/events" className="text-gray-700 hover:text-blue-600 transition-colors">
              Browse Events
            </Link>
            
            {user ? (
              <>
                <Link 
                  to="/my-bookings" 
                  className="flex items-center text-gray-700 hover:text-blue-600 transition-colors"
                >
                  <Ticket className="w-4 h-4 mr-1" />
                  My Bookings
                </Link>
                
                {user.role === 'organizer' && (
                  <Link 
                    to="/organizer/create-event" 
                    className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4 mr-1" />
                    Create Event
                  </Link>
                )}
                
                <div className="relative group">
                  <button className="flex items-center text-gray-700 hover:text-blue-600 transition-colors">
                    <User className="w-5 h-5 mr-1" />
                    {user.name}
                  </button>
                  
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <Link 
                      to="/my-bookings" 
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      My Bookings
                    </Link>
                    <Link 
                      to={`/${user.role}/dashboard`} 
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Dashboard
                    </Link>
                    <Link 
                      to="/profile" 
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Profile
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors flex items-center"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </form>

            {/* Mobile Links */}
            <div className="space-y-3">
              <Link 
                to="/events" 
                className="block text-gray-700 hover:text-blue-600 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Browse Events
              </Link>
              
              {user ? (
                <>
                  <Link 
                    to="/my-bookings" 
                    className="block text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    My Bookings
                  </Link>
                  
                  {user.role === 'organizer' && (
                    <Link 
                      to="/organizer/create-event" 
                      className="block text-blue-600 hover:text-blue-700 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Create Event
                    </Link>
                  )}
                  
                  <Link 
                    to={`/${user.role}/dashboard`} 
                    className="block text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  
                  <Link 
                    to="/profile" 
                    className="block text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="block text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link 
                    to="/register" 
                    className="block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
