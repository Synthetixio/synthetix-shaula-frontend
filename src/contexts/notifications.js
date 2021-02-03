import React from 'react';
import { useSnackbar } from 'notistack';

const NotificationsContext = React.createContext(null);

export function NotificationsProvider({ children }) {
  const { enqueueSnackbar } = useSnackbar();

  const showTxNotification = (description, hash) =>
    enqueueSnackbar(
      { type: 'tx', description, hash },
      {
        persist: true,
      }
    );

  const showErrorNotification = msg =>
    enqueueSnackbar(
      {
        type: 'error',
        message: msg?.error?.message || msg.responseText || msg.message || msg,
      },
      {
        persist: true,
      }
    );

  const showSuccessNotification = (message, hash) =>
    enqueueSnackbar(
      {
        type: 'success',
        message,
        hash,
      },
      {
        persist: true,
      }
    );

  const tx = async (startNotification, endNotification, makeTx) => {
    try {
      const { hash, wait } = await makeTx();
      showTxNotification(startNotification, hash);
      await wait();
      showSuccessNotification(endNotification, hash);
    } catch (e) {
      showErrorNotification(e);
      throw e;
    }
  };

  return (
    <NotificationsContext.Provider
      value={{
        showTxNotification,
        showErrorNotification,
        showSuccessNotification,
        tx,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = React.useContext(NotificationsContext);
  if (!context) {
    throw new Error('Missing notifications context');
  }
  const {
    showTxNotification,
    showErrorNotification,
    showSuccessNotification,
    tx,
  } = context;
  return {
    showTxNotification,
    showErrorNotification,
    showSuccessNotification,
    tx,
  };
}
