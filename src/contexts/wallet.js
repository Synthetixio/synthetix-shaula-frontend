import React from 'react';
import { ethers } from 'ethers';
import Onboard from 'bnc-onboard';
import {
  CACHE_WALLET_KEY,
  LOAN_TYPE_ERC20,
  LOAN_TYPE_ETH,
  LOAN_TYPE_SHORT,
  INFURA_ID,
} from 'config';
import cache from 'utils/cache';
import NETWORKS_V1 from 'networks/v1.json';
import NETWORKS_V2 from 'networks/v2.json';
import COLLATERAL_STATE_ABI from 'abis/collateral-state.json';
import MULTI_COLLATERAL_ERC20_ABI from 'abis/multi-collateral-erc20.json';
import MULTI_COLLATERAL_ETH_ABI from 'abis/multi-collateral-eth.json';
import MULTI_COLLATERAL_SHORT_ABI from 'abis/multi-collateral-short.json';
import EXCHANGER_ABI from 'abis/exchanger.json';

const DEFAULT_NETWORK_ID = 1;

const WALLETS = [
  { walletName: 'metamask', preferred: true },
  {
    walletName: 'walletConnect',
    infuraKey: INFURA_ID,
    preferred: true,
  },
];

const NETWORKS = {
  1: NETWORKS_V1,
  2: NETWORKS_V2,
};

const WalletContext = React.createContext(null);

let onboard;

