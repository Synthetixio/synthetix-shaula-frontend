import React from 'react';

const NotificationsContext = React.createContext(null);

export function NotificationsProvider({ children }) {
  const [notification, setNotification] = React.useState(null);

  const showNotification = (description, hash) =>
    setNotification({ description, hash });
  const clearNotification = () => setNotification(null);

  return (
    <NotificationsContext.Provider
      value={{
        notification,
        showNotification,
        clearNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotification() {
  const context = React.useContext(NotificationsContext);
  if (!context) {
    throw new Error('Missing notification context');
  }
  const { notification, showNotification, clearNotification } = context;
  return {
    notification,
    showNotification,
    clearNotification,
  };
}
