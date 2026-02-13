import React, { useEffect } from 'react';
import { Icons } from './Icons';
import { Notification } from '../types';

interface NotificationToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onDismiss }) => {
  useEffect(() => {
    if (notification.type !== 'loading') {
      const timer = setTimeout(() => {
        onDismiss(notification.id);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification, onDismiss]);

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    loading: 'bg-slate-50 border-slate-200 text-slate-800',
  };

  const icons = {
    success: <Icons.CheckCircle className="w-5 h-5 text-green-500" />,
    error: <Icons.AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Icons.AlertCircle className="w-5 h-5 text-blue-500" />,
    loading: <Icons.Loader className="w-5 h-5 text-slate-500 animate-spin" />,
  };

  return (
    <div className={`flex items-center p-4 mb-3 rounded-lg border shadow-sm transition-all duration-300 animate-in slide-in-from-right ${styles[notification.type]}`}>
      <div className="flex-shrink-0 mr-3">
        {icons[notification.type]}
      </div>
      <div className="flex-1 text-sm font-medium">
        {notification.message}
      </div>
      <button 
        onClick={() => onDismiss(notification.id)}
        className="ml-4 text-slate-400 hover:text-slate-600 focus:outline-none"
      >
        <Icons.X className="w-4 h-4" />
      </button>
    </div>
  );
};
