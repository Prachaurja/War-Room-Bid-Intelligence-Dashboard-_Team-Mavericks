import { useState, useRef } from 'react';
import type { FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Mail, Lock, Eye, EyeOff, AlertCircle, ShieldCheck, KeyRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import type { LoginResponse } from '../../types/auth.types';
import styles from './LoginPage.module.css';

type LoginStep  = 'credentials' | 'totp';
type TOTPMode   = 'app' | 'recovery';

export default function LoginPage() {
  const [step,        setStep]       = useState<LoginStep>('credentials');
  const [totpMode,    setTotpMode]   = useState<TOTPMode>('app');
  const [email,       setEmail]      = useState('');
  const [password,    setPassword]   = useState('');
  const [totpCode,    setTotpCode]   = useState('');
  const [recoveryCode,setRecovery]   = useState('');
  const [showPass,    setShowPass]   = useState(false);
  const [rememberMe,  setRemember]   = useState(false);
  const [loading,     setLoading]    = useState(false);
  const [error,       setError]      = useState('');
  const { setAuth }                  = useAuthStore();
  const navigate                     = useNavigate();
  const totpRef                      = useRef<HTMLInputElement>(null);
  const recoveryRef                  = useRef<HTMLInputElement>(null);

  const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

  // ── Step 1: credentials ───────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', email.trim());
      formData.append('password', password);

      const res  = await fetch(`${API_URL}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    formData.toString(),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(typeof data.detail === 'string' ? data.detail : 'Invalid email or password');
        return;
      }

      if (data.totp_required) {
        setStep('totp');
        setTotpMode('app');
        setTimeout(() => totpRef.current?.focus(), 100);
        return;
      }

      applyLogin(data);
    } catch {
      setError('Cannot connect to server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: TOTP or recovery code ─────────────────────────
  const handleTotpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const code = totpMode === 'app' ? totpCode : recoveryCode.trim().toUpperCase();

    if (totpMode === 'app' && code.length !== 6) {
      setError('Enter the 6-digit code from your authenticator app');
      return;
    }
    if (totpMode === 'recovery' && code.length !== 9) {
      setError('Enter your recovery code in the format XXXX-XXXX');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/auth/login/totp`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), password, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(typeof data.detail === 'string' ? data.detail : 'Invalid code');
        setTotpCode('');
        setRecovery('');
        return;
      }

      applyLogin(data);
    } catch {
      setError('Cannot connect to server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const applyLogin = (data: LoginResponse) => {
    if (rememberMe) {
      localStorage.setItem('wr_remember_expiry', String(Date.now() + 30 * 24 * 60 * 60 * 1000));
    } else {
      localStorage.removeItem('wr_remember_expiry');
    }
    setAuth(data.user, data.access_token);
    navigate('/');
  };

  const switchToRecovery = () => {
    setTotpMode('recovery');
    setTotpCode('');
    setError('');
    setTimeout(() => recoveryRef.current?.focus(), 100);
  };

  const switchToApp = () => {
    setTotpMode('app');
    setRecovery('');
    setError('');
    setTimeout(() => totpRef.current?.focus(), 100);
  };

  const goBack = () => {
    setStep('credentials');
    setTotpCode('');
    setRecovery('');
    setError('');
  };

  // ── Format recovery code input XXXX-XXXX ─────────────────
  const handleRecoveryInput = (val: string) => {
    const clean = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
    const formatted = clean.length > 4 ? clean.slice(0,4) + '-' + clean.slice(4) : clean;
    setRecovery(formatted);
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

        <AnimatePresence mode="wait">

          {/* ── Step 1: Credentials ── */}
          {step === 'credentials' && (
            <motion.div
              key="credentials"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1,  x: 0   }}
              exit={{    opacity: 0,  x: -20  }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.header}>
                <h2 className={styles.title}>Sign In</h2>
                <p className={styles.subtitle}>Access Your Intelligence Dashboard</p>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.field}>
                  <label className={styles.label}>Email Address</label>
                  <div className={styles.inputWrap}>
                    <Mail size={15} className={styles.inputIcon} />
                    <input type="email" className={styles.input}
                      placeholder="you@prompcorp.com.au"
                      value={email} onChange={e => setEmail(e.target.value)}
                      required autoFocus disabled={loading} />
                  </div>
                </div>

                <div className={styles.field}>
                  <div className={styles.passwordLabelRow}>
                    <label className={styles.label}>Password</label>
                    <Link to="/forgot-password" className={styles.forgotLink}>Forgot Password?</Link>
                  </div>
                  <div className={styles.inputWrap}>
                    <Lock size={15} className={styles.inputIcon} />
                    <input type={showPass ? 'text' : 'password'} className={styles.input}
                      placeholder="••••••••"
                      value={password} onChange={e => setPassword(e.target.value)}
                      required disabled={loading} />
                    <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(v => !v)}>
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className={styles.rememberRow}>
                  <div
                    className={`${styles.checkbox} ${rememberMe ? styles.checkboxChecked : ''}`}
                    onClick={() => setRemember(v => !v)}
                    role="checkbox" aria-checked={rememberMe} tabIndex={0}
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

                {error && (
                  <motion.div className={styles.error} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
                    <AlertCircle size={14} /> {error}
                  </motion.div>
                )}

                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading ? <span className={styles.spinner} /> : 'Sign in to War Room'}
                </button>
              </form>

              <div className={styles.bottomLinks}>
                <p className={styles.registerLink}>
                  Don't have an account?{' '}
                  <Link to="/register" className={styles.link}>Create an Account</Link>
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: TOTP ── */}
          {step === 'totp' && (
            <motion.div
              key="totp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1,  x: 0  }}
              exit={{    opacity: 0,  x: 20  }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.header}>
                <div className={styles.totpIconWrap}>
                  {totpMode === 'app'
                    ? <ShieldCheck size={28} className={styles.totpIcon} />
                    : <KeyRound    size={28} className={styles.totpIcon} />}
                </div>
                <h2 className={styles.title}>
                  {totpMode === 'app' ? 'Two-Factor Auth' : 'Recovery Code'}
                </h2>
                <p className={styles.totpHint}>Signed in as <strong>{email}</strong></p>
              </div>

              <form onSubmit={handleTotpSubmit} className={styles.form}>

                {/* App code input */}
                {totpMode === 'app' && (
                  <div className={styles.field}>
                    <label className={styles.label}>Authentication Code</label>
                    <div className={styles.inputWrap}>
                      <ShieldCheck size={15} className={styles.inputIcon} />
                      <input
                        ref={totpRef}
                        type="text" inputMode="numeric" pattern="[0-9]*"
                        className={`${styles.input} ${styles.totpInput}`}
                        placeholder="000000"
                        value={totpCode}
                        onChange={e => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setTotpCode(v);
                          if (v.length === 6) setTimeout(() => document.getElementById('totp-submit')?.click(), 80);
                        }}
                        maxLength={6} disabled={loading} autoComplete="one-time-code"
                      />
                    </div>
                  </div>
                )}
                
                {/* Recovery code input */}
                {totpMode === 'recovery' && (
                  <div className={styles.field}>
                    <label className={styles.label}>Recovery Code</label>
                    <div className={styles.inputWrap}>
                      <KeyRound size={15} className={styles.inputIcon} />
                      <input
                        ref={recoveryRef}
                        type="text"
                        className={`${styles.input} ${styles.totpInput}`}
                        placeholder="XXXX-XXXX"
                        value={recoveryCode}
                        onChange={e => handleRecoveryInput(e.target.value)}
                        maxLength={9} disabled={loading}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                )}

                <p className={styles.subtitle}>
                  {totpMode === 'app'
                    ? 'Enter the 6-digit code from your authenticator app'
                    : 'Enter one of your saved recovery codes'}
                </p>

                {error && (
                  <motion.div className={styles.error} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
                    <AlertCircle size={14} /> {error}
                  </motion.div>
                )}

                <button
                  id="totp-submit" type="submit" className={styles.submitBtn}
                  disabled={loading || (totpMode === 'app' ? totpCode.length !== 6 : recoveryCode.length !== 9)}
                >
                  {loading ? <span className={styles.spinner} /> : 'Verify & Sign In'}
                </button>

                {/* Toggle between app code and recovery code */}
                <button type="button" className={styles.switchModeBtn}
                  onClick={totpMode === 'app' ? switchToRecovery : switchToApp}
                  disabled={loading}>
                  {totpMode === 'app'
                    ? 'Recovery code'
                    : 'Authenticator app'}
                </button>

                <button type="button" className={styles.backBtn} onClick={goBack} disabled={loading}>
                  ← Back to Sign In
                </button>

              </form>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}