export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function showBrowserNotification(
  title: string,
  body: string,
  onClick?: () => void,
): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;
  const notification = new Notification(title, { body, icon: '/favicon.ico' });
  if (onClick) {
    notification.onclick = () => {
      onClick();
      notification.close();
    };
  }
}
