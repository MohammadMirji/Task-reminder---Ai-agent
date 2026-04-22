import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';
const VAPID_PUBLIC_KEY = 'BNa5kcErqL5xnvR0rJfLNyyikzAebvpBhKzeZ73PKuRGgLm9ZBNQ06swigH3s2vrEfa8LJB3B-MR5Jh7A_muXLM'; // from your .env

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