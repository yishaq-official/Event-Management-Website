import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FaUser, FaPhone, FaEnvelope, FaInfoCircle, FaSave } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    bio: user?.bio || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await updateProfile(formData);
      if (result.success) {
        toast.success('Profile updated successfully!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-8 sm:px-10">
          <h2 className="text-2xl font-bold text-white">Your Profile</h2>
          <p className="mt-1 text-blue-100">Update your personal information</p>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-8 sm:px-10">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaEnvelope className="text-gray-400" />
                </div>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="bg-gray-50 block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-gray-500 cursor-not-allowed sm:text-sm"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Email address cannot be changed.</p>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUser className="text-gray-400" />
                </div>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaPhone className="text-gray-400" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700">Bio</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                  <FaInfoCircle className="text-gray-400" />
                </div>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="A short description about yourself"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-gray-200">
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                ) : (
                  <FaSave className="mr-2" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
