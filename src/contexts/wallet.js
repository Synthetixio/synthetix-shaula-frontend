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
import { bytesFormatter } from 'utils/snx';
import NETWORKS_V1 from 'networks/v1.json';
import NETWORKS_V2 from 'networks/v2.json';
import LOAN_STATE_ABI from 'abis/loan-state.json';
import LOAN_ERC20_ABI from 'abis/loan-erc20.json';
import LOAN_ETH_ABI from 'abis/loan-eth.json';
import LOAN_SHORT_ABI from 'abis/loan-short.json';
import EXCHANGER_ABI from 'abis/exchanger.json';
import EXCHANGE_RATES_ABI from 'abis/exchange-rates.json';
import COLLATERAL_MANAGER_ABI from 'abis/collateral-manager.json';

const DEFAULT_NETWORK_ID = 1;
const READ_PROVIDER = new ethers.providers.InfuraProvider(
  'homestead',
  INFURA_ID
);
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

    const tokenKeysByName = {};
    const tokenKeysByKey = {};

    ['sBTC', 'sETH', 'sUSD', 'SNX'].forEach(currency => {
      const key = bytesFormatter(currency);
      tokenKeysByName[currency] = key;
      tokenKeysByKey[key] = currency;
    });

    return { ...cfg, tokenKeysByName, tokenKeysByKey };
  }, [network, version]);

  const erc20LoanStateContract = React.useMemo(
    () =>
      signer &&
      cfg.erc20LoanStateContractAddress &&
      new ethers.Contract(
        cfg.erc20LoanStateContractAddress,
        LOAN_STATE_ABI,
        signer
      ),
    [signer, cfg.erc20LoanStateContractAddress]
  );

  const ethLoanStateContract = React.useMemo(
    () =>
      signer &&
      cfg.ethLoanStateContractAddress &&
      new ethers.Contract(
        cfg.ethLoanStateContractAddress,
        LOAN_STATE_ABI,
        signer
      ),
    [signer, cfg.ethLoanStateContractAddress]
  );

  const shortLoanStateContract = React.useMemo(
    () =>
      signer &&
      cfg.shortLoanStateContractAddress &&
      new ethers.Contract(
        cfg.shortLoanStateContractAddress,
        LOAN_STATE_ABI,
        signer
      ),
    [signer, cfg.shortLoanStateContractAddress]
  );

  const erc20LoanContract = React.useMemo(
    () =>
      signer &&
      cfg.erc20LoanContractAddress &&
      new ethers.Contract(cfg.erc20LoanContractAddress, LOAN_ERC20_ABI, signer),
    [signer, cfg.erc20LoanContractAddress]
  );

  const ethLoanContract = React.useMemo(
    () =>
      signer &&
      cfg.ethLoanContractAddress &&
      new ethers.Contract(cfg.ethLoanContractAddress, LOAN_ETH_ABI, signer),
    [signer, cfg.ethLoanContractAddress]
  );

  const shortLoanContract = React.useMemo(
    () =>
      signer &&
      cfg.shortLoanContractAddress &&
      new ethers.Contract(cfg.shortLoanContractAddress, LOAN_SHORT_ABI, signer),
    [signer, cfg.shortLoanContractAddress]
  );

  const loanContracts = {
    [LOAN_TYPE_ERC20]: erc20LoanContract,
    [LOAN_TYPE_ETH]: ethLoanContract,
    [LOAN_TYPE_SHORT]: shortLoanContract,
  };

  const loanStateContracts = {
    [LOAN_TYPE_ERC20]: erc20LoanStateContract,
    [LOAN_TYPE_ETH]: ethLoanStateContract,
    [LOAN_TYPE_SHORT]: shortLoanStateContract,
  };

  const exchangerContract = React.useMemo(
    () =>
      signer &&
      cfg.exchangerAddress &&
      new ethers.Contract(cfg.exchangerAddress, EXCHANGER_ABI, signer),
    [signer, cfg.exchangerAddress]
  );

  const provider = React.useMemo(() => isLoaded && (signer || READ_PROVIDER), [
    isLoaded,
    signer,
  ]);
  const signerOrProvider = React.useMemo(
    () => isLoaded && (signer?.provider || READ_PROVIDER),
    [isLoaded, signer]
  );

  const exchangeRatesContract = React.useMemo(() => {
    if (!(isLoaded && cfg.exchangeRatesAddress)) return;
    return new ethers.Contract(
      cfg.exchangeRatesAddress,
      EXCHANGE_RATES_ABI,
      signerOrProvider
    );
  }, [isLoaded, signerOrProvider, cfg.exchangeRatesAddress]);

  const collateralManagerContract = React.useMemo(() => {
    if (!(isLoaded && cfg.collateralManagerAddress)) return;
    return new ethers.Contract(
      cfg.collateralManagerAddress,
      COLLATERAL_MANAGER_ABI,
      signerOrProvider
    );
  }, [isLoaded, signerOrProvider, cfg.collateralManagerAddress]);

  const connect = React.useCallback(
    async tryCached => {
      if (address) return;

      let cachedWallet;
      if (tryCached) {
        cachedWallet = cache(CACHE_WALLET_KEY);
        if (!cachedWallet) return setNetwork('mainnet');
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
        provider,
        signerOrProvider,
        version,
        setVersion,

        erc20LoanContract,
        ethLoanContract,
        shortLoanContract,
        loanContracts,

        erc20LoanStateContract,
        ethLoanStateContract,
        shortLoanStateContract,
        loanStateContracts,

        exchangerContract,
        exchangeRatesContract,

        collateralManagerContract,
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
    provider,
    signerOrProvider,
    version,
    setVersion,

    erc20LoanContract,
    ethLoanContract,
    shortLoanContract,
    loanContracts,

    erc20LoanStateContract,
    ethLoanStateContract,
    shortLoanStateContract,
    loanStateContracts,

    exchangerContract,
    exchangeRatesContract,

    collateralManagerContract,
  } = context;

  return {
    isLoaded,
    address,
    connect,
    disconnect,
    config,
    network,
    signer,
    provider,
    signerOrProvider,
    version,
    setVersion,
    availableNetworkNames: Object.keys(NETWORKS[version]),

    erc20LoanContract,
    ethLoanContract,
    shortLoanContract,
    loanContracts,

    erc20LoanStateContract,
    ethLoanStateContract,
    shortLoanStateContract,
    loanStateContracts,

    exchangerContract,
    exchangeRatesContract,

    collateralManagerContract,
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
