import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, ImagePlus, KeyRound, Mail, Save, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import ThemePreviewSelector from '../../components/theme/ThemePreviewSelector';
import { useAuthStore } from '../../store/auth.store';
import { useUIStore } from '../../store/ui.store';
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences';
import {
  requestBrowserNotificationPermission,
  showBrowserNotification,
} from '../../utils/browserNotifications';
import styles from './SettingsPage.module.css';

type ChannelKey = 'email' | 'sms' | 'push';

const CHANNEL_CONFIG: Record<ChannelKey, { label: string; sub: string; icon: typeof Mail }> = {
  email: { label: 'Email Alerts', sub: 'Delivered to your inbox', icon: Mail },
  sms: { label: 'SMS Alerts', sub: 'Text messages to your phone', icon: Smartphone },
  push: { label: 'Browser', sub: 'Desktop browser notifications', icon: Bell },
};

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const { themeMode, setThemeMode } = useUIStore();
  const { prefs, setPrefs } = useNotificationPreferences();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    avatar: user?.avatar ?? '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  useEffect(() => {
    setProfileForm({
      name: user?.name ?? '',
      email: user?.email ?? '',
      avatar: user?.avatar ?? '',
    });
  }, [user]);

  const initials = useMemo(() => {
    if (profileForm.name.trim()) {
      return profileForm.name
        .split(' ')
        .map((token) => token[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }

    return 'WR';
  }, [profileForm.name]);

  const updateChannel = async (key: ChannelKey) => {
    const nextEnabled = !prefs[key];

    if (key === 'push' && nextEnabled) {
      const permission = await requestBrowserNotificationPermission();

      if (permission !== 'granted') {
        toast.error('Browser notifications are blocked', {
          description: permission === 'denied'
            ? 'Allow notifications in your browser settings to enable this channel.'
            : 'Permission is required before browser notifications can be enabled.',
        });
        return;
      }

      showBrowserNotification('Browser notifications enabled', {
        body: 'You will now receive new alert notifications in this browser.',
        tag: 'settings-browser-enabled',
      });
    }

    setPrefs((prev) => ({ ...prev, [key]: nextEnabled }));
    toast.success(`${CHANNEL_CONFIG[key].label} ${nextEnabled ? 'enabled' : 'disabled'}`);
  };

  const handleAvatarPick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setProfileForm((prev) => ({ ...prev, avatar: typeof reader.result === 'string' ? reader.result : prev.avatar }));
    };
    reader.readAsDataURL(file);
  };

  const resetProfile = () => {
    setProfileForm({
      name: user?.name ?? '',
      email: user?.email ?? '',
      avatar: user?.avatar ?? '',
    });
  };

  const saveProfile = () => {
    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    updateUser({
      name: profileForm.name.trim(),
      email: profileForm.email.trim(),
      avatar: profileForm.avatar || undefined,
    });
    toast.success('Profile updated locally');
  };

  const handlePasswordChange = () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Fill in all password fields');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }

    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });

    toast.message('Password form is ready', {
      description: 'A backend change-password API is still required to update the real account password.',
    });
  };

  return (
    <div className={`${styles.page} page-enter`}>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.heading}>Settings</h2>
          <p className={styles.headingSub}>Manage your profile, workspace appearance, and notification channels.</p>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.mainColumn}>
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle}>Profile</h3>
                <p className={styles.sectionSub}>Edit the local profile shown across the dashboard.</p>
              </div>
            </div>

            <div className={styles.profileLayout}>
              <div className={styles.avatarColumn}>
                <div className={styles.avatar}>
                  {profileForm.avatar ? <img src={profileForm.avatar} alt="Profile avatar" /> : initials}
                </div>
                <button className={styles.avatarBtn} onClick={handleAvatarPick}>
                  <ImagePlus size={14} />
                  Change avatar
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleAvatarChange}
                />
              </div>

              <div>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label className={styles.label}>User Name</label>
                    <input
                      className={styles.input}
                      value={profileForm.name}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Login Email</label>
                    <input
                      className={styles.input}
                      type="email"
                      value={profileForm.email}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                    />
                  </div>
                  <div className={`${styles.field} ${styles.fieldFull}`}>
                    <label className={styles.label}>Avatar Preview Source</label>
                    <input
                      className={styles.input}
                      value={profileForm.avatar}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, avatar: event.target.value }))}
                      placeholder="Paste an image URL or upload a local image"
                    />
                    <span className={styles.helpText}>Changes are saved only in this browser session storage.</span>
                  </div>
                </div>

                <div className={styles.actionRow}>
                  <button className={styles.ghostBtn} onClick={resetProfile}>Reset</button>
                  <button className={styles.primaryBtn} onClick={saveProfile}>
                    <Save size={14} />
                    Save profile
                  </button>
                </div>

                <div className={styles.metaLine}>
                  <span className={styles.metaBadge}>Role: {user?.role ?? 'analyst'}</span>
                  <span>Signed in as {user?.email ?? 'unknown user'}</span>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle}>Password</h3>
                <p className={styles.sectionSub}>Prepare a password update from Settings.</p>
              </div>
              <div className={styles.sectionIcon}>
                <KeyRound size={16} />
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label}>Current Password</label>
                <input
                  className={styles.input}
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                  placeholder="Enter current password"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>New Password</label>
                <input
                  className={styles.input}
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                  placeholder="At least 8 characters"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Confirm Password</label>
                <input
                  className={styles.input}
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  placeholder="Repeat new password"
                />
              </div>
            </div>

            <div className={styles.actionRow}>
              <button
                className={styles.ghostBtn}
                onClick={() => setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })}
              >
                Clear
              </button>
              <button className={styles.primaryBtn} onClick={handlePasswordChange}>
                <KeyRound size={14} />
                Update password
              </button>
            </div>
          </section>
        </div>

        <div className={styles.sideColumn}>
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle}>Notification Channels</h3>
                <p className={styles.sectionSub}>Control how alerts reach you on this device.</p>
              </div>
            </div>

            <div className={styles.channelList}>
              {(Object.keys(CHANNEL_CONFIG) as ChannelKey[]).map((key) => {
                const Icon = CHANNEL_CONFIG[key].icon;

                return (
                  <div key={key} className={styles.channelRow}>
                    <div className={styles.channelLeft}>
                      <div className={styles.channelIcon}>
                        <Icon size={16} />
                      </div>
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
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle}>Appearance</h3>
                <p className={styles.sectionSub}>Choose a theme and preview it before applying.</p>
              </div>
            </div>

            <ThemePreviewSelector selectedTheme={themeMode} onSelect={setThemeMode} />
          </section>
        </div>
      </div>
    </div>
  );
}
