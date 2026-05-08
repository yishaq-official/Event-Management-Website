// Simple email service stub. Replace with real provider in production.
const sendPasswordResetEmail = async (user, resetToken) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      // Integrate with real email provider (SendGrid, SES, Mailgun, etc.) here.
      console.log(`Sending password reset email to ${user.email} with token ${resetToken}`);
    } else {
      // In development, log the token for easy testing
      console.log(`Dev password reset token for ${user.email}: ${resetToken}`);
    }
    return true;
  } catch (err) {
    console.error('Email service error:', err);
    throw err;
  }
};

module.exports = {
  sendPasswordResetEmail
};
