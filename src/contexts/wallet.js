import React from 'react';
import wallet from 'utils/wallet';

const WalletContext = React.createContext(null);

export function WalletProvider({ children }) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [address, setAddress] = React.useState(null);

  async function connect(tryCached) {
    if (wallet.address) return;
    await wallet.connect(tryCached);
    setAddress(wallet.address);
  }

  async function disconnect() {
    await wallet.disconnect();
    setAddress(wallet.address);
  }

  async function load() {
    await connect(true);
    // if (wallet.connectCached()) {
    //   await connect();
    // } else {
    //   await wallet.setFallbackProvider();
    // }
    setIsLoading(false);
  }

  React.useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <WalletContext.Provider
      value={{
        isLoading,
        address,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = React.useContext(WalletContext);
  if (!context) {
    throw new Error('Missing wallet context');
  }
  const { isLoading, address, connect, disconnect } = context;

  return {
    isLoading,
    address,
    connect,
    disconnect,
  };
}
