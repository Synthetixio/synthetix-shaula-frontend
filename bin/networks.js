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
  'rinkeby',
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

      'Exchanger',
      'ExchangeRates',
    ].map(request.bind(null, network))
  );

  const loanContract = new ethers.Contract(
    erc20LoanContractAddress,
    LOAN_ERC20_ABI,
    infuraProvider
  );
  const renBTCAddress = await loanContract.underlyingContract();

  // sBTCCurrency,
  // sETHCurrency,
  // sUSDCurrency,

  const sBTCCurrency =
    '0x7342544300000000000000000000000000000000000000000000000000000000';
  const sETHCurrency =
    '0x7345544800000000000000000000000000000000000000000000000000000000';
  const sUSDCurrency =
    '0x7355534400000000000000000000000000000000000000000000000000000000';

  const cfg = {
    tokens: {
      sBTC: [18, sBTCAddress],
      sETH: [18, sETHAddress],
      sUSD: [18, sUSDAddress],
      renBTC: [8, renBTCAddress],
      ETH: [18, '0xee'],
    },

    tokenCurrencies: {
      sBTC: sBTCCurrency,
      sETH: sETHCurrency,
      sUSD: sUSDCurrency,
    },

    erc20LoanContractAddress,
    ethLoanContractAddress,
    shortLoanContractAddress,

    erc20LoanStateContractAddress,
    ethLoanStateContractAddress,
    shortLoanStateContractAddress,

    exchangerAddress,
    exchangeRatesAddress,
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
