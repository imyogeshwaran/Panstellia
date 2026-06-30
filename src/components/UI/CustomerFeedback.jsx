import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { sendFeedbackNotification } from '../../services/emailjs';

const CustomerFeedback = () => {
  const [formData, setFormData] = useState({
    customerName: '',
    phoneNumber: '',
    city: '',
    feedback: ''
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.customerName.trim() || !formData.phoneNumber.trim() || !formData.city.trim() || !formData.feedback.trim()) {
      toast.error('Please fill in all fields', {
        position: 'bottom-right'
      });
      return;
    }

    if (formData.phoneNumber.trim().length < 10) {
      toast.error('Please enter a valid phone number', {
        position: 'bottom-right'
      });
      return;
    }

    setLoading(true);

    try {
      // Save feedback to Firestore
      await addDoc(collection(db, 'customerFeedback'), {
        customerName: formData.customerName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        city: formData.city.trim(),
        feedback: formData.feedback.trim(),
        createdAt: serverTimestamp(),
        status: 'new' // Admin can mark as read/processed
      });

      try {
        await sendFeedbackNotification({
          customerName: formData.customerName.trim(),
          phoneNumber: formData.phoneNumber.trim(),
          city: formData.city.trim(),
          feedback: formData.feedback.trim(),
        });
      } catch (emailError) {
        console.warn('Feedback saved but support email notification failed:', emailError);
      }

      setSubmitted(true);
      toast.success('Thank you! Your feedback has been received.', {
        position: 'bottom-right'
      });

      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({
          customerName: '',
          phoneNumber: '',
          city: '',
          feedback: ''
        });
        setSubmitted(false);
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.', {
        position: 'bottom-right'
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-[400px] flex items-center justify-center"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          </motion.div>
          <h3 className="text-2xl font-bold text-luxury-900 mb-2">Thank You!</h3>
          <p className="text-luxury-600">Your feedback has been successfully submitted. We appreciate your input!</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="bg-luxury-50 rounded-xl shadow-lg overflow-hidden"
    >
      <div className="bg-gradient-to-r from-gold-500 to-gold-600 p-6 md:p-8">
        <h3 className="font-serif text-2xl md:text-3xl font-bold text-white">Share Your Feedback</h3>
        <p className="text-white/90 mt-2">Help us improve your experience at Panstellia</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Name */}
          <div>
            <label className="block text-sm font-medium text-luxury-900 mb-2">
              Your Name *
            </label>
            <input
              type="text"
              name="customerName"
              value={formData.customerName}
              onChange={handleInputChange}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 border border-luxury-200 rounded-lg focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors text-luxury-900 placeholder-luxury-400"
              disabled={loading}
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-luxury-900 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              placeholder="Enter your 10-digit mobile number"
              className="w-full px-4 py-3 border border-luxury-200 rounded-lg focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors text-luxury-900 placeholder-luxury-400"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-luxury-900 mb-2">
            City *
          </label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            placeholder="Enter your city"
            className="w-full px-4 py-3 border border-luxury-200 rounded-lg focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors text-luxury-900 placeholder-luxury-400"
            disabled={loading}
          />
        </div>

        {/* Feedback Text Area */}
        <div>
          <label className="block text-sm font-medium text-luxury-900 mb-2">
            Your Feedback *
          </label>
          <textarea
            name="feedback"
            value={formData.feedback}
            onChange={handleInputChange}
            placeholder="Share your feedback about our products and services..."
            rows="5"
            className="w-full px-4 py-3 border border-luxury-200 rounded-lg focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors text-luxury-900 placeholder-luxury-400 resize-none"
            disabled={loading}
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className={`w-full py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
              loading
                ? 'bg-luxury-300 text-luxury-600 cursor-not-allowed'
                : 'bg-gold-500 text-white hover:bg-gold-600 shadow-lg'
            }`}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-luxury-600 border-t-transparent rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send Feedback
              </>
            )}
          </motion.button>
        </div>

        <p className="text-xs text-luxury-500 text-center pt-4">
          All fields are required. Your feedback helps us serve you better!
        </p>
      </form>
    </motion.div>
  );
};

export default CustomerFeedback;
