import { useState } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Target, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const [email,      setEmail]    = useState('');
  const [password,   setPassword] = useState('');
  const [showPass,   setShowPass] = useState(false);
  const [rememberMe, setRemember] = useState(false);
  const [loading,    setLoading]  = useState(false);
  const [error,      setError]    = useState('');
  const { setAuth }               = useAuthStore();
  const navigate                  = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', email.trim());
      formData.append('password', password);

      const res = await fetch(`${API_URL}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    formData.toString(),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(typeof data.detail === 'string' ? data.detail : 'Invalid email or password');
        return;
      }

      if (rememberMe) {
        const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
        localStorage.setItem('wr_remember_expiry', String(expiry));
      } else {
        localStorage.removeItem('wr_remember_expiry');
      }

      setAuth(data.user, data.access_token);
      navigate('/');
    } catch {
      setError('Cannot connect to server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.glowPurple} />
      <div className={styles.glowBlue} />

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

        <div className={styles.header}>
          <h2 className={styles.title}>Sign in</h2>
          <p className={styles.subtitle}>Access Your Intelligence Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>

          {/* Email */}
          <div className={styles.field}>
            <label className={styles.label}>Email Address</label>
            <div className={styles.inputWrap}>
              <Mail size={15} className={styles.inputIcon} />
              <input
                type="email"
                className={styles.input}
                placeholder="you@prompcorp.com.au"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required autoFocus disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div className={styles.field}>
            <div className={styles.passwordLabelRow}>
              <label className={styles.label}>Password</label>
              <Link to="/forgot-password" className={styles.forgotLink}>
                Forgot Password?
              </Link>
            </div>
            <div className={styles.inputWrap}>
              <Lock size={15} className={styles.inputIcon} />
              <input
                type={showPass ? 'text' : 'password'}
                className={styles.input}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required disabled={loading}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPass(v => !v)}
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className={styles.rememberRow}>
            <div
              className={`${styles.checkbox} ${rememberMe ? styles.checkboxChecked : ''}`}
              onClick={() => setRemember(v => !v)}
              role="checkbox"
              aria-checked={rememberMe}
              tabIndex={0}
              onKeyDown={e => e.key === ' ' && setRemember(v => !v)}
            >
              {rememberMe && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className={styles.rememberText} onClick={() => setRemember(v => !v)}>
              Remember me for 30 days
            </span>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              className={styles.error}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertCircle size={14} /> {error}
            </motion.div>
          )}

          {/* Submit */}
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : 'Sign in to War Room'}
          </button>

        </form>

        {/* Bottom — separated by border */}
        <div className={styles.bottomLinks}>
          <p className={styles.registerLink}>
            Don't have an account?{' '}
            <Link to="/register" className={styles.link}>Create an Account</Link>
          </p>
        </div>

      </motion.div>
    </div>
  );
}