export function WalletProvider({ children }) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [address, setAddress] = React.useState(null);
  const [signer, setSigner] = React.useState(null);
  const [network, setNetwork] = React.useState('');
  const [version, setVersion] = React.useState(2);

  const cfg = React.useMemo(() => {
    if (!network) return {};

    const cfg = NETWORKS[version][network];
    if (!cfg) return {};

    const multiCollateralTokenCurrenciesByAddress = Object.entries(
      cfg.multiCollateralTokenCurrencies
    ).reduce((r, [k, v]) => {
      r[v] = k;
      return r;
    }, {});

    return { ...cfg, multiCollateralTokenCurrenciesByAddress };
  }, [network, version]);

  const erc20CollateralStateContract = React.useMemo(
    () =>
      signer &&
      cfg.erc20CollateralStateAddress &&
      new ethers.Contract(
        cfg.erc20CollateralStateAddress,
        COLLATERAL_STATE_ABI,
        signer
      ),
    [signer, cfg.erc20CollateralStateAddress]
  );

  const ethCollateralStateContract = React.useMemo(
    () =>
      signer &&
      cfg.ethCollateralStateAddress &&
      new ethers.Contract(
        cfg.ethCollateralStateAddress,
        COLLATERAL_STATE_ABI,
        signer
      ),
    [signer, cfg.ethCollateralStateAddress]
  );

  const shortCollateralStateContract = React.useMemo(
    () =>
      signer &&
      cfg.shortCollateralStateAddress &&
      new ethers.Contract(
        cfg.shortCollateralStateAddress,
        COLLATERAL_STATE_ABI,
        signer
      ),
    [signer, cfg.shortCollateralStateAddress]
  );

  const erc20CollateralContract = React.useMemo(
    () =>
      signer &&
      cfg.multiCollateralERC20Address &&
      new ethers.Contract(
        cfg.multiCollateralERC20Address,
        MULTI_COLLATERAL_ERC20_ABI,
        signer
      ),
    [signer, cfg.multiCollateralERC20Address]
  );

  const ethCollateralContract = React.useMemo(
    () =>
      signer &&
      cfg.multiCollateralETHAddress &&
      new ethers.Contract(
        cfg.multiCollateralETHAddress,
        MULTI_COLLATERAL_ETH_ABI,
        signer
      ),
    [signer, cfg.multiCollateralETHAddress]
  );

  const shortCollateralContract = React.useMemo(
    () =>
      signer &&
      cfg.multiCollateralShortAddress &&
      new ethers.Contract(
        cfg.multiCollateralShortAddress,
        MULTI_COLLATERAL_SHORT_ABI,
        signer
      ),
    [signer, cfg.multiCollateralShortAddress]
  );

  const collateralContracts = {
    [LOAN_TYPE_ERC20]: erc20CollateralContract,
    [LOAN_TYPE_ETH]: ethCollateralContract,
    [LOAN_TYPE_SHORT]: shortCollateralContract,
  };

  const collateralStateContracts = {
    [LOAN_TYPE_ERC20]: erc20CollateralStateContract,
    [LOAN_TYPE_ETH]: ethCollateralStateContract,
    [LOAN_TYPE_SHORT]: shortCollateralStateContract,
  };

  const exchangerContract = React.useMemo(
    () =>
      signer &&
      cfg.exchangerAddress &&
      new ethers.Contract(cfg.exchangerAddress, EXCHANGER_ABI, signer),
    [signer, cfg.exchangerAddress]
  );

  const connect = React.useCallback(
    async tryCached => {
      if (address) return;

      let cachedWallet;
      if (tryCached) {
        cachedWallet = cache(CACHE_WALLET_KEY);
        if (!cachedWallet) return;
      }

      if (!onboard) {
        onboard = Onboard({
          networkId: await getDefaultNetworkId(),
          walletSelect: {
            wallets: WALLETS,
          },
        });
      }

      if (
        !(cachedWallet
          ? await onboard.walletSelect(cachedWallet)
          : await onboard.walletSelect())
      )
        return;
      await onboard.walletCheck();

      const {
        wallet: { name: walletName, provider: web3Provider },
      } = onboard.getState();

      if (~walletName.indexOf('MetaMask')) {
        cache(CACHE_WALLET_KEY, walletName);
      }

      web3Provider.on('accountsChanged', () => {
        window.location.reload();
      });
      web3Provider.on('chainChanged', () => {
        window.location.reload();
      });
      // web3Provider.on('disconnect', () => {
      //   disconnect();
      // });

      const provider = new ethers.providers.Web3Provider(web3Provider);
      const signer = provider.getSigner();

      setSigner(signer);
      setAddress(await signer.getAddress());
    },
    [address]
  );

  async function disconnect() {
    cache(CACHE_WALLET_KEY, null);
    setAddress(null);
    setSigner(null);
  }

  React.useEffect(() => {
    if (!signer) return;
    let isMounted = true;
    (async () => {
      const net = await signer.provider.getNetwork();
      if (isMounted) {
        setNetwork(~['homestead'].indexOf(net.name) ? 'mainnet' : net.name);
      }
    })();
    return () => (isMounted = false);
  }, [signer]);

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      await connect(true);
      if (isMounted) setIsLoaded(true);
    })();
    return () => (isMounted = false);
  }, [connect]);

  return (
    <WalletContext.Provider
      value={{
        isLoaded,
        address,
        connect,
        disconnect,
        config: cfg,
        network,
        signer,
        version,
        setVersion,

        erc20CollateralContract,
        ethCollateralContract,
        shortCollateralContract,
        collateralContracts,

        erc20CollateralStateContract,
        ethCollateralStateContract,
        shortCollateralStateContract,
        collateralStateContracts,

        exchangerContract,
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
    version,
    setVersion,

    erc20CollateralContract,
    ethCollateralContract,
    shortCollateralContract,
    collateralContracts,

    erc20CollateralStateContract,
    ethCollateralStateContract,
    shortCollateralStateContract,
    collateralStateContracts,

    exchangerContract,
  } = context;

  return {
    isLoaded,
    address,
    connect,
    disconnect,
    config,
    network,
    signer,
    version,
    setVersion,
    availableNetworkNames: Object.keys(NETWORKS[version]),

    erc20CollateralContract,
    ethCollateralContract,
    shortCollateralContract,
    collateralContracts,

    erc20CollateralStateContract,
    ethCollateralStateContract,
    shortCollateralStateContract,
    collateralStateContracts,

    exchangerContract,
  };
}

// https://github.com/Synthetixio/staking/blob/c42ac534ba774d83caca183a52348c8b6260fcf4/utils/network.ts#L5
async function getDefaultNetworkId() {
  try {
    if (window?.web3?.eth?.net) {
      const networkId = await window.web3.eth.net.getId();
      return Number(networkId);
    } else if (window?.web3?.version?.network) {
      return Number(window?.web3.version.network);
    } else if (window?.ethereum?.networkVersion) {
      return Number(window?.ethereum?.networkVersion);
    }
    return DEFAULT_NETWORK_ID;
  } catch (e) {
    console.log(e);
    return DEFAULT_NETWORK_ID;
  }
}
