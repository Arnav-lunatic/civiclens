import React, { useState } from 'react';
import { MailCheck } from 'lucide-react';

interface OtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  devOtp?: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
}

export const OtpModal: React.FC<OtpModalProps> = ({
  isOpen,
  onClose,
  email,
  devOtp,
  onVerify,
  onResend,
}) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;
    setLoading(true);
    try {
      await onVerify(otp);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await onResend();
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900/95 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl shadow-sky-500/10 text-slate-100">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center text-xl mx-auto">
            <MailCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Verify Email & Submit Issue</h3>
          <p className="text-xs text-slate-400">
            A 6-digit verification code was sent to <strong className="text-sky-300 font-medium">{email}</strong>. Please check your inbox & spam folder.
          </p>
        </div>

        {devOtp && (
          <div className="p-3 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-2xl text-xs text-center font-medium">
            Development Preview OTP: <strong className="font-mono text-sm tracking-widest text-emerald-400">{devOtp}</strong>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 text-center">
              Enter 6-Digit Email OTP
            </label>
            <input
              type="text"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="849201"
              className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-lg font-mono text-center tracking-[0.4em] text-white focus:bg-slate-900 focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length < 6}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-sky-500/25 transition disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? 'Verifying...' : 'Confirm OTP & Lodge Grievance'}
          </button>

          <div className="flex justify-between items-center text-xs pt-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-sky-400 font-bold hover:underline"
            >
              {resending ? 'Sending...' : 'Resend OTP'}
            </button>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-200">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
