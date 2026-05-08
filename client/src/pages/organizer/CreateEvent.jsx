import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaCalendarAlt as Calendar,
  FaMapMarkerAlt as MapPin,
  FaUsers as Users,
  FaClock as Clock,
  FaGlobe as Globe,
  FaEye as Eye,
  FaUpload as Upload,
  FaPlus as Plus,
  FaTimes as X,
  FaSave as Save
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const CreateEvent = () => {
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    eventType: 'offline',
    date: {
      startDate: '',
      endDate: ''
    },
    time: {
      startTime: '',
      endTime: ''
    },
    timezone: 'UTC',
    capacity: '',
    banner: '',
    location: {
      venue: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
        zipCode: ''
      }
    },
    onlineEventDetails: {
      platform: '',
      meetingUrl: '',
      meetingId: '',
      password: ''
    },
    tickets: [
      {
        type: 'standard',
        name: 'General Admission',
        price: 0,
        quantity: 100,
        available: 100,
        description: ''
      }
    ],
    tags: [],
    requirements: [],
    whatToBring: [],
    agenda: [],
    speakers: [],
    refundPolicy: 'no-refund',
    refundDeadline: 24
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [previewMode, setPreviewMode] = useState(false);

  const categories = [
    { id: 'tech', name: 'Technology' },
    { id: 'music', name: 'Music' },
    { id: 'business', name: 'Business' },
    { id: 'sports', name: 'Sports' },
    { id: 'education', name: 'Education' },
    { id: 'gaming', name: 'Gaming' },
    { id: 'art', name: 'Art' },
    { id: 'food', name: 'Food' },
    { id: 'health', name: 'Health' },
    { id: 'other', name: 'Other' }
  ];

  const ticketTypes = [
    { value: 'free', label: 'Free' },
    { value: 'standard', label: 'Standard' },
    { value: 'vip', label: 'VIP' },
    { value: 'early-bird', label: 'Early Bird' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const keys = name.split('.');
      setFormData(prev => {
        const updated = { ...prev };
        let current = updated;
        for (let i = 0; i < keys.length - 1; i++) {
          current[keys[i]] = { ...current[keys[i]] };
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        return updated;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleTicketChange = (index, field, value) => {
    setFormData(prev => {
      const updated = { ...prev };
      updated.tickets[index] = {
        ...updated.tickets[index],
        [field]: value
      };
      return updated;
    });
  };

  const addTicket = () => {
    setFormData(prev => ({
      ...prev,
      tickets: [
        ...prev.tickets,
        {
          type: 'standard',
          name: '',
          price: 0,
          quantity: 100,
          available: 100,
          description: ''
        }
      ]
    }));
  };

  const removeTicket = (index) => {
    if (formData.tickets.length > 1) {
      setFormData(prev => ({
        ...prev,
        tickets: prev.tickets.filter((_, i) => i !== index)
      }));
    }
  };

  const handleArrayInput = (field, value) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item);
    setFormData(prev => ({
      ...prev,
      [field]: items
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.date.startDate) {
      newErrors['date.startDate'] = 'Start date is required';
    }

    if (!formData.date.endDate) {
      newErrors['date.endDate'] = 'End date is required';
    }

    if (!formData.time.startTime) {
      newErrors['time.startTime'] = 'Start time is required';
    }

    if (!formData.time.endTime) {
      newErrors['time.endTime'] = 'End time is required';
    }

    if (!formData.capacity || formData.capacity < 1) {
      newErrors.capacity = 'Capacity must be at least 1';
    }

    if (!formData.banner) {
      newErrors.banner = 'Banner image URL is required';
    }

    if (formData.eventType === 'offline' && !formData.location.venue) {
      newErrors['location.venue'] = 'Venue is required for offline events';
    }

    if (formData.eventType === 'offline' && !formData.location.address.city) {
      newErrors['location.address.city'] = 'City is required for offline events';
    }

    // Validate tickets
    formData.tickets.forEach((ticket, index) => {
      if (!ticket.name.trim()) {
        newErrors[`tickets.${index}.name`] = 'Ticket name is required';
      }
      if (ticket.quantity < 1) {
        newErrors[`tickets.${index}.quantity`] = 'Quantity must be at least 1';
      }
      if (ticket.available < 0) {
        newErrors[`tickets.${index}.available`] = 'Available tickets cannot be negative';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Event created successfully!');
        navigate(`/organizer/events/${data.event._id}`);
      } else {
        toast.error(data.message || 'Failed to create event');
      }
    } catch (error) {
      console.error('Create event error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getError = (field) => {
    return errors[field] || '';
  };

  if (previewMode) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Event Preview</h1>
            <button
              onClick={() => setPreviewMode(false)}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Edit
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <img
              src={formData.banner || '/placeholder-banner.jpg'}
              alt="Event Banner"
              className="w-full h-64 object-cover"
            />
            
            <div className="p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{formData.title}</h2>
              
              <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-6">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  {formData.date.startDate}
                </div>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  {formData.time.startTime} - {formData.time.endTime}
                </div>
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  {formData.eventType === 'online' ? 'Online Event' : formData.location.venue}
                </div>
                <div className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Capacity: {formData.capacity}
                </div>
              </div>
              
              <div className="prose max-w-none mb-8">
                <p className="text-gray-600 whitespace-pre-wrap">{formData.description}</p>
              </div>
              
              <div className="border-t pt-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Tickets</h3>
                <div className="space-y-3">
                  {formData.tickets.map((ticket, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">{ticket.name}</h4>
                        {ticket.description && (
                          <p className="text-sm text-gray-600">{ticket.description}</p>
                        )}
                        <p className="text-sm text-gray-500">{ticket.available} available</p>
                      </div>
                      <div className="text-xl font-bold text-blue-600">
                        ${ticket.price}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Event</h1>
            <p className="text-gray-600 mt-2">Fill in the details to create your event</p>
          </div>
          <button
            onClick={() => setPreviewMode(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Basic Information</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    getError('title') ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter event title"
                />
                {getError('title') && (
                  <p className="text-red-600 text-sm mt-1">{getError('title')}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    getError('category') ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {getError('category') && (
                  <p className="text-red-600 text-sm mt-1">{getError('category')}</p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={6}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  getError('description') ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe your event in detail..."
              />
              {getError('description') && (
                <p className="text-red-600 text-sm mt-1">{getError('description')}</p>
              )}
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banner Image URL *
              </label>
              <div className="flex gap-4">
                <input
                  type="url"
                  name="banner"
                  value={formData.banner}
                  onChange={handleChange}
                  className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    getError('banner') ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="https://example.com/banner-image.jpg"
                />
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </button>
              </div>
              {getError('banner') && (
                <p className="text-red-600 text-sm mt-1">{getError('banner')}</p>
              )}
            </div>
          </div>

          {/* Event Type & Location */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Event Type & Location</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Type *
              </label>
              <div className="grid grid-cols-3 gap-4">
                {['offline', 'online', 'hybrid'].map(type => (
                  <label key={type} className="relative">
                    <input
                      type="radio"
                      name="eventType"
                      value={type}
                      checked={formData.eventType === type}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="border-2 rounded-lg p-4 cursor-pointer text-center peer-checked:border-blue-500 peer-checked:bg-blue-50 hover:bg-gray-50">
                      {type === 'offline' && <MapPin className="w-6 h-6 mx-auto mb-2" />}
                      {type === 'online' && <Globe className="w-6 h-6 mx-auto mb-2" />}
                      {type === 'hybrid' && <Users className="w-6 h-6 mx-auto mb-2" />}
                      <div className="font-medium capitalize">{type}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Offline Event Location */}
            {formData.eventType === 'offline' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Venue *
                  </label>
                  <input
                    type="text"
                    name="location.venue"
                    value={formData.location.venue}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      getError('location.venue') ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Event venue name"
                  />
                  {getError('location.venue') && (
                    <p className="text-red-600 text-sm mt-1">{getError('location.venue')}</p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      name="location.address.street"
                      value={formData.location.address.street}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="123 Main St"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      name="location.address.city"
                      value={formData.location.address.city}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        getError('location.address.city') ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="New York"
                    />
                    {getError('location.address.city') && (
                      <p className="text-red-600 text-sm mt-1">{getError('location.address.city')}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State/Province
                    </label>
                    <input
                      type="text"
                      name="location.address.state"
                      value={formData.location.address.state}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="NY"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      name="location.address.zipCode"
                      value={formData.location.address.zipCode}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="10001"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country *
                  </label>
                  <input
                    type="text"
                    name="location.address.country"
                    value={formData.location.address.country}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="United States"
                  />
                </div>
              </div>
            )}

            {/* Online Event Details */}
            {formData.eventType === 'online' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platform
                  </label>
                  <select
                    name="onlineEventDetails.platform"
                    value={formData.onlineEventDetails.platform}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select platform</option>
                    <option value="zoom">Zoom</option>
                    <option value="teams">Microsoft Teams</option>
                    <option value="meet">Google Meet</option>
                    <option value="webex">Cisco Webex</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting URL
                  </label>
                  <input
                    type="url"
                    name="onlineEventDetails.meetingUrl"
                    value={formData.onlineEventDetails.meetingUrl}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://zoom.us/j/123456789"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Date & Time</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="date.startDate"
                  value={formData.date.startDate}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    getError('date.startDate') ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {getError('date.startDate') && (
                  <p className="text-red-600 text-sm mt-1">{getError('date.startDate')}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  name="date.endDate"
                  value={formData.date.endDate}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    getError('date.endDate') ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {getError('date.endDate') && (
                  <p className="text-red-600 text-sm mt-1">{getError('date.endDate')}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time *
                </label>
                <input
                  type="time"
                  name="time.startTime"
                  value={formData.time.startTime}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    getError('time.startTime') ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {getError('time.startTime') && (
                  <p className="text-red-600 text-sm mt-1">{getError('time.startTime')}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time *
                </label>
                <input
                  type="time"
                  name="time.endTime"
                  value={formData.time.endTime}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    getError('time.endTime') ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {getError('time.endTime') && (
                  <p className="text-red-600 text-sm mt-1">{getError('time.endTime')}</p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Capacity *
              </label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                min="1"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  getError('capacity') ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Maximum number of attendees"
              />
              {getError('capacity') && (
                <p className="text-red-600 text-sm mt-1">{getError('capacity')}</p>
              )}
            </div>
          </div>

          {/* Tickets */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Tickets</h2>
              <button
                type="button"
                onClick={addTicket}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Ticket
              </button>
            </div>

            <div className="space-y-4">
              {formData.tickets.map((ticket, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900">Ticket {index + 1}</h3>
                    {formData.tickets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTicket(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ticket Type
                      </label>
                      <select
                        value={ticket.type}
                        onChange={(e) => handleTicketChange(index, 'type', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {ticketTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ticket Name *
                      </label>
                      <input
                        type="text"
                        value={ticket.name}
                        onChange={(e) => handleTicketChange(index, 'name', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          getError(`tickets.${index}.name`) ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="e.g., General Admission"
                      />
                      {getError(`tickets.${index}.name`) && (
                        <p className="text-red-600 text-sm mt-1">{getError(`tickets.${index}.name`)}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price ($)
                      </label>
                      <input
                        type="number"
                        value={ticket.price}
                        onChange={(e) => handleTicketChange(index, 'price', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        value={ticket.quantity}
                        onChange={(e) => handleTicketChange(index, 'quantity', parseInt(e.target.value) || 0)}
                        min="1"
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          getError(`tickets.${index}.quantity`) ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="100"
                      />
                      {getError(`tickets.${index}.quantity`) && (
                        <p className="text-red-600 text-sm mt-1">{getError(`tickets.${index}.quantity`)}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <input
                        type="text"
                        value={ticket.description}
                        onChange={(e) => handleTicketChange(index, 'description', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Optional ticket description"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Additional Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags.join(', ')}
                  onChange={(e) => handleArrayInput('tags', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., tech, networking, workshop"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Requirements (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.requirements.join(', ')}
                  onChange={(e) => handleArrayInput('requirements', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Laptop, Internet connection"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What to Bring (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.whatToBring.join(', ')}
                  onChange={(e) => handleArrayInput('whatToBring', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Notebook, Pen, ID"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/organizer/events')}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;
