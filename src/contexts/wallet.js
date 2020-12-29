import React from 'react';
import wallet from 'utils/wallet';
import NETWORKS from 'networks.json';

const WalletContext = React.createContext(null);

export function WalletProvider({ children }) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [address, setAddress] = React.useState(null);

  const network = !!address && wallet.getNetworkName();
  const config = React.useMemo(() => {
    if (!network) return {};

    const cfg = NETWORKS[network];
    if (!cfg) return {};

    const MULTI_COLLATERAL_TOKEN_CURRENCIES_BY_ADDRESS = Object.entries(
      cfg.MULTI_COLLATERAL_TOKEN_CURRENCIES
    ).reduce((r, [k, v]) => {
      r[v] = k;
      return r;
    }, {});

    return { ...cfg, MULTI_COLLATERAL_TOKEN_CURRENCIES_BY_ADDRESS };
  }, [network]);

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
    setIsLoaded(true);
  }

  React.useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <WalletContext.Provider
      value={{
        isLoaded,
        address,
        connect,
        disconnect,
        config,
        network,
        signer: wallet.ethersWallet,
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
  const {
    isLoaded,
    address,
    connect,
    disconnect,
    config,
    network,
    signer,
  } = context;

  return {
    isLoaded,
    address,
    connect,
    disconnect,
    config,
    network,
    signer,
  };
}
