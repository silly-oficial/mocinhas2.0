import { useState, useEffect } from 'react';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Seu navegador não suporta notificações push nativas.');
      return false;
    }
    const res = await Notification.requestPermission();
    setPermission(res);
    if (res === 'granted') {
      new Notification('mocinhas ', {
        body: 'Notificações ativadas com sucesso! Você receberá alertas mesmo com o app em segundo plano.',
        icon: '/favicon.ico'
      });
      return true;
    }
    return false;
  };

  const showNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico'
        });
      } catch (e) {
        console.error('Push notification error:', e);
      }
    }
  };

  return { permission, requestPermission, showNotification };
}
