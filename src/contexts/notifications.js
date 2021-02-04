import React from 'react';
// import * as ethers from 'ethers';
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
        message:
          msg?.data ||
          msg?.error?.message ||
          msg?.responseText ||
          msg?.message ||
          msg,
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
    const [contract, method, args] = makeTx();
    let hash, wait;
    try {
      ({ hash, wait } = await contract[method](...args));
    } catch (e) {
      try {
        await contract.callStatic[method](...args);
        throw e;
      } catch (e) {
        showErrorNotification(e.data ? hexToASCII(e.data) : e);
        throw e;
      }
    }

    showTxNotification(startNotification, hash);

    try {
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

function hexToASCII(S) {
  // https://gist.github.com/gluk64/fdea559472d957f1138ed93bcbc6f78a#file-reason-js
  // return ethers.utils.toUtf8String(S.split(' ')[1].toString());
  const hex = S.substr(147).toString();
  let str = '';
  for (var n = 0; n < hex.length; n += 2) {
    str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
  }
  return str;
}
