import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaCalendarAlt as Calendar,
  FaMapMarkerAlt as MapPin,
  FaUsers as Users,
  FaTicketAlt as Ticket,
  FaClock as Clock,
  FaExclamationCircle as AlertCircle,
  FaCreditCard as CreditCard,
  FaArrowRight as ArrowRight,
  FaCheckCircle as CheckCircle,
  FaDownload as Download,
  FaTimes as X
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    total: 0
  });
  const [filter, setFilter] = useState('all');
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, [pagination.currentPage, filter]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.currentPage,
        limit: 10,
        ...(filter !== 'all' && { status: filter })
      });

      const response = await fetch(`/api/bookings/my-bookings?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setBookings(data.bookings);
        setPagination({
          currentPage: data.currentPage,
          totalPages: data.pages,
          total: data.total
        });
      } else {
        toast.error(data.message || 'Failed to fetch bookings');
      }
    } catch (error) {
      console.error('Fetch bookings error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    setCancellingId(bookingId);

    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          reason: 'User cancelled'
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Booking cancelled${data.refundAmount > 0 ? ` with refund of $${data.refundAmount}` : ''}`);
        fetchBookings(); // Refresh bookings
      } else {
        toast.error(data.message || 'Failed to cancel booking');
      }
    } catch (error) {
      console.error('Cancel booking error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  const downloadTicket = () => {
    // TODO: Implement ticket download functionality
    toast.info('Ticket download coming soon!');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4" />;
      case 'cancelled':
        return <X className="w-4 h-4" />;
      default:
        return <Ticket className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
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

  const isEventPast = (eventDate) => {
    return new Date(eventDate) < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
          <p className="text-gray-600">Manage your event bookings and tickets</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Filter:</span>
              <div className="flex gap-2">
                {['all', 'confirmed', 'pending', 'cancelled', 'completed'].map(status => (
                  <button
                    key={status}
                    onClick={() => {
                      setFilter(status);
                      setPagination(prev => ({ ...prev, currentPage: 1 }));
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        {bookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Ticket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all' 
                ? "You haven't booked any events yet." 
                : `No ${filter} bookings found.`
              }
            </p>
            <Link
              to="/events"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Events
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking) => (
              <div key={booking._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Event Image */}
                    <div className="lg:w-48 h-32 flex-shrink-0">
                      <img
                        src={booking.event.banner}
                        alt={booking.event.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>

                    {/* Booking Details */}
                    <div className="flex-grow">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.bookingStatus)}`}>
                              {getStatusIcon(booking.bookingStatus)}
                              {booking.bookingStatus.charAt(0).toUpperCase() + booking.bookingStatus.slice(1)}
                            </span>
                            {booking.paymentStatus === 'completed' && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                <CreditCard className="w-3 h-3" />
                                Paid
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            <Link
                              to={`/events/${booking.event._id}`}
                              className="hover:text-blue-600 transition-colors"
                            >
                              {booking.event.title}
                            </Link>
                          </h3>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatPrice(booking.totalAmount)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {booking.tickets[0].quantity} × {booking.tickets[0].name}
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span className="text-sm">{formatDate(booking.event.date.startDate)}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Clock className="w-4 h-4 mr-2" />
                          <span className="text-sm">
                            {formatTime(booking.event.time.startTime)} - {formatTime(booking.event.time.endTime)}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <MapPin className="w-4 h-4 mr-2" />
                          <span className="text-sm">
                            {booking.event.eventType === 'online' ? 'Online Event' : booking.event.location?.venue}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Users className="w-4 h-4 mr-2" />
                          <span className="text-sm">Booking ID: {booking._id.slice(-8)}</span>
                        </div>
                      </div>

                      {/* Attendees */}
                      {booking.attendees && booking.attendees.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Attendees</h4>
                          <div className="flex flex-wrap gap-2">
                            {booking.attendees.map((attendee, index) => (
                              <div key={index} className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700">
                                {attendee.name}
                                {attendee.checkedIn && (
                                  <CheckCircle className="w-3 h-3 text-green-600 inline ml-1" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-gray-600">
                          Booked on {formatDate(booking.createdAt)}
                        </div>
                        <div className="flex items-center gap-2">
                          {booking.bookingStatus === 'confirmed' && !isEventPast(booking.event.date.startDate) && (
                            <button
                              onClick={() => downloadTicket(booking)}
                              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              Ticket
                            </button>
                          )}
                          
                          {['confirmed', 'pending'].includes(booking.bookingStatus) && !isEventPast(booking.event.date.startDate) && (
                            <button
                              onClick={() => cancelBooking(booking._id)}
                              disabled={cancellingId === booking._id}
                              className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {cancellingId === booking._id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                              ) : (
                                <X className="w-4 h-4" />
                              )}
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))}
              disabled={pagination.currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setPagination(prev => ({ ...prev, currentPage: page }))}
                    className={`px-3 py-2 rounded-lg ${
                      pagination.currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.min(prev.totalPages, prev.currentPage + 1) }))}
              disabled={pagination.currentPage === pagination.totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;
