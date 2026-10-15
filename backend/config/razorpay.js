const Razorpay = require("razorpay");

let razorpayInstance = null;

const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_TnuKpWUFG5M9Gs",
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

module.exports = { getRazorpayInstance };
