import { supabase } from './supabase';

const urlB64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const subscribeToPushNotifications = async (userId: string) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported by your browser.');
  }

  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permission not granted for push notifications.');
  }

  // Get service worker registration
  const registration = await navigator.serviceWorker.ready;

  // Subscribe to push
  const applicationServerKey = urlB64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY);
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });

  // Extract keys
  const subscriptionJson = subscription.toJSON();
  if (!subscriptionJson.keys) {
    throw new Error('Failed to get subscription keys.');
  }

  // Save to Supabase
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh_key: subscriptionJson.keys.p256dh,
      auth_key: subscriptionJson.keys.auth,
    },
    { onConflict: 'endpoint' }
  );

  if (error) {
    console.error('Error saving push subscription:', error);
    throw new Error('Failed to save push subscription to the server.');
  }

  return true;
};

export const unsubscribeFromPushNotifications = async (userId: string) => {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  
  if (subscription) {
    await subscription.unsubscribe();
    
    // Remove from Supabase
    await supabase.from('push_subscriptions').delete().match({ 
      endpoint: subscription.endpoint,
      user_id: userId
    });
  }
};

export const getPushSubscriptionStatus = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (!registrations || registrations.length === 0) {
      return false;
    }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (error) {
    console.error('Error getting push subscription status:', error);
    return false;
  }
};
