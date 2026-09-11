import React, { useState, useEffect } from 'react';
import { Star, X, CheckCircle2, Send } from 'lucide-react';
import { API } from '../services/api';
import { Complaint } from '../types';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaint: Complaint | null;
  onSuccess: (feedback: any) => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  complaint,
  onSuccess,
}) => {
  const currentUser = API.getUser('citizen') || API.getUser();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [citizenName, setCitizenName] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen && complaint) {
      setRating(complaint.feedback?.rating || 5);
      setComment(complaint.feedback?.comment || '');
      setCitizenName(
        complaint.feedback?.citizenName ||
          currentUser?.name ||
          ''
      );
      setError('');
      setSubmitted(false);
    }
  }, [isOpen, complaint]);

  if (!isOpen || !complaint) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      setError('Please select a star rating between 1 and 5.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await API.request(`/complaints/${complaint._id}/feedback`, 'POST', {
        rating,
        comment: comment.trim(),
        citizenName: citizenName.trim() || currentUser?.name || 'Verified Citizen',
      });

      if (res && res.success) {
        setSubmitted(true);
        onSuccess(res.feedback);
        setTimeout(() => {
          onClose();
        }, 1400);
      } else {
        setError(res.message || 'Failed to submit feedback.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingLabel = (score: number) => {
    switch (score) {
      case 1:
        return '1/5 - Unsatisfied / Work Incomplete';
      case 2:
        return '2/5 - Needs Improvement';
      case 3:
        return '3/5 - Acceptable Resolution';
      case 4:
        return '4/5 - Good Work & Responsive';
      case 5:
        return '5/5 - Outstanding Municipal Redressal!';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/75">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base leading-tight">
                Rate Grievance Resolution
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Ticket #{complaint._id.slice(-6).toUpperCase()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Feedback Submitted!</h4>
            <p className="text-xs text-slate-600">
              Thank you for verifying the municipal work and submitting your rating.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Issue context */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs">
              <span className="font-bold text-slate-800 line-clamp-1">{complaint.title}</span>
              <p className="text-slate-500 text-[11px]">
                {complaint.category} • PIN: {complaint.pincode} {complaint.district ? `• ${complaint.district}` : ''}
              </p>
            </div>

            {/* Star selector */}
            <div className="space-y-2 text-center">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                How satisfied are you with the resolution?
              </label>
              <div className="flex items-center justify-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1.5 rounded-xl hover:bg-amber-50 transition transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        (hoverRating || rating) >= star
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs font-semibold text-amber-700 h-4">
                {getRatingLabel(hoverRating || rating)}
              </p>
            </div>

            {/* Comment Textarea */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Your Feedback / Comments (Optional)
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts on the repair quality, timeliness, and field officer redressal..."
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-slate-50/50 resize-none"
              />
            </div>

            {/* Citizen Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Your Name / Designation
              </label>
              <input
                type="text"
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
                placeholder="e.g. Rahul Sharma (Local Resident)"
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-slate-50/50"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Feedback</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
