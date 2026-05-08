import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaSearch as Search, FaCalendarAlt as Calendar, FaMapMarkerAlt as MapPin, FaUsers as Users, FaStar as Star, FaClock as Clock, FaChevronRight as ChevronRight } from 'react-icons/fa';

const Home = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [featuredEvents] = useState([
    {
      id: 1,
      title: 'Tech Conference 2024',
      category: 'tech',
      date: '2024-06-15',
      time: '09:00 AM',
      location: 'San Francisco, CA',
      price: 299,
      image: 'https://images.unsplash.com/photo-1540575467063-78a14283ac1a?w=500&h=300&fit=crop',
      organizer: 'TechHub',
      attendees: 250,
      rating: 4.8,
      featured: true
    },
    {
      id: 2,
      title: 'Summer Music Festival',
      category: 'music',
      date: '2024-07-20',
      time: '04:00 PM',
      location: 'Los Angeles, CA',
      price: 89,
      image: 'https://images.unsplash.com/photo-1459749411177-4f07531e16a8?w=500&h=300&fit=crop',
      organizer: 'Music Events Co.',
      attendees: 500,
      rating: 4.9,
      featured: true
    },
    {
      id: 3,
      title: 'Business Summit 2024',
      category: 'business',
      date: '2024-08-10',
      time: '10:00 AM',
      location: 'New York, NY',
      price: 199,
      image: 'https://images.unsplash.com/photo-1515168833192-5cf5b4b6c6e4?w=500&h=300&fit=crop',
      organizer: 'Business Network',
      attendees: 150,
      rating: 4.7,
      featured: true
    }
  ]);
  const [categories] = useState([
    { id: 'tech', name: 'Technology', icon: '💻', color: 'bg-blue-500' },
    { id: 'music', name: 'Music', icon: '🎵', color: 'bg-purple-500' },
    { id: 'business', name: 'Business', icon: '💼', color: 'bg-gray-700' },
    { id: 'sports', name: 'Sports', icon: '⚽', color: 'bg-green-500' },
    { id: 'education', name: 'Education', icon: '📚', color: 'bg-yellow-500' },
    { id: 'gaming', name: 'Gaming', icon: '🎮', color: 'bg-red-500' }
  ]);

  const filteredEvents = featuredEvents.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Discover Amazing Events
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Find, book, and attend the best events in your area
            </p>
            
            {/* Search Bar */}
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-lg shadow-lg p-2 flex items-center">
                <div className="flex-1 flex items-center">
                  <Search className="w-5 h-5 text-gray-400 ml-3" />
                  <input
                    type="text"
                    placeholder="Search events, categories, or locations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 text-gray-700 focus:outline-none"
                  />
                </div>
                <button className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors">
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Browse Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`p-6 rounded-lg text-center transition-all transform hover:scale-105 ${
                  selectedCategory === category.id
                    ? 'bg-blue-100 border-2 border-blue-500'
                    : 'bg-gray-50 border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-12 h-12 ${category.color} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                  <span className="text-2xl">{category.icon}</span>
                </div>
                <p className="font-medium text-gray-900">{category.name}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold">Featured Events</h2>
            <Link 
              to="/events" 
              className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              View All Events
              <ChevronRight className="w-5 h-5 ml-1" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="relative">
                  <img 
                    src={event.image} 
                    alt={event.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full text-sm font-medium text-gray-700">
                    ${event.price}
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-blue-600 font-medium capitalize">
                      {event.category}
                    </span>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600 ml-1">{event.rating}</span>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-2 text-gray-900">{event.title}</h3>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span className="text-sm">{formatDate(event.date)}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      <span className="text-sm">{event.time}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span className="text-sm">{event.location}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      <span className="text-sm">{event.attendees} attending</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">by {event.organizer}</span>
                    <Link 
                      to={`/events/${event.id}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Join Thousands of Event Goers</h2>
            <p className="text-xl text-blue-100">Discover why people choose our platform for their events</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10,000+</div>
              <div className="text-blue-100">Events Listed</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50,000+</div>
              <div className="text-blue-100">Active Users</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">1M+</div>
              <div className="text-blue-100">Tickets Sold</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">4.8/5</div>
              <div className="text-blue-100">User Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Create Your Own Event?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of organizers who trust our platform to manage their events
          </p>
          <div className="space-x-4">
            <Link 
              to="/register" 
              className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Get Started Free
            </Link>
            <Link 
              to="/events" 
              className="border border-blue-600 text-blue-600 px-8 py-3 rounded-md hover:bg-blue-50 transition-colors font-medium"
            >
              Browse Events
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
