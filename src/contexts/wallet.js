import React from 'react';
import { ethers } from 'ethers';
import fetch from 'unfetch';
import qs from 'query-string';
import Onboard from 'bnc-onboard';
import {
  CACHE_WALLET_KEY,
  LOAN_TYPE_ERC20,
  LOAN_TYPE_ETH,
  LOAN_TYPE_SHORT,
  INFURA_ID,
  SECONDS_IN_A_YR,
} from 'config';
import cache from 'utils/cache';
import { bytesFormatter } from 'utils/snx';
import { Big } from 'utils/big-number';
import NETWORKS_V1 from 'networks/v1.json';
import NETWORKS_V2 from 'networks/v2.json';
import LOAN_STATE_ABI from 'abis/loan-state.json';
import LOAN_ERC20_ABI from 'abis/loan-erc20.json';
import LOAN_ETH_ABI from 'abis/loan-eth.json';
import LOAN_SHORT_ABI from 'abis/loan-short.json';
import EXCHANGER_ABI from 'abis/exchanger.json';
import EXCHANGE_RATES_ABI from 'abis/exchange-rates.json';
import COLLATERAL_MANAGER_ABI from 'abis/collateral-manager.json';
import ERC20_ABI from 'abis/erc20.json';
import REWARDS_CONTRACT_ABI from 'abis/shorting-rewards.json';

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
  const [rewardsContracts, setRewardsContracts] = React.useState(null);

  const [annualLoanRates, setAnnualLoanRates] = React.useState({
    borrow: Big('0'),
    sETHShort: Big('0'),
    sBTCShort: Big('0'),
  });
  const [issueFeeRates, setIssueFeeRates] = React.useState({
    [LOAN_TYPE_ERC20]: Big('0'),
    [LOAN_TYPE_ETH]: Big('0'),
    [LOAN_TYPE_SHORT]: Big('0'),
  });
  const [interactionDelays, setInteractionDelays] = React.useState({
    [LOAN_TYPE_ERC20]: Big('0'),
    [LOAN_TYPE_ETH]: Big('0'),
    [LOAN_TYPE_SHORT]: Big('0'),
  });

  const cfg = React.useMemo(() => {
    if (!network) return {};

    const cfg = NETWORKS[version][network];
    if (!cfg) return {};

    const tokenKeysByName = {};
    const tokenKeysByKey = {};

    ['sBTC', 'sETH', 'sUSD', 'SNX'].forEach(name => {
      const key = bytesFormatter(name);
      tokenKeysByName[name] = key;
      tokenKeysByKey[key] = name;
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

  const subgraph = subgraphUrl =>
    !subgraphUrl
      ? null
      : async (query, variables) => {
          const res = await fetch(subgraphUrl, {
            method: 'POST',
            body: JSON.stringify({ query, variables }),
          });
          const { data } = await res.json();
          return data;
        };

  const shortsSubgraph = React.useCallback(subgraph(cfg.shortsSubgraphUrl), [
    cfg.shortsSubgraphUrl,
  ]);

  const erc20LoansSubgraph = React.useCallback(
    subgraph(cfg.erc20LoansSubgraphUrl),
    [cfg.erc20LoansSubgraphUrl]
  );

  const ethLoansSubgraph = React.useCallback(
    subgraph(cfg.ethLoansSubgraphUrl),
    [cfg.ethLoansSubgraphUrl]
  );

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

      const queryParams = qs.parse(window.location.search.replace('?', ''));
      if ('watch' in queryParams) {
        if (shortsSubgraph) {
          const index = parseInt(queryParams.watch);
          const { shorts } = await shortsSubgraph(
            `query($first: Int) {
              shorts(first: $first, orderBy: synthBorrowedAmount, orderDirection: desc) {
                account
              }
            }
            `,
            { first: index + 1 }
          );
          const addr = shorts[index].account;
          setAddress(addr);
        }
      } else {
        setAddress(await signer.getAddress());
      }
    },
    [address, shortsSubgraph]
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

  React.useEffect(() => {
    if (
      !(
        collateralManagerContract &&
        erc20LoanContract &&
        ethLoanContract &&
        shortLoanContract &&
        cfg.tokenKeysByName
      )
    )
      return;

    let isMounted = true;
    (async () => {
      const [
        [borrowRate],
        [sETHShortRate],
        [sBTCShortRate],
        //
        erc20BorrowIssueFeeRate,
        ethBorrowIssueFeeRate,
        shortIssueFeeRate,
        //
        erc20InteractionDelay,
        ethInteractionDelay,
        shortInteractionDelay,
      ] = await Promise.all([
        collateralManagerContract.getBorrowRate(),
        // collateralManagerContract.getShortRate(cfg.tokenKeysByName['sETH']),
        // collateralManagerContract.getShortRate(cfg.tokenKeysByName['sBTC']),
        Promise.resolve(['0']),
        Promise.resolve(['0']),
        //
        erc20LoanContract.issueFeeRate(),
        ethLoanContract.issueFeeRate(),
        shortLoanContract.issueFeeRate(),
        //
        erc20LoanContract.interactionDelay(),
        ethLoanContract.interactionDelay(),
        shortLoanContract.interactionDelay(),
      ]);
      if (isMounted) {
        const perYr = SECONDS_IN_A_YR * 1e2 * (1 / 1e18);
        setAnnualLoanRates({
          borrow: Big(borrowRate).mul(perYr),
          sETHShort: Big(sETHShortRate).mul(perYr),
          sBTCShort: Big(sBTCShortRate).mul(perYr),
        });
        setIssueFeeRates({
          [LOAN_TYPE_ERC20]: Big(erc20BorrowIssueFeeRate).mul(1e2 / 1e18),
          [LOAN_TYPE_ETH]: Big(ethBorrowIssueFeeRate).mul(1e2 / 1e18),
          [LOAN_TYPE_SHORT]: Big(shortIssueFeeRate).mul(1e2 / 1e18),
        });
        setInteractionDelays({
          [LOAN_TYPE_ERC20]: erc20InteractionDelay,
          [LOAN_TYPE_ETH]: ethInteractionDelay,
          [LOAN_TYPE_SHORT]: shortInteractionDelay,
        });
      }
    })();
    return () => (isMounted = false);
  }, [
    collateralManagerContract,
    erc20LoanContract,
    ethLoanContract,
    shortLoanContract,
    cfg.tokenKeysByName,
  ]);

  // rewards contracts

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      if (version === 1) {
        if (isMounted) {
          setRewardsContracts(null);
        }
        return;
      }
      if (!(signer && shortLoanContract && cfg.tokenKeysByName)) {
        return;
      }

      const getRewardContract = async currency => {
        const currencyAddress = cfg.tokenKeysByName[currency];
        const rewardAddress = await shortLoanContract.shortingRewards(
          currencyAddress
        );
        return [
          currency,
          new ethers.Contract(rewardAddress, REWARDS_CONTRACT_ABI, signer),
        ];
      };

      const contracts = new Map(
        await Promise.all(['sBTC', 'sETH'].map(getRewardContract))
      );

      if (isMounted) {
        setRewardsContracts(contracts);
      }
    })();
    return () => (isMounted = false);
  }, [shortLoanContract, cfg.tokenKeysByName, signer, version]);

  const makeErc20Contract = React.useCallback(
    tokenAddress => new ethers.Contract(tokenAddress, ERC20_ABI, provider),
    [provider]
  );

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
        shortsSubgraph,
        erc20LoansSubgraph,
        ethLoansSubgraph,

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

        rewardsContracts,

        annualLoanRates,
        issueFeeRates,
        interactionDelays,

        makeErc20Contract,
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
    shortsSubgraph,
    erc20LoansSubgraph,
    ethLoansSubgraph,

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

    rewardsContracts,

    annualLoanRates,
    issueFeeRates,
    interactionDelays,

    makeErc20Contract,
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
    shortsSubgraph,
    erc20LoansSubgraph,
    ethLoansSubgraph,

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

    rewardsContracts,

    annualLoanRates,
    issueFeeRates,
    interactionDelays,

    makeErc20Contract,
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
