import { useEffect, useState } from 'react';
import { loadPref, savePref } from '../utils/storage';

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
}

const PREF_KEY = 'war_room_notif_prefs';
const PREF_EVENT = 'war-room:notif-prefs-changed';
const DEFAULT_PREFS: NotificationPreferences = { email: true, sms: false, push: true };

export function getNotificationPreferences(): NotificationPreferences {
  return loadPref(PREF_KEY, DEFAULT_PREFS);
}

export function setNotificationPreferences(next: NotificationPreferences): void {
  savePref(PREF_KEY, next);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<NotificationPreferences>(PREF_EVENT, { detail: next }));
  }
}

export function useNotificationPreferences() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => getNotificationPreferences());

  useEffect(() => {
    const handleStorageSync = () => {
      setPrefs(getNotificationPreferences());
    };

    const handleCustomSync = (event: Event) => {
      const detail = (event as CustomEvent<NotificationPreferences>).detail;
      setPrefs(detail ?? getNotificationPreferences());
    };

    window.addEventListener('storage', handleStorageSync);
    window.addEventListener(PREF_EVENT, handleCustomSync as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener(PREF_EVENT, handleCustomSync as EventListener);
    };
  }, []);

  const updatePrefs = (updater: NotificationPreferences | ((prev: NotificationPreferences) => NotificationPreferences)) => {
    setPrefs((prev) => {
      const next = typeof updater === 'function'
        ? (updater as (value: NotificationPreferences) => NotificationPreferences)(prev)
        : updater;
      setNotificationPreferences(next);
      return next;
    });
  };

  return { prefs, setPrefs: updatePrefs };
}
