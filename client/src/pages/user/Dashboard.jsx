import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FaTicketAlt, FaUser, FaCompass } from 'react-icons/fa';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Welcome back, {user?.name}!</h1>
        <p className="mt-2 text-sm text-gray-600">
          This is your personal dashboard. Manage your bookings, profile, and discover new events.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* My Bookings Card */}
        <Link to="/my-bookings" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow group">
          <div className="p-6 flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FaTicketAlt className="h-8 w-8" />
            </div>
            <div className="ml-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900">My Bookings</h3>
              <p className="mt-1 text-sm text-gray-500">View and manage your event tickets</p>
            </div>
          </div>
        </Link>

        {/* Profile Card */}
        <Link to="/profile" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow group">
          <div className="p-6 flex items-center">
            <div className="p-3 rounded-full bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <FaUser className="h-8 w-8" />
            </div>
            <div className="ml-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Profile Settings</h3>
              <p className="mt-1 text-sm text-gray-500">Update your personal information</p>
            </div>
          </div>
        </Link>

        {/* Browse Events Card */}
        <Link to="/events" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow group">
          <div className="p-6 flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
              <FaCompass className="h-8 w-8" />
            </div>
            <div className="ml-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Discover</h3>
              <p className="mt-1 text-sm text-gray-500">Find new upcoming events to attend</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
