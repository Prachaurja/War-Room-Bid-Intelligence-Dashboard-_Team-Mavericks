import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Lock, Palette, SlidersHorizontal, Bell,
  Database, Monitor, Shield, Users, Trash2,
  Camera, Eye, EyeOff, Check, ChevronRight,
  RefreshCw, Download, AlertTriangle, Zap,
  HardDrive, Wifi, Clock, LogOut, Mail, Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import ThemePreviewSelector from '../../components/theme/ThemePreviewSelector';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/auth.store';
import { useUIStore } from '../../store/ui.store';
import { useOverviewStats } from '../../hooks/useTenders';
import {
  useNotificationPreferences,
  type NotificationPreferences,
} from '../../hooks/useNotificationPreferences';
import {
  requestBrowserNotificationPermission,
  showBrowserNotification,
} from '../../utils/browserNotifications';
import { isAxiosError } from 'axios';
import apiClient from '../../api/client';
import styles from './SettingsPage.module.css';

// ── Section config ────────────────────────────────────────────
const SECTIONS = [
  { id: 'profile',      label: 'Profile',            icon: User,              group: 'Account'     },
  { id: 'password',     label: 'Password',           icon: Lock,              group: 'Account'     },
  { id: 'appearance',   label: 'Appearance',         icon: Palette,           group: 'Preferences' },
  { id: 'tender-prefs', label: 'Tender Preferences', icon: SlidersHorizontal, group: 'Preferences' },
  { id: 'alert-prefs',  label: 'Alert Preferences',  icon: Bell,              group: 'Preferences' },
  { id: 'display',      label: 'Display',            icon: Monitor,           group: 'Preferences' },
  { id: 'data-sources', label: 'Data Sources',       icon: Database,          group: 'System'      },
  { id: 'data-privacy', label: 'Data & Privacy',     icon: Trash2,            group: 'System'      },
  { id: 'security',     label: 'Security',           icon: Shield,            group: 'System'      },
  { id: 'team',         label: 'Team & Access',      icon: Users,             group: 'System'      },
] as const;

type SectionId = typeof SECTIONS[number]['id'];
const GROUPS = ['Account', 'Preferences', 'System'];

// ── localStorage helpers ──────────────────────────────────────
function getPref<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function setPref<T>(key: string, val: T) {
  localStorage.setItem(key, JSON.stringify(val));
}

// ── Notification channel config ───────────────────────────────
type ChannelKey = 'email' | 'sms' | 'push';
const CHANNEL_CONFIG: Record<ChannelKey, { label: string; sub: string; icon: React.ElementType }> = {
  email: { label: 'Email Alerts',          sub: 'Delivered to your inbox',      icon: Mail       },
  sms:   { label: 'SMS Alerts',            sub: 'Text messages to your phone',  icon: Smartphone },
  push:  { label: 'Browser Notifications', sub: 'Desktop push notifications',   icon: Bell       },
};

// ── Source meta ───────────────────────────────────────────────
const SOURCE_META: Record<string, { label: string; color: string }> = {
  austender:   { label: 'AusTender',   color: '#7C3AED' },
  tendersnet:  { label: 'Tenders.Net', color: '#10B981' },
  qld_tenders: { label: 'QLD Tenders', color: '#F59E0B' },
  nsw_etender: { label: 'NSW eTender', color: '#3B82F6' },
  manual:      { label: 'Manual',      color: '#EC4899' },
};

type DisplayPrefs = {
  dateFormat: string;
  currency: string;
  landingPage: string;
  density: string;
};

const DEFAULT_DISPLAY_PREFS: DisplayPrefs = {
  dateFormat: 'relative', currency: 'short',
  landingPage: 'home', density: 'comfortable',
};

