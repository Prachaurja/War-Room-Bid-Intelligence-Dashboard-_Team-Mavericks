import { useState } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Target, Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './ForgotPasswordPage.module.css';

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [sent,    setSent]    = useState(false);

  const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await fetch(`${API_URL}/auth/forgot-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      // Always show success — never reveal if email exists (security)
      setSent(true);

    } catch {
      setError('Cannot connect to server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.glowPurple} />

      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Logo */}
        <div className={styles.logoWrap}>
          <div className={styles.logoIcon}><Target size={22} /></div>
          <div>
          <h1 className={styles.logoName}>War Room</h1>
            <p className={styles.logoSub}>Bid Intelligence Platform</p>
          </div>
        </div>

        <div className={styles.divider} />

        {sent ? (
          /* ── Success state ── */
          <motion.div
            className={styles.successState}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <CheckCircle2 size={44} className={styles.successIcon} />
            <h2 className={styles.successTitle}>Check your inbox</h2>
            <p className={styles.successBody}>
              If <strong>{email}</strong> is registered, you'll receive a
              password reset link within a few minutes.
            </p>
            <p className={styles.successNote}>
              Didn't get it? Check your spam folder or{' '}
              <button className={styles.retryBtn} onClick={() => setSent(false)}>
                try again
              </button>
              .
            </p>
            <Link to="/login" className={styles.backBtn}>
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </motion.div>
        ) : (
          /* ── Form state ── */
          <>
            <div className={styles.header}>
              <h2 className={styles.title}>Reset Password</h2>
              <p className={styles.subtitle}>
                Enter your email and we'll send you a reset link
              </p>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Email address</label>
                <div className={styles.inputWrap}>
                  <Mail size={15} className={styles.inputIcon} />
                  <input
                    type="email"
                    className={styles.input}
                    placeholder="you@prompcorp.com.au"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <motion.div
                  className={styles.error}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AlertCircle size={14} /> {error}
                </motion.div>
              )}

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading
                  ? <span className={styles.spinner} />
                  : 'Send Reset Link'
                }
              </button>
            </form>

            <div className={styles.backLink}>
              <Link to="/login" className={styles.link}>
                <ArrowLeft size={12} /> Back to Sign In
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
