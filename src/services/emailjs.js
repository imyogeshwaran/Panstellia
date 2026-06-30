/**
 * EmailJS Configuration and Initialization
 * Handles all EmailJS setup and core functionality
 * 
 * Setup Steps:
 * 1. Go to https://www.emailjs.com/
 * 2. Sign up for a free account
 * 3. Add Gmail or other email service as a "Service"
 * 4. Create email templates
 * 5. Get your Service ID, Template IDs, and Public Key
 * 6. Add to .env.local:
 *    VITE_EMAILJS_SERVICE_ID=service_xxx
 *    VITE_EMAILJS_TEMPLATE_ID_ORDER=template_xxx
 *    VITE_EMAILJS_TEMPLATE_ID_CUSTOMER=template_xxx
 *    VITE_EMAILJS_PUBLIC_KEY=public_key_xxx
 */

import emailjs from '@emailjs/browser';

/**
 * Initialize EmailJS with public key
 * Call this once on app startup (typically in App.jsx or main.jsx)
 */
export const initializeEmailJS = () => {
  try {
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
    
    if (!publicKey) {
      console.warn(
        'EmailJS Public Key not found. Please set VITE_EMAILJS_PUBLIC_KEY in .env.local'
      );
      return false;
    }

    emailjs.init(publicKey);
    console.log('✅ EmailJS initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize EmailJS:', error);
    return false;
  }
};

/**
 * Send email using EmailJS
 * @param {string} templateId - EmailJS template ID
 * @param {object} variables - Template variables
 * @returns {Promise<object>} - EmailJS response
 */
export const sendEmail = async (templateId, variables) => {
  try {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;

    if (!serviceId) {
      throw new Error('EmailJS Service ID not configured');
    }

    if (!templateId) {
      throw new Error('Template ID is required');
    }

    if (!variables || typeof variables !== 'object') {
      throw new Error('Template variables must be an object');
    }

    const response = await emailjs.send(
      serviceId,
      templateId,
      variables
    );

    console.log('✅ Email sent successfully:', response);
    return response;
  } catch (error) {
    const errorMsg = error?.message || error?.text || JSON.stringify(error);
    console.error('❌ Failed to send email:', errorMsg);
    throw new Error(`Email sending failed: ${errorMsg}`);
  }
};

/**
 * Validate EmailJS configuration
 * @returns {boolean} - True if all required env vars are set
 */
export const validateEmailJSConfig = () => {
  const requiredVars = [
    'VITE_EMAILJS_SERVICE_ID',
    'VITE_EMAILJS_TEMPLATE_ID_ORDER',
    'VITE_EMAILJS_TEMPLATE_ID_CUSTOMER',
    'VITE_EMAILJS_PUBLIC_KEY',
  ];

  const missing = requiredVars.filter(
    (varName) => !import.meta.env[varName]
  );

  if (missing.length > 0) {
    console.warn('⚠️ Missing EmailJS configuration:', missing);
    return false;
  }

  return true;
};

export const sendFeedbackNotification = async (feedbackData) => {
  try {
    const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@panstellia.com';
    const templateId =
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID_FEEDBACK ||
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID_ORDER ||
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID_CUSTOMER;

    if (!templateId) {
      throw new Error('Feedback template ID not configured');
    }

    const variables = {
      to_email: supportEmail,
      customer_name: feedbackData.customerName || 'Customer',
      customer_phone: feedbackData.phoneNumber || 'N/A',
      city: feedbackData.city || 'N/A',
      feedback_message: feedbackData.feedback || 'N/A',
      subject: 'New customer feedback submitted',
      email_html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h3>New customer feedback received</h3>
          <p><strong>Name:</strong> ${feedbackData.customerName || 'N/A'}</p>
          <p><strong>Phone:</strong> ${feedbackData.phoneNumber || 'N/A'}</p>
          <p><strong>City:</strong> ${feedbackData.city || 'N/A'}</p>
          <p><strong>Feedback:</strong></p>
          <p>${(feedbackData.feedback || 'N/A').replace(/\n/g, '<br />')}</p>
        </div>
      `,
    };

    const response = await sendEmail(templateId, variables);
    console.log('✅ Feedback notification email sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to send feedback notification email:', error);
    throw error;
  }
};

export default {
  initializeEmailJS,
  sendEmail,
  validateEmailJSConfig,
  sendFeedbackNotification,
};