const DISPLAY_SELECT_FIELDS: {
  key: keyof DisplayPrefs;
  label: string;
  options: { val: string; label: string }[];
}[] = [
  { key: 'dateFormat', label: 'Date Format', options: [
    { val: 'relative', label: 'Relative (3 days ago)' },
    { val: 'absolute', label: 'Absolute (01/05/2026)' },
  ]},
  { key: 'currency', label: 'Currency Format', options: [
    { val: 'short', label: 'Short ($1.2M)' },
    { val: 'full',  label: 'Full ($1,200,000)' },
  ]},
  { key: 'landingPage', label: 'Default Landing Page', options: [
    { val: 'home',     label: 'Home — Intelligence Map' },
    { val: 'overview', label: 'Overview — Dashboard' },
    { val: 'tenders',  label: 'Tenders — Bid List' },
  ]},
  { key: 'density', label: 'Card Density', options: [
    { val: 'comfortable', label: 'Comfortable' },
    { val: 'compact',     label: 'Compact' },
  ]},
];

function axiosErrorDetail(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined;
  const data = err.response?.data;
  if (data && typeof data === 'object' && data !== null && 'detail' in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === 'string') return detail;
  }
  return undefined;
}

// ─────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user }                    = useAuth();
  const { updateUser }              = useAuthStore();
  const { themeMode, setThemeMode } = useUIStore();
  const { data: stats }             = useOverviewStats();
  const { prefs, setPrefs }         = useNotificationPreferences();
  const [activeSection, setActive]  = useState<SectionId>('profile');

  // ── Per-user avatar key — scoped to user ID so avatars never cross between users ──
  const avatarKey = `wr_avatar_${user?.id ?? 'default'}`;

  // ── Profile ───────────────────────────────────────────────
  const [profileName,   setProfileName]   = useState(user?.name ?? '');
  const [profileSaving, setProfileSaving] = useState(false);

  // CHANGE 1: read avatar using per-user key
  const [avatarSrc, setAvatarSrc] = useState<string>(
    () => localStorage.getItem(`wr_avatar_${user?.id ?? 'default'}`) ?? user?.avatar ?? ''
  );
  const avatarRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setProfileName(user?.name ?? ''); }, [user?.name]);

  const initials = user?.name
    ?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? 'WR';

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      setAvatarSrc(src);
      // CHANGE 2: write under per-user key so different users don't share avatars
      localStorage.setItem(avatarKey, src);
      // CHANGE 3: sync to auth store so sidebar updates immediately

      toast.success('Avatar updated');
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async () => {
    if (!profileName.trim()) return toast.error('Name cannot be empty');
    setProfileSaving(true);
    try {
      await apiClient.patch('/auth/me', { name: profileName.trim() });
      updateUser({ name: profileName.trim() }); // ← remove avatar from here for now
      originalName.current = profileName.trim();
      toast.success('Profile Updated Successfully');
    } catch (err) {
      console.error('Profile Save Error:', err); // ← add this to see exact error
      // [Having error of not updating the Profile]
      toast.error('Failed to Update Profile');
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Password ──────────────────────────────────────────────
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew,     setPwNew]     = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving,  setPwSaving]  = useState(false);
  const [showPw,    setShowPw]    = useState({ current: false, new: false, confirm: false });

  const pwStrength = pwNew.length === 0 ? 0
    : pwNew.length < 8 ? 1
    : /[A-Z]/.test(pwNew) && /[0-9]/.test(pwNew) && /[^A-Za-z0-9]/.test(pwNew) ? 3
    : 2;

  const handlePasswordSave = async () => {
    if (!pwCurrent || !pwNew || !pwConfirm) return toast.error('Fill in All Password fields');
    if (pwNew.length < 8) return toast.error('Password Must be at Least 8 Characters');
    if (pwNew !== pwConfirm) return toast.error('Passwords Do Not Match');
    if (pwNew === pwCurrent) return toast.error("New Password Must be Different from Current Password");
    setPwSaving(true);
    try {
      await apiClient.post('/auth/change-password', {
        current_password: pwCurrent,
        new_password:     pwNew,
      });
      toast.success('Password Updated Successfully');
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
    } catch (err: unknown) {
      toast.error(axiosErrorDetail(err) ?? 'Failed to Update Password');
    } finally {
      setPwSaving(false);
    }
  };

  // Profile Reset Button:
  const originalName = useRef(user?.name ?? '');
