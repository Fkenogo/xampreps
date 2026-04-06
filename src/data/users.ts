import { User } from '../types';

export const mockUsers: User[] = [
  { 
    id: '1', 
    name: 'Demo Student', 
    email: 'student@demo.com', 
    role: 'student', 
    password: 'demo123',
    level: 'UCE',
    school: 'Kampala High School',
    xp: 1250,
    streak: 5,
    achievements: ['First Steps', 'High Scorer'],
    questionHistory: [],
    studyReminders: []
  },
  { 
    id: '2', 
    name: 'Demo Parent', 
    email: 'parent@demo.com', 
    role: 'parent', 
    password: 'demo123',
    phone: '+256 700 123456',
    subscription: { plan: 'Premium', billingHistory: [] }
  },
  { 
    id: '3', 
    name: 'Demo School', 
    email: 'school@demo.com', 
    role: 'school', 
    password: 'demo123',
    contactPerson: 'John Mukasa',
    phone: '+256 700 789012',
    subscription: { plan: 'Free', billingHistory: [] }
  },
  { 
    id: '4', 
    name: 'Admin User', 
    email: 'admin@xampreps.com', 
    role: 'admin', 
    password: 'admin123'
  },
];
