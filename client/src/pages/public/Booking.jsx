import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  DollarSign,
  Ticket,
  User,
  Mail,
  Phone,
  Company,
  CreditCard,
  Shield,
  ArrowLeft,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

// Stripe publishable key (should be in environment variables)
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_...');

const BookingForm = ({ event, selectedTicket, quantity, onBookingComplete }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [attendees, setAttendees] = useState([
    { name: '', email: '', phone: '', company: '', jobTitle: '', dietaryRestrictions: '', specialRequirements: '' }
  ]);
  const [errors, setErrors] = useState({});

  const handleAttendeeChange = (index, field, value) => {
    const updatedAttendees = [...attendees];
    updatedAttendees[index] = { ...updatedAttendees[index], [field]: value };
    setAttendees(updatedAttendees);
    
    // Clear error when user starts typing
    if (errors[`attendees.${index}.${field}`]) {
      setErrors(prev => ({
        ...prev,
        [`attendees.${index}.${field}`]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    attendees.forEach((attendee, index) => {
      if (!attendee.name.trim()) {
        newErrors[`attendees.${index}.name`] = 'Name is required';
      }
      if (!attendee.email.trim()) {
        newErrors[`attendees.${index}.email`] = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(attendee.email)) {
        newErrors[`attendees.${index}.email`] = 'Email is invalid';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix errors in the form');
      return;
    }

    setLoading(true);

    try {
      // Create booking
      const bookingResponse = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          eventId: event._id,
          ticketType: selectedTicket.type,
          quantity,
          attendees
        })
      });

      const bookingData = await bookingResponse.json();

      if (!bookingData.success) {
        toast.error(bookingData.message || 'Failed to create booking');
        setLoading(false);
        return;
      }

      // If free event, booking is confirmed
      if (bookingData.booking.totalAmount === 0) {
        onBookingComplete(bookingData.booking);
        return;
      }

      // Process payment for paid events
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        bookingData.clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: {
              name: attendees[0].name,
              email: attendees[0].email
            }
          }
        }
      );

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        // Confirm payment on backend
        const confirmResponse = await fetch(`/api/bookings/${bookingData.booking._id}/confirm-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id
          })
        });

        const confirmData = await confirmResponse.json();

        if (confirmData.success) {
          onBookingComplete(confirmData.booking);
        } else {
          toast.error(confirmData.message || 'Failed to confirm payment');
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Network error. Please try again.');
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  if (!selectedTicket) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Attendee Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Attendee Information</h3>
        
        {attendees.map((attendee, index) => (
          <div key={index} className="border-b pb-4 mb-4 last:border-b-0">
            <h4 className="font-medium text-gray-900 mb-3">
              Attendee {index + 1}
              {index === 0 && ' (Primary)'}
            </h4>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={attendee.name}
                    onChange={(e) => handleAttendeeChange(index, 'name', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors[`attendees.${index}.name`] ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="John Doe"
                  />
                </div>
                {errors[`attendees.${index}.name`] && (
                  <p className="text-red-600 text-sm mt-1">{errors[`attendees.${index}.name`]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={attendee.email}
                    onChange={(e) => handleAttendeeChange(index, 'email', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors[`attendees.${index}.email`] ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="john@example.com"
                  />
                </div>
                {errors[`attendees.${index}.email`] && (
                  <p className="text-red-600 text-sm mt-1">{errors[`attendees.${index}.email`]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={attendee.phone}
                    onChange={(e) => handleAttendeeChange(index, 'phone', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <div className="relative">
                  <Company className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={attendee.company}
                    onChange={(e) => handleAttendeeChange(index, 'company', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Acme Corp"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  value={attendee.jobTitle}
                  onChange={(e) => handleAttendeeChange(index, 'jobTitle', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Software Engineer"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dietary Restrictions
                </label>
                <textarea
                  value={attendee.dietaryRestrictions}
                  onChange={(e) => handleAttendeeChange(index, 'dietaryRestrictions', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Vegetarian, Gluten-free"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Requirements
                </label>
                <textarea
                  value={attendee.specialRequirements}
                  onChange={(e) => handleAttendeeChange(index, 'specialRequirements', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Wheelchair access, Sign language interpreter"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Information */}
      {selectedTicket.price > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Information</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Card Details
            </label>
            <div className="border border-gray-300 rounded-lg p-4">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Shield className="w-4 h-4" />
            <span>Your payment information is secure and encrypted</span>
          </div>
        </div>
      )}

      {/* Order Summary */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h3>
        
        <div className="space-y-3 mb-4">
          <div className="flex justify-between">
            <span className="text-gray-600">
              {selectedTicket.name} × {quantity}
            </span>
            <span className="font-medium">
              {formatPrice(selectedTicket.price * quantity)}
            </span>
          </div>
          
          {selectedTicket.price > 0 && (
            <>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Processing Fee</span>
                <span>$0.00</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-blue-600">
                    {formatPrice(selectedTicket.price * quantity)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Refund Policy</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Full refund if cancelled 24+ hours before event</li>
                <li>50% refund if cancelled 2-24 hours before event</li>
                <li>No refund if cancelled less than 2 hours before event</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            {selectedTicket.price > 0 ? `Pay ${formatPrice(selectedTicket.price * quantity)}` : 'Complete Booking'}
          </>
        )}
      </button>
    </form>
  );
};

const Booking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [completedBooking, setCompletedBooking] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchEvent();
  }, [id, user, navigate]);

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
        navigate('/events');
      }
    } catch (error) {
      console.error('Fetch event error:', error);
      toast.error('Network error. Please try again.');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const handleBookingComplete = (booking) => {
    setCompletedBooking(booking);
    setBookingComplete(true);
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

  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-600 mb-6">
            Your booking for {event.title} has been confirmed. Check your email for confirmation details.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">Booking ID: {completedBooking._id}</p>
            <p className="text-sm text-gray-600">
              Total Paid: {formatPrice(completedBooking.totalAmount)}
            </p>
          </div>
          <button
            onClick={() => navigate('/my-bookings')}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            View My Bookings
          </button>
        </div>
      </div>
    );
  }

  if (!event || !selectedTicket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Event Not Available</h2>
          <p className="text-gray-600 mb-6">This event is not available for booking.</p>
          <button
            onClick={() => navigate('/events')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/events/${id}`)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Event
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Booking</h1>
          <p className="text-gray-600">Fill in your details to secure your spot</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Event Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h3 className="font-bold text-gray-900 mb-4">Event Details</h3>
              
              <div className="space-y-3 mb-4">
                <img
                  src={event.banner}
                  alt={event.title}
                  className="w-full h-32 object-cover rounded-lg mb-4"
                />
                
                <h4 className="font-semibold text-gray-900">{event.title}</h4>
                
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span className="text-sm">{formatDate(event.date.startDate)}</span>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  <span className="text-sm">
                    {formatTime(event.time.startTime)} - {formatTime(event.time.endTime)}
                  </span>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span className="text-sm">
                    {event.eventType === 'online' ? 'Online Event' : event.location.venue}
                  </span>
                </div>
              </div>

              {/* Ticket Selection */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Ticket Type
                </label>
                <select
                  value={selectedTicket.type}
                  onChange={(e) => {
                    const ticket = event.tickets.find(t => t.type === e.target.value);
                    setSelectedTicket(ticket);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {event.tickets.map(ticket => (
                    <option key={ticket.type} value={ticket.type}>
                      {ticket.name} - {formatPrice(ticket.price)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity Selection */}
              <div className="mt-4">
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
                <p className="text-sm text-gray-500 mt-1">
                  {selectedTicket.available} available
                </p>
              </div>

              {/* Price Summary */}
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formatPrice(selectedTicket.price * quantity)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-2">
            <Elements stripe={stripePromise}>
              <BookingForm
                event={event}
                selectedTicket={selectedTicket}
                quantity={quantity}
                onBookingComplete={handleBookingComplete}
              />
            </Elements>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;