<button className={styles.ghostBtn}
  onClick={() => setProfileName(originalName.current)}>Reset</button>

  // ── Notification channels ─────────────────────────────────
  const updateChannel = async (key: ChannelKey) => {
    const nextEnabled = !prefs[key];
    if (key === 'push' && nextEnabled) {
      const permission = await requestBrowserNotificationPermission();
      if (permission !== 'granted') {
        toast.error('Browser Notifications are Blocked', {
          description: permission === 'denied'
            ? 'Allow Notifications in Your Browser Settings.'
            : 'Permission is Required to Enable Browser Notifications.',
        });
        return;
      }
      showBrowserNotification('Browser notifications enabled', {
        body: 'You will now receive alert notifications in this browser.',
        tag:  'settings-browser-enabled',
      });
    }
    setPrefs((prev: NotificationPreferences) => ({ ...prev, [key]: nextEnabled }));
    toast.success(`${CHANNEL_CONFIG[key].label} ${nextEnabled ? 'enabled' : 'disabled'}`);
  };

  // ── Tender preferences ────────────────────────────────────
  const [tenderPrefs, setTenderPrefs] = useState(() => getPref('wr_tender_prefs', {
    defaultSector: '', defaultState: '', defaultSort: 'newest',
    defaultPageSize: '15', minValue: '',
  }));
  const saveTenderPrefs = () => {
    setPref('wr_tender_prefs', tenderPrefs);
    toast.success('Tender preferences saved');
  };

  // ── Display preferences ───────────────────────────────────
  const [displayPrefs, setDisplayPrefs] = useState<DisplayPrefs>(
    () => getPref('wr_display_prefs', DEFAULT_DISPLAY_PREFS),
  );
  const saveDisplayPrefs = (patch: Partial<DisplayPrefs>) => {
    const next = { ...displayPrefs, ...patch };
    setDisplayPrefs(next);
    setPref('wr_display_prefs', next);
    toast.success('Display Preferences Saved');
  };

  // ── Data & privacy ────────────────────────────────────────
  const clearHistory = () => {
    ['wr_stats_history','wr_stats_snapshot_ts','wr_last_total_tenders','wr_last_visit_ts']
      .forEach(k => localStorage.removeItem(k));
    toast.success('History Cleared');
  };
  const resetAllPrefs = () => {
    ['wr_tender_prefs','wr_alert_prefs','wr_display_prefs'].forEach(k => localStorage.removeItem(k));
    toast.success('All Preferences Reset to Defaults');
    window.location.reload();
  };
  const exportData = () => {
    const data = {
      exported_at:   new Date().toISOString(),
      user:          { name: user?.name, email: user?.email, role: user?.role },
      tender_prefs:  getPref('wr_tender_prefs', {}),
      display_prefs: getPref('wr_display_prefs', {}),
      notif_prefs:   prefs,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `warroom-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported');
  };

  return (
    <div className={`${styles.page} page-enter`}>

      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.heading}>Settings</h2>
          <p className={styles.headingSub}>Manage Your Profile, Workspace, and Preferences</p>
        </div>
      </div>

      <div className={styles.layout}>

        {/* ── Sidebar nav ── */}
        <nav className={styles.settingsNav}>
          {GROUPS.map(group => (
            <div key={group} className={styles.navGroup}>
              <p className={styles.navGroupLabel}>{group}</p>
              {SECTIONS.filter(s => s.group === group).map(section => (
                <button
                  key={section.id}
                  className={`${styles.navItem} ${activeSection === section.id ? styles.navItemActive : ''}`}
                  onClick={() => setActive(section.id)}
                >
                  <section.icon size={15} className={styles.navIcon} />
                  <span>{section.label}</span>
                  {activeSection === section.id && <ChevronRight size={13} className={styles.navChevron} />}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* ── Content ── */}
        <div className={styles.content}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0  }}
              exit={{    opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className={styles.section}
            >

              {/* ════ 1. PROFILE ════ */}
              {activeSection === 'profile' && (
                <>
                  <div className={styles.sectionHeader}>
                    <User size={18} className={styles.sectionIcon} />
                    <div>
                      <h3 className={styles.sectionTitle}>Profile</h3>
                      <p className={styles.sectionSub}>Edit the Profile Shown Across the Dashboard</p>
                    </div>
                  </div>
                  <div className={styles.card}>
                    <div className={styles.profileLayout}>
                      <div className={styles.avatarColumn}>
                        <div className={styles.avatar}>
                          {avatarSrc ? <img src={avatarSrc} alt="avatar" /> : initials}
                        </div>
                        <button className={styles.avatarBtn} onClick={() => avatarRef.current?.click()}>
                          <Camera size={13} /> Change Avatar
                        </button>
                        <input ref={avatarRef} type="file" accept="image/*"
                          hidden onChange={handleAvatarChange} />
                      </div>
                      <div>
                        <div className={styles.formGrid}>
                          <div className={styles.field}>
                            <label className={styles.label}>Full Name</label>
                            <input className={styles.input} value={profileName}
                              onChange={e => setProfileName(e.target.value)}
                              placeholder="Your full name" />
                          </div>
                          <div className={styles.field}>
                            <label className={styles.label}>Login Email</label>
                            <input className={`${styles.input} ${styles.inputReadonly}`}
                              value={user?.email ?? ''} readOnly />
                            <p className={styles.helpText}>Email cannot be changed here</p>
                          </div>
                          <div className={`${styles.field} ${styles.fieldFull}`}>
                            <label className={styles.label}>Role</label>
                            <input className={`${styles.input} ${styles.inputReadonly}`}
                              value={user?.role ?? ''} readOnly />
                            <p className={styles.helpText}>Role is managed by your administrator</p>
                          </div>
                        </div>
                        <div className={styles.actionRow}>
                          <button className={styles.ghostBtn}
                            onClick={() => setProfileName(user?.name ?? '')}>
                            Reset
                          </button>
                          <button className={styles.primaryBtn}
                            onClick={handleProfileSave} disabled={profileSaving}>
                            {profileSaving
                              ? <><RefreshCw size={13} className={styles.spinning} /> Saving…</>
                              : <><Check size={13} /> Save Profile</>}
                          </button>
                        </div>
                        <div className={styles.metaLine}>
                          <span className={styles.metaBadge}>Role: {user?.role ?? 'analyst'}</span>
                          <span>Signed in as {user?.email ?? 'unknown'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ════ 2. PASSWORD ════ */}
              {activeSection === 'password' && (
                <>
                  <div className={styles.sectionHeader}>
                    <Lock size={18} className={styles.sectionIcon} />
                    <div>
                      <h3 className={styles.sectionTitle}>Password</h3>
                      <p className={styles.sectionSub}>Update your Account Password</p>
                    </div>
                  </div>
                  <div className={styles.card}>
                    <div className={styles.formGrid}>
                      <div className={`${styles.field} ${styles.fieldFull}`}>
                        <label className={styles.label}>Current Password</label>
                        <div className={styles.inputWrap}>
                          <input className={styles.input}
                            type={showPw.current ? 'text' : 'password'}
                            value={pwCurrent} onChange={e => setPwCurrent(e.target.value)}
                            placeholder="Enter current password" />
                          <button className={styles.inputToggle} type="button"
                            onClick={() => setShowPw(p => ({ ...p, current: !p.current }))}>
                            {showPw.current ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>New Password</label>
                        <div className={styles.inputWrap}>
                          <input className={styles.input}
                            type={showPw.new ? 'text' : 'password'}
                            value={pwNew} onChange={e => setPwNew(e.target.value)}
                            placeholder="At least 8 characters" />
                          <button className={styles.inputToggle} type="button"
                            onClick={() => setShowPw(p => ({ ...p, new: !p.new }))}>
                            {showPw.new ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Confirm Password</label>
                        <div className={styles.inputWrap}>
                          <input className={styles.input}
                            type={showPw.confirm ? 'text' : 'password'}
                            value={pwConfirm} onChange={e => setPwConfirm(e.target.value)}
                            placeholder="Repeat new password" />
                          <button className={styles.inputToggle} type="button"
                            onClick={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))}>
                            {showPw.confirm ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                    {pwNew.length > 0 && (
                      <div className={styles.strengthWrap}>
                        <div className={styles.strengthBars}>
                          {[1,2,3].map(i => (
                            <div key={i} className={styles.strengthBar} style={{
                              background: i <= pwStrength
                                ? pwStrength === 1 ? '#EF4444'
                                : pwStrength === 2 ? '#F59E0B' : '#10B981'
                                : 'var(--bg-overlay)',
                            }} />
                          ))}
                        </div>
                        <span className={styles.strengthLabel}>
                          {pwStrength === 1 ? 'Weak' : pwStrength === 2 ? 'Good' : 'Strong'}
                        </span>
                      </div>
                    )}
                    <div className={styles.actionRow}>
                      <button className={styles.ghostBtn}
                        onClick={() => { setPwCurrent(''); setPwNew(''); setPwConfirm(''); }}>
                        Clear
                      </button>
                      <button className={styles.primaryBtn}
                        onClick={handlePasswordSave}
                        disabled={pwSaving || !pwCurrent || !pwNew || !pwConfirm}>
                        {pwSaving
                          ? <><RefreshCw size={13} className={styles.spinning} /> Updating…</>
                          : <><Lock size={13} /> Update Password</>}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ════ 3. APPEARANCE ════ */}
              {activeSection === 'appearance' && (
                <>
                  <div className={styles.sectionHeader}>
                    <Palette size={18} className={styles.sectionIcon} />
                    <div>
                      <h3 className={styles.sectionTitle}>Appearance</h3>
                      <p className={styles.sectionSub}>Choose a Theme and Preview it Before Applying</p>
                    </div>
                  </div>
                  <div className={styles.card}>
                    <ThemePreviewSelector selectedTheme={themeMode} onSelect={setThemeMode} />
                  </div>
                </>
              )}

              {/* ════ 4. TENDER PREFERENCES ════ */}
              {activeSection === 'tender-prefs' && (
                <>
                  <div className={styles.sectionHeader}>
                    <SlidersHorizontal size={18} className={styles.sectionIcon} />
                    <div>
                      <h3 className={styles.sectionTitle}>Tender Preferences</h3>
                      <p className={styles.sectionSub}>Default Filters Applied When Opening the Tenders Page</p>
                    </div>
                  </div>
                  <div className={styles.card}>
                    <div className={styles.formGrid}>
                      <div className={styles.field}>
                        <label className={styles.label}>Default Sector</label>
                        <select className={styles.select}
                          value={tenderPrefs.defaultSector}
                          onChange={e => setTenderPrefs(p => ({ ...p, defaultSector: e.target.value }))}>
                          <option value="">All Sectors</option>
                          <option value="facility_management">Facility Management</option>
                          <option value="construction">Construction</option>
                          <option value="cleaning">Cleaning</option>
                          <option value="it_services">IT Services</option>
                          <option value="healthcare">Healthcare</option>
                          <option value="transportation">Transportation</option>
                        </select>
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Default State</label>
                        <select className={styles.select}
                          value={tenderPrefs.defaultState}
                          onChange={e => setTenderPrefs(p => ({ ...p, defaultState: e.target.value }))}>
                          <option value="">All States</option>
                          {['NSW','VIC','QLD','WA','SA','TAS','NT','ACT'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Default Sort</label>
                        <select className={styles.select}
                          value={tenderPrefs.defaultSort}
                          onChange={e => setTenderPrefs(p => ({ ...p, defaultSort: e.target.value }))}>
                          <option value="newest">Newest First</option>
                          <option value="closing">Closing Soon</option>
                          <option value="value_desc">Highest Value</option>
                          <option value="value_asc">Lowest Value</option>
                        </select>
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Default Page Size</label>
                        <select className={styles.select}
                          value={tenderPrefs.defaultPageSize}
                          onChange={e => setTenderPrefs(p => ({ ...p, defaultPageSize: e.target.value }))}>
                          {['10','15','25','50'].map(n => (
                            <option key={n} value={n}>{n} per page</option>
                          ))}
                        </select>
                      </div>
                      <div className={`${styles.field} ${styles.fieldFull}`}>
                        <label className={styles.label}>Minimum Contract Value</label>
                        <input className={styles.input} type="number"
                          placeholder="e.g. 100000 — leave empty for all values"
                          value={tenderPrefs.minValue}
                          onChange={e => setTenderPrefs(p => ({ ...p, minValue: e.target.value }))} />
                      </div>
                    </div>
                    <div className={styles.actionRow}>
                      <button className={styles.ghostBtn} onClick={() => {
                        const d = { defaultSector:'', defaultState:'', defaultSort:'newest', defaultPageSize:'15', minValue:'' };
                        setTenderPrefs(d); setPref('wr_tender_prefs', d); toast.success('Reset to Defaults');
                      }}>Reset</button>
                      <button className={styles.primaryBtn} onClick={saveTenderPrefs}>
                        <Check size={13} /> Save Preferences
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ════ 5. ALERT PREFERENCES ════ */}
              {activeSection === 'alert-prefs' && (
                <>
                  <div className={styles.sectionHeader}>
                    <Bell size={18} className={styles.sectionIcon} />
                    <div>
                      <h3 className={styles.sectionTitle}>Alert Preferences</h3>
                      <p className={styles.sectionSub}>Control How and When Alerts Reach You</p>
                    </div>
                  </div>
                  <div className={styles.card}>
                    <p className={styles.cardLabel}>Notification Channels</p>
                    <div className={styles.channelList}>
                      {(Object.keys(CHANNEL_CONFIG) as ChannelKey[]).map(key => {
                        const Icon = CHANNEL_CONFIG[key].icon;
                        return (
                          <div key={key} className={styles.channelRow}>
                            <div className={styles.channelLeft}>
                              <div className={styles.channelIcon}><Icon size={16} /></div>
                              <div>
                                <p className={styles.channelLabel}>{CHANNEL_CONFIG[key].label}</p>
                                <p className={styles.channelSub}>{CHANNEL_CONFIG[key].sub}</p>
                              </div>
                            </div>
                            <button
                              className={`${styles.toggle} ${prefs[key] ? styles.toggleOn : ''}`}
                              onClick={() => void updateChannel(key)}
                            >
                              <span className={styles.toggleThumb} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* ════ 6. DISPLAY ════ */}
              {activeSection === 'display' && (
                <>
                  <div className={styles.sectionHeader}>
                    <Monitor size={18} className={styles.sectionIcon} />
                    <div>
                      <h3 className={styles.sectionTitle}>Display Preferences</h3>
                      <p className={styles.sectionSub}>Customise How Information is Presented</p>
                    </div>
                  </div>
                  <div className={styles.card}>
                    <div className={styles.formGrid}>
                      {DISPLAY_SELECT_FIELDS.map(item => (
                        <div key={item.key} className={styles.field}>
                          <label className={styles.label}>{item.label}</label>
                          <select className={styles.select}
                            value={displayPrefs[item.key]}
                            onChange={e => saveDisplayPrefs({ [item.key]: e.target.value })}>
                            {item.options.map(o => (
                              <option key={o.val} value={o.val}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ════ 7. DATA SOURCES ════ */}
              {activeSection === 'data-sources' && (
                <>
                  <div className={styles.sectionHeader}>
                    <Database size={18} className={styles.sectionIcon} />
                    <div>
                      <h3 className={styles.sectionTitle}>Data Sources</h3>
                      <p className={styles.sectionSub}>Active Ingestion Feeds and Coverage</p>
                    </div>
                  </div>
                  <div className={styles.card}>
                    {Object.entries(stats?.sources ?? {}).length === 0 ? (
                      <p className={styles.emptyState}>No sources connected yet</p>
                    ) : (
                      Object.entries(stats?.sources ?? {}).sort((a,b) => b[1]-a[1]).map(([key, count]) => {
                        const meta  = SOURCE_META[key] ?? { label: key, color: '#6B7280' };
                        const total = Object.values(stats?.sources ?? {}).reduce((s,v) => s+v, 0);
                        const pct   = total > 0 ? Math.round((count/total)*100) : 0;
                        return (
                          <div key={key} className={styles.sourceRow}>
                            <div className={styles.sourceDot} style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />
                            <div className={styles.sourceInfo}>
                              <p className={styles.sourceLabel}>{meta.label}</p>
                              <div className={styles.sourceBarWrap}>
                                <div className={styles.sourceBarFill} style={{ width: `${pct}%`, background: meta.color }} />
                              </div>
                            </div>
                            <div className={styles.sourceStats}>
                              <span style={{ color: meta.color, fontWeight: 700, fontSize: 14 }}>{count.toLocaleString()}</span>
                              <span className={styles.sourcePct}>{pct}%</span>
                            </div>
                            <Wifi size={13} style={{ color: '#10B981', flexShrink: 0 }} />
                          </div>
                        );
                      })
                    )}
                    <div className={styles.sourceFooter}>
                      <HardDrive size={13} style={{ color: 'var(--text-dim)' }} />
                      <span className={styles.sourceFooterText}>
                        {Object.values(stats?.sources ?? {}).reduce((s,v)=>s+v,0).toLocaleString()} total tenders · {Object.keys(stats?.sources ?? {}).length} sources
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* ════ 8. DATA & PRIVACY ════ */}
              {activeSection === 'data-privacy' && (
                <>
                  <div className={styles.sectionHeader}>
                    <Trash2 size={18} className={styles.sectionIcon} />
                    <div>
                      <h3 className={styles.sectionTitle}>Data & Privacy</h3>
                      <p className={styles.sectionSub}>Manage Your Local Data and Preferences</p>
                    </div>
                  </div>
                  {[
                    { title: 'Clear Trend History', sub: 'Removes the 30-day stats history used for change indicators on the Overview page.', icon: Clock,     btn: 'Clear History', color: '#F59E0B', action: clearHistory  },
                    { title: 'Reset All Preferences', sub: 'Resets tender filters, display preferences to defaults. Page will reload.',         icon: RefreshCw, btn: 'Reset',         color: '#3B82F6', action: resetAllPrefs },
                    { title: 'Export My Data', sub: 'Download a JSON file of your settings, preferences, and profile.',                         icon: Download,  btn: 'Export',        color: '#10B981', action: exportData    },
                  ].map(item => (
                    <div key={item.title} className={styles.card}>
                      <div className={styles.actionRow}>
                        <div className={styles.actionIcon} style={{ background: item.color+'18', color: item.color }}>
                          <item.icon size={16} />
                        </div>
                        <div className={styles.actionInfo}>
                          <p className={styles.actionTitle}>{item.title}</p>
                          <p className={styles.actionSub}>{item.sub}</p>
                        </div>
                        <button className={styles.btnOutline}
                          style={{ borderColor: item.color+'50', color: item.color }}
                          onClick={item.action}>
                          {item.btn}
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* ════ 9. SECURITY ════ */}
              {activeSection === 'security' && (
                <>
                  <div className={styles.sectionHeader}>
                    <Shield size={18} className={styles.sectionIcon} />
                    <div>
                      <h3 className={styles.sectionTitle}>Security</h3>
                      <p className={styles.sectionSub}>Account Security and Session Management</p>
                    </div>
                  </div>
                  <div className={styles.card}>
                    <div className={styles.securityGrid}>
                      {[
                        { label: 'Account Status', value: 'Active',                color: '#10B981' },
                        { label: 'Auth Method',    value: 'Email & Password',       color: 'var(--text-secondary)' },
                        { label: 'Role',           value: user?.role ?? 'analyst',  color: '#7C3AED' },
                        { label: 'Token',          value: localStorage.getItem('wr_token') ? 'Stored Locally' : 'Not Found', color: 'var(--text-secondary)' },
                      ].map(item => (
                        <div key={item.label} className={styles.securityItem}>
                          <p className={styles.securityLabel}>{item.label}</p>
                          <p className={styles.securityValue} style={{ color: item.color }}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {[
                    { title: 'Two-Factor Authentication', sub: '2FA via authenticator app — coming in Phase 3', icon: AlertTriangle, color: '#EF4444' },
                    { title: 'Active Sessions',           sub: 'Session tracking requires a sessions table — coming in Phase 3', icon: LogOut, color: '#EF4444' },
                  ].map(item => (
                    <div key={item.title} className={styles.card}>
                      <div className={styles.actionRow}>
                        <div className={styles.actionIcon} style={{ background: 'rgba(239,68,68,0.1)', color: item.color }}>
                          <item.icon size={16} />
                        </div>
                        <div className={styles.actionInfo}>
                          <p className={styles.actionTitle}>{item.title}</p>
                          <p className={styles.actionSub}>{item.sub}</p>
                        </div>
                        <span className={styles.comingSoonBadge}>Phase 3</span>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* ════ 10. TEAM & ACCESS ════ */}
              {activeSection === 'team' && (
                <>
                  <div className={styles.sectionHeader}>
                    <Users size={18} className={styles.sectionIcon} />
                    <div>
                      <h3 className={styles.sectionTitle}>Team & Access</h3>
                      <p className={styles.sectionSub}>Manage Team Members and Roles</p>
                    </div>
                  </div>
                  <div className={styles.card}>
                    <div className={styles.teamMember}>
                      <div className={styles.avatar} style={{ width: 44, height: 44, fontSize: 15, borderRadius: 12 }}>
                        {avatarSrc
                          ? <img src={avatarSrc} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          : initials}
                      </div>
                      <div className={styles.teamInfo}>
                        <p className={styles.teamName}>{user?.name ?? 'Analyst'}</p>
                        <p className={styles.teamEmail}>{user?.email ?? ''}</p>
                      </div>
                      <span className={styles.roleBadge} style={{
                        background: user?.role === 'admin' ? 'rgba(124,58,237,0.15)' : 'rgba(16,185,129,0.15)',
                        color:      user?.role === 'admin' ? '#A78BFA' : '#34D399',
                        border:     `1px solid ${user?.role === 'admin' ? '#7C3AED40' : '#10B98140'}`,
                      }}>
                        {user?.role ?? 'analyst'}
                      </span>
                      <span className={styles.youBadge}>You</span>
                    </div>
                  </div>
                  {[
                    { title: 'Invite Team Members', sub: 'Multi-user management and email invitations — coming in Phase 3', icon: Users, color: '#3B82F6' },
                    { title: 'API Key Management',  sub: 'Generate API keys for external integrations — coming in Phase 3', icon: Zap,   color: '#7C3AED' },
                  ].map(item => (
                    <div key={item.title} className={styles.card}>
                      <div className={styles.actionRow}>
                        <div className={styles.actionIcon} style={{ background: item.color+'18', color: item.color }}>
                          <item.icon size={16} />
                        </div>
                        <div className={styles.actionInfo}>
                          <p className={styles.actionTitle}>{item.title}</p>
                          <p className={styles.actionSub}>{item.sub}</p>
                        </div>
                        <span className={styles.comingSoonBadge}>Phase 3</span>
                      </div>
                    </div>
                  ))}
                </>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}