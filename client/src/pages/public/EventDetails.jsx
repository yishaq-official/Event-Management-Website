import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Star, 
  Clock, 
  Share2, 
  Heart, 
  Ticket,
  ChevronLeft,
  ExternalLink,
  Phone,
  Mail,
  Globe
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const EventDetails = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/events/${id}`);
      const data = await response.json();

      if (data.success) {
        setEvent(data.event);
        // Select first ticket type by default
        if (data.event.tickets.length > 0) {
          setSelectedTicket(data.event.tickets[0]);
        }
      } else {
        toast.error(data.message || 'Event not found');
      }
    } catch (error) {
      console.error('Fetch event error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: event.description,
          url: window.location.href
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
    // TODO: Implement favorite functionality
    toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
  };

  const handleBookNow = () => {
    if (!selectedTicket) {
      toast.error('Please select a ticket type');
      return;
    }
    
    // TODO: Navigate to booking page
    toast.success('Redirecting to booking...');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h2>
          <p className="text-gray-600 mb-6">The event you're looking for doesn't exist.</p>
          <Link
            to="/events"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
        <img
          src={event.banner}
          alt={event.title}
          className="w-full h-96 object-cover"
        />
        <div className="absolute inset-0 z-20 flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <Link
              to="/events"
              className="inline-flex items-center text-white mb-4 hover:text-gray-200 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back to Events
            </Link>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-white mb-4">{event.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-white/90">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    {formatDate(event.date.startDate)}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    {formatTime(event.time.startTime)} - {formatTime(event.time.endTime)}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    {event.eventType === 'online' ? 'Online Event' : event.location.venue}
                  </div>
                  <div className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    {event.currentAttendees} attending
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShare}
                  className="p-3 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleFavorite}
                  className="p-3 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-colors"
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Event</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            </div>

            {/* Location Details */}
            {event.eventType !== 'online' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Location</h2>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{event.location.venue}</h3>
                      <p className="text-gray-600">
                        {event.location.address.street}<br />
                        {event.location.address.city}, {event.location.address.state}<br />
                        {event.location.address.country}
                      </p>
                    </div>
                  </div>
                  {/* TODO: Add map component */}
                  <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center">
                    <span className="text-gray-500">Map View</span>
                  </div>
                </div>
              </div>
            )}

            {/* Online Event Details */}
            {event.eventType === 'online' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">How to Join</h2>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Globe className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Online Event</h3>
                      <p className="text-gray-600">Join from anywhere in the world</p>
                    </div>
                  </div>
                  {event.onlineEventDetails?.platform && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-800">
                        This event will be hosted on <strong>{event.onlineEventDetails.platform}</strong>.
                        You'll receive the meeting link after booking.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Organizer Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Organizer</h2>
              <div className="flex items-center space-x-4">
                <img
                  src={event.organizer.profileImage || '/default-avatar.png'}
                  alt={event.organizer.name}
                  className="w-16 h-16 rounded-full"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{event.organizer.name}</h3>
                  {event.organizer.bio && (
                    <p className="text-gray-600 text-sm mt-1">{event.organizer.bio}</p>
                  )}
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Contact
                </button>
              </div>
            </div>

            {/* Agenda */}
            {event.agenda && event.agenda.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Agenda</h2>
                <div className="space-y-4">
                  {event.agenda.map((item, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-blue-600">{item.time}</span>
                          {item.speaker && (
                            <span className="text-sm text-gray-500">• {item.speaker}</span>
                          )}
                        </div>
                        <h4 className="font-semibold text-gray-900">{item.title}</h4>
                        {item.description && (
                          <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Speakers */}
            {event.speakers && event.speakers.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Speakers</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {event.speakers.map((speaker, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <img
                        src={speaker.photo || '/default-avatar.png'}
                        alt={speaker.name}
                        className="w-12 h-12 rounded-full"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-900">{speaker.name}</h4>
                        <p className="text-sm text-gray-600">
                          {speaker.role} at {speaker.company}
                        </p>
                        {speaker.bio && (
                          <p className="text-sm text-gray-500 mt-1">{speaker.bio}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Booking Card */}
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Book Your Spot</h3>
              
              {/* Ticket Selection */}
              <div className="space-y-3 mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Ticket Type
                </label>
                {event.tickets.map((ticket) => (
                  <div
                    key={ticket.type}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedTicket?.type === ticket.type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{ticket.name}</h4>
                        {ticket.description && (
                          <p className="text-sm text-gray-600 mt-1">{ticket.description}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-1">
                          {ticket.available} available
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-blue-600">
                          {formatPrice(ticket.price)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quantity Selection */}
              {selectedTicket && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-medium">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(selectedTicket.available, quantity + 1))}
                      className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Total */}
              {selectedTicket && (
                <div className="border-t pt-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {formatPrice(selectedTicket.price * quantity)}
                    </span>
                  </div>
                </div>
              )}

              {/* Book Button */}
              <button
                onClick={handleBookNow}
                disabled={!selectedTicket || selectedTicket.available === 0}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Ticket className="w-5 h-5" />
                Book Now
              </button>

              {selectedTicket && selectedTicket.available === 0 && (
                <p className="text-sm text-red-600 text-center mt-2">
                  This ticket type is sold out
                </p>
              )}
            </div>

            {/* Event Stats */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Event Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Capacity</span>
                  <span className="font-medium">{event.capacity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Attending</span>
                  <span className="font-medium">{event.currentAttendees}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Available</span>
                  <span className="font-medium text-green-600">
                    {event.capacity - event.currentAttendees}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Rating</span>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="ml-1 font-medium">
                      {event.averageRating?.toFixed(1) || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Contact Organizer</h3>
              <div className="space-y-3">
                {event.contact?.email && (
                  <a
                    href={`mailto:${event.contact.email}`}
                    className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {event.contact.email}
                  </a>
                )}
                {event.contact?.phone && (
                  <a
                    href={`tel:${event.contact.phone}`}
                    className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    {event.contact.phone}
                  </a>
                )}
                {event.contact?.website && (
                  <a
                    href={event.contact.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
