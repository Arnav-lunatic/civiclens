const express = require('express');
const router = express.Router();
const {
  createComplaint,
  submitComplaintWithOTP,
  getMyComplaints,
  getPublicComplaints,
  getSubAdminComplaints,
  getSuperAdminComplaints,
  updateComplaintStatus,
  analyzeComplaintImage,
  analyzeResolutionImage,
  toggleLikeComplaint,
  submitComplaintFeedback,
  getPublicComplaintStats,
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public live feed & statistics
router.get('/public', getPublicComplaints);
router.get('/stats', getPublicComplaintStats);

// Groq AI Vision Image Analysis Route (Public for seamless pre-submission check)
router.post('/analyze-image', upload.single('image'), analyzeComplaintImage);

// Groq AI Vision Resolution Image Verification Route
router.post('/analyze-resolution', upload.single('image'), analyzeResolutionImage);

// Public / Guest Submit with Email OTP & Geotagged Photos
router.post('/submit-with-otp', upload.array('images', 5), submitComplaintWithOTP);

// Toggle Like / Upvote (Open to public & logged-in users)
router.post('/:id/like', toggleLikeComplaint);

// Submit Citizen Feedback on Resolved Issue
router.post('/:id/feedback', submitComplaintFeedback);

// Logged In Citizen / Officer / Admin Routes (Any registered user can lodge civic grievances)
router.post('/', protect, authorize('citizen', 'subadmin', 'superadmin'), upload.array('images', 5), createComplaint);
router.get('/my', protect, authorize('citizen', 'subadmin', 'superadmin'), getMyComplaints);

// Sub-Admin Routes
router.get('/subadmin', protect, authorize('subadmin', 'superadmin'), getSubAdminComplaints);

// Super-Admin Routes
router.get('/superadmin', protect, authorize('superadmin'), getSuperAdminComplaints);

// Update status & resolution proof
router.put('/:id/status', protect, authorize('subadmin', 'superadmin'), upload.single('resolvedImage'), updateComplaintStatus);

module.exports = router;
