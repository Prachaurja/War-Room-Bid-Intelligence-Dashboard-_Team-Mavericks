import { useState } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  Target, Mail, Lock, User,
  Eye, EyeOff, AlertCircle, ArrowLeft, CheckCircle2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import styles from './RegisterPage.module.css';

export default function RegisterPage() {
  const [form, setForm]         = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const { setAuth }             = useAuthStore();
  const navigate                = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!form.name.trim())              { setError('Full name is required'); return; }
    if (!form.email.trim())             { setError('Email is required'); return; }
    if (form.password.length < 8)       { setError('Password must be at least 8 characters'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:    form.email.trim().toLowerCase(),
          name:     form.name.trim(),
          password: form.password,
          role:     'analyst',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (typeof data.detail === 'string')      setError(data.detail);
        else if (Array.isArray(data.detail))      setError(data.detail[0]?.msg ?? 'Validation error');
        else                                       setError(`Registration failed (${res.status})`);
        return;
      }

      // Store token and redirect to dashboard
      setSuccess(true);
      setAuth(data.user, data.access_token);
      setTimeout(() => navigate('/login'), 900);

    } catch {
      setError('Cannot connect to server. Make sure the backend is running on port 8000.');
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
          <h2 className={styles.title}>Create Account</h2>
          <p className={styles.subtitle}>Join the War Room Intelligence Platform</p>
        </div>

        {/* ── Success state ── */}
        {success ? (
          <motion.div
            className={styles.successState}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <CheckCircle2 size={44} className={styles.successIcon} />
            <p className={styles.successTitle}>Account created!</p>
            <p className={styles.successSub}>Redirecting to Login Page…</p>
          </motion.div>
        ) : (
          /* ── Form ── */
          <form onSubmit={handleSubmit} className={styles.form}>

            {/* Full name */}
            <div className={styles.field}>
              <label className={styles.label}>Full Name</label>
              <div className={styles.inputWrap}>
                <User size={15} className={styles.inputIcon} />
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  required autoFocus disabled={loading}
                />
              </div>
            </div>

            {/* Email */}
            <div className={styles.field}>
              <label className={styles.label}>Email Address</label>
              <div className={styles.inputWrap}>
                <Mail size={15} className={styles.inputIcon} />
                <input
                  type="email"
                  className={styles.input}
                  placeholder="you@prompcorp.com.au"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  required disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className={styles.field}>
              <label className={styles.label}>Password</label>
              <div className={styles.inputWrap}>
                <Lock size={15} className={styles.inputIcon} />
                <input
                  type={showPass ? 'text' : 'password'}
                  className={styles.input}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
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
              {/* Strength bar */}
              {form.password && (
                <div className={styles.strengthBar}>
                  <div
                    className={styles.strengthFill}
                    style={{
                      width:      form.password.length >= 12 ? '100%' : form.password.length >= 8 ? '66%' : '33%',
                      background: form.password.length >= 12 ? '#10B981' : form.password.length >= 8 ? '#F59E0B' : '#EF4444',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className={styles.field}>
              <label className={styles.label}>Confirm Password</label>
              <div className={styles.inputWrap}>
                <Lock size={15} className={styles.inputIcon} />
                <input
                  type={showPass ? 'text' : 'password'}
                  className={styles.input}
                  placeholder="Confirm your password"
                  value={form.confirm}
                  onChange={e => set('confirm', e.target.value)}
                  required disabled={loading}
                />
                {form.confirm && form.password === form.confirm && (
                  <CheckCircle2 size={14} className={styles.matchIcon} />
                )}
              </div>
            </div>

            {/* Role note */}
            <div className={styles.roleNote}>
              <span className={styles.roleBadge}>Analyst</span>
              <span>New accounts start as Analyst. Admins can upgrade roles later.</span>
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
              {loading
                ? <><span className={styles.spinner} /> Creating account…</>
                : 'Create Account'
              }
            </button>

          </form>
        )}

        {/* Bottom — separated by border */}
        <div className={styles.bottomLinks}>
          <p className={styles.loginLink}>
            Already have an account?{' '}
            <Link to="/login" className={styles.link}>
              <ArrowLeft size={12} /> Sign in
            </Link>
          </p>
        </div>

      </motion.div>
    </div>
  );
}