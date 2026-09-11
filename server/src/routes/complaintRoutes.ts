import express from 'express';
import {
  createComplaint,
  submitComplaintWithOTP,
  getMyComplaints,
  getPublicComplaints,
  getSubAdminComplaints,
  getSuperAdminComplaints,
  updateComplaintStatus,
  analyzeComplaintImage,
  analyzeResolutionImage,
} from '../controllers/complaintController';
import { protect, authorize } from '../middleware/authMiddleware';
import upload from '../middleware/uploadMiddleware';

const router = express.Router();

// Public live feed
router.get('/public', getPublicComplaints);

// Groq AI Vision Image Analysis Route (Public for seamless pre-submission check)
router.post('/analyze-image', upload.single('image'), analyzeComplaintImage);

// Groq AI Vision Resolution Image Verification Route
router.post('/analyze-resolution', upload.single('image'), analyzeResolutionImage);

// Public / Guest Submit with Email OTP & Geotagged Photos
router.post('/submit-with-otp', upload.array('images', 5), submitComplaintWithOTP);

// Logged In Citizen / Officer / Admin Routes (Any registered user can lodge civic grievances)
router.post('/', protect, authorize('citizen', 'subadmin', 'superadmin'), upload.array('images', 5), createComplaint);
router.get('/my', protect, authorize('citizen', 'subadmin', 'superadmin'), getMyComplaints);

// Sub-Admin Routes
router.get('/subadmin', protect, authorize('subadmin', 'superadmin'), getSubAdminComplaints);

// Super-Admin Routes
router.get('/superadmin', protect, authorize('superadmin'), getSuperAdminComplaints);

// Update status & resolution proof
router.put('/:id/status', protect, authorize('subadmin', 'superadmin'), upload.single('resolvedImage'), updateComplaintStatus);

export default router;
