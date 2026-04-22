import { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL;
const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;

// Convert VAPID public key to the format browsers expect
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function useNotifications() { // ← no token parameter
  const [subscribed, setSubscribed] = useState(false);

  // Read token fresh every time it's needed
  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    if ('serviceWorker' in navigator && Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setSubscribed(!!sub);
        });
      });
    }
  }, []);

const subscribe = async (silent = false) => {
  try {
    if (!API) {
      if (!silent) alert('API is not configured.');
      return;
    }

    if (!VAPID_PUBLIC_KEY) {
      if (!silent) alert('Push notifications are not configured.');
      return;
    }

    const reg = await navigator.serviceWorker.register('/sw.js');
    const perm = await Notification.requestPermission();

    if (perm !== 'granted') {
      if (!silent) alert('Notification permission denied');
      return;
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const currentToken = getToken();
    await axios.post(
      `${API}/notifications/subscribe`,
      { subscription: sub },
      { headers: { Authorization: `Bearer ${currentToken}` } }
    );

    setSubscribed(true);
  } catch (err) {
    if (!silent) console.error('Subscription failed:', err.response?.data || err.message);
  }
};

  const unsubscribe = async () => {
    try {
      if (!API) return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();

      const currentToken = getToken();
      await axios.delete(`${API}/notifications/unsubscribe`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });

      setSubscribed(false);
    } catch (err) {
      console.error('Unsubscribe error:', err.message);
    }
  };

  return { subscribed, subscribe, unsubscribe };
}