import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { collection, query, onSnapshot, orderBy, limit, where, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from './AuthContext';
import { ROLES } from '../lib/offices';
import { createSnapshotErrorHandler } from '../lib/firestoreErrorHandler';
import toast from 'react-hot-toast';

interface NotificationData {
  id: string;
  type: 'review' | 'application' | 'update';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string;
}

interface NotificationContextType {
  notifications: NotificationData[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReviewTime, setLastReviewTime] = useState<Date>(new Date());
  const [lastApplicationTime, setLastApplicationTime] = useState<Date>(new Date());
  const [userSettings, setUserSettings] = useState<any>(null);

  // Load user settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;

      try {
        const userId = user.id || (auth.currentUser ? auth.currentUser.uid : undefined);
        if (!userId) return;

        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserSettings(userData.notificationSettings || {});
        }
      } catch (error) {
        console.error('Error loading user settings:', error);
      }
    };

    loadSettings();
  }, [user]);

  // Request browser notification permission if enabled
  useEffect(() => {
    if (userSettings?.browserNotifications && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [userSettings]);

  // Listen for new customer reviews
  useEffect(() => {
    if (!user || !userSettings?.newReviews) return;

    let q;

    // Regional Engineers and Developers see all reviews
    if (user.role === ROLES.REGIONAL_ENGINEER || user.role === ROLES.DEVELOPER) {
      q = query(
        collection(db, 'customerReviews'),
        orderBy('submittedDate', 'desc'),
        limit(20)
      );
    } else {
      // Acting Officers only see reviews from their office
      q = query(
        collection(db, 'customerReviews'),
        where('office', '==', user.office),
        orderBy('submittedDate', 'desc'),
        limit(20)
      );
    }

    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const reviewData = change.doc.data();
          const reviewTime = reviewData.submittedDate?.toDate() || new Date();

          // Only notify for reviews added after component mount
          if (reviewTime > lastReviewTime) {
            const notification: NotificationData = {
              id: `review-${change.doc.id}`,
              type: 'review',
              title: '⭐ New Customer Review',
              message: `${reviewData.customerName} from ${reviewData.office} left a ${reviewData.rating}-star review`,
              timestamp: reviewTime,
              read: false,
              link: '/reviews'
            };

            setNotifications(prev => [notification, ...prev]);

            // Show toast notification
            toast.success(notification.title, {
              icon: '⭐',
              duration: 4000
            });

            // Send browser notification
            if (userSettings.browserNotifications && Notification.permission === 'granted') {
              new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: notification.id
              });
            }
          }
        }
      });

      // Update last review time to current time after processing
      setLastReviewTime(new Date());
    },
    createSnapshotErrorHandler('Customer reviews listener')
    );

    return () => unsubscribe();
  }, [user, userSettings, lastReviewTime]);

  // Listen for new applications
  useEffect(() => {
    if (!user || !userSettings?.newApplications) return;

    let q;

    // Regional Engineers and Developers see all applications
    if (user.role === ROLES.REGIONAL_ENGINEER || user.role === ROLES.DEVELOPER) {
      q = query(
        collection(db, 'applications'),
        orderBy('submittedDate', 'desc'),
        limit(20)
      );
    } else {
      // Acting Officers only see applications from their office
      q = query(
        collection(db, 'applications'),
        where('office', '==', user.office),
        orderBy('submittedDate', 'desc'),
        limit(20)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const appData = change.doc.data();
          const appTime = appData.submittedDate?.toDate() || new Date();

          // Only notify for applications added after component mount
          if (appTime > lastApplicationTime) {
            const notification: NotificationData = {
              id: `app-${change.doc.id}`,
              type: 'application',
              title: '📄 New Application Received',
              message: `${appData.applicantName} (${appData.fileNumber}) - ${appData.office}`,
              timestamp: appTime,
              read: false,
              link: `/application/${change.doc.id}`
            };

            setNotifications(prev => [notification, ...prev]);

            // Show toast notification
            toast.success(notification.title, {
              icon: '📄',
              duration: 4000
            });

            // Send browser notification
            if (userSettings.browserNotifications && Notification.permission === 'granted') {
              new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: notification.id
              });
            }
          }
        }
      });

      // Update last application time to current time after processing
      setLastApplicationTime(new Date());
    },
    createSnapshotErrorHandler('New applications listener')
    );

    return () => unsubscribe();
  }, [user, userSettings, lastApplicationTime]);

  // Listen for application updates
  useEffect(() => {
    if (!user || !userSettings?.applicationUpdates) return;

    let q;

    // Regional Engineers and Developers see all applications
    if (user.role === ROLES.REGIONAL_ENGINEER || user.role === ROLES.DEVELOPER) {
      q = query(
        collection(db, 'applications'),
        orderBy('lastUpdated', 'desc'),
        limit(20)
      );
    } else {
      // Acting Officers only see applications from their office
      q = query(
        collection(db, 'applications'),
        where('office', '==', user.office),
        orderBy('lastUpdated', 'desc'),
        limit(20)
      );
    }

    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const appData = change.doc.data();
            const updateTime = appData.lastUpdated?.toDate() || new Date();

            const notification: NotificationData = {
              id: `update-${change.doc.id}-${updateTime.getTime()}`,
              type: 'update',
              title: '🔄 Application Updated',
              message: `${appData.applicantName} (${appData.fileNumber}) - Status: ${appData.status}`,
              timestamp: updateTime,
              read: false,
              link: `/application/${change.doc.id}`
            };

            setNotifications(prev => [notification, ...prev]);

            // Show toast notification
            toast(notification.title, {
              icon: '🔄',
              duration: 3000
            });

            // Send browser notification
            if (userSettings.browserNotifications && Notification.permission === 'granted') {
              new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: notification.id
              });
            }
          }
        });
      },
      createSnapshotErrorHandler('Application updates listener')
    );

    return () => unsubscribe();
  }, [user, userSettings]);

  // Calculate unread count
  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
