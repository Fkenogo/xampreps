import { Notification } from '../types';

export const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    userId: '1',
    text: 'Welcome to Msomesa! Start your first exam to begin your learning journey.',
    date: new Date().toISOString(),
    read: false
  }
];
