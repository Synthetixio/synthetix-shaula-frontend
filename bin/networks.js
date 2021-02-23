require('dotenv').config();
const fs = require('fs');
const path = require('path');
const ethers = require('ethers');
const fetch = require('node-fetch');
const LOAN_ERC20_ABI = require('../src/abis/loan-erc20.json');

const INFURA_ID = process.env.REACT_APP_INFURA_ID;
const VERSION = 'v2';

const NETWORKS = [
  'mainnet',
  'kovan',
  // 'rinkeby',
  // 'ropsten',
];

main().then(
  () => process.exit(),
  err => {
    console.error(err);
    process.exit(0 - 1);
  }
);

async function main() {
  const networks = await Promise.all(NETWORKS.map(getNetworkConfig));

  fs.writeFileSync(
    path.join(__dirname, `../src/networks/${VERSION}.json`),
    JSON.stringify(
      networks.reduce((r, a, i) => {
        r[NETWORKS[i]] = a;
        return r;
      }, {}),
      null,
      2
    ),
    'utf8'
  );
}

async function getNetworkConfig(network) {
  const kovan = network === 'kovan';

  const infuraProvider = new ethers.providers.InfuraProvider(
    network,
    INFURA_ID
  );

  const [
    sBTCAddress,
    sETHAddress,
    sUSDAddress,

    erc20LoanContractAddress,
    ethLoanContractAddress,
    shortLoanContractAddress,

    erc20LoanStateContractAddress,
    ethLoanStateContractAddress,
    shortLoanStateContractAddress,

    collateralManagerAddress,

    exchangerAddress,
    exchangeRatesAddress,
  ] = await Promise.all(
    [
      'ProxysBTC',
      'ProxysETH',
      'ProxyERC20sUSD',

      'CollateralErc20',
      'CollateralEth',
      'CollateralShort',

      'CollateralStateErc20',
      'CollateralStateEth',
      'CollateralStateShort',

      'CollateralManager',

      'Exchanger',
      'ExchangeRates',
    ].map(request.bind(null, network))
  );

  const wbtcAddress = kovan
    ? '0xd3a691c852cdb01e281545a27064741f0b7f6825'
    : '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599';

  const loanContract = new ethers.Contract(
    erc20LoanContractAddress,
    LOAN_ERC20_ABI,
    infuraProvider
  );
  const renBTCAddress = await loanContract.underlyingContract();

  const cfg = {
    tokens: {
      sBTC: [18, sBTCAddress],
      sETH: [18, sETHAddress],
      sUSD: [18, sUSDAddress],
      renBTC: [8, renBTCAddress],
      ETH: [18, '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'],
      WBTC: [8, wbtcAddress],
    },

    erc20LoanContractAddress,
    ethLoanContractAddress,
    shortLoanContractAddress,

    erc20LoanStateContractAddress,
    ethLoanStateContractAddress,
    shortLoanStateContractAddress,

    collateralManagerAddress,

    exchangerAddress,
    exchangeRatesAddress,

    shortsSubgraphUrl: kovan
      ? 'https://api.thegraph.com/subgraphs/name/vbstreetz/synthetix-shorts-kovan'
      : 'https://api.thegraph.com/subgraphs/name/vbstreetz/synthetix-shorts',

    erc20LoansSubgraphUrl: kovan
      ? 'https://api.thegraph.com/subgraphs/name/vbstreetz/collateral-erc20-loans-kovan'
      : 'https://api.thegraph.com/subgraphs/name/vbstreetz/collateral-erc20-loans',

    ethLoansSubgraphUrl: kovan
      ? 'https://api.thegraph.com/subgraphs/name/vbstreetz/collateral-eth-loans-kovan'
      : 'https://api.thegraph.com/subgraphs/name/vbstreetz/collateral-eth-loans',
  };

  return cfg;
}

async function request(network, contractName) {
  const res = await fetch(
    `https://contracts.synthetix.io/${
      network === 'mainnet' ? '' : `${network}/`
    }${contractName}`,
    {
      redirect: 'manual',
    }
  );
  return res.headers
    .get('location')
    .replace(
      `https://${
        network === 'mainnet' ? '' : `${network}.`
      }etherscan.io/address/`,
      ''
    );
}
