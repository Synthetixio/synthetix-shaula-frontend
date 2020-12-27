import React from 'react';
import Promise from 'bluebird';
import * as ethers from 'ethers';
import { makeStyles } from '@material-ui/core/styles';
import ERC20_CONTRACT_ABI from 'abis/erc20.json';
import { formatUnits } from 'utils/big-number';
import { useWallet } from 'contexts/wallet';
import wallet from 'utils/wallet';
import sleep from 'utils/sleep';

const useStyles = makeStyles(theme => ({
  container: {},
}));

export default function({ isETH, tokenAddress }) {
  const { address } = useWallet();
  const isConnected = !!address;
  return isConnected && (isETH ? <ETH /> : <ERC20 {...{ tokenAddress }} />);
}

function ETH() {
  const classes = useStyles();
  const [balance, setBalance] = React.useState(ethers.BigNumber.from('0'));

  const load = async () => {
    setBalance(await wallet.ethersWallet.getBalance());
  };

  const subscribe = () => {
    return () => {};
  };

  React.useEffect(() => {
    load();
    return subscribe(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    balance && (
      <div className={classes.container}>
        Balance: {formatUnits(balance, 18)} ETH
      </div>
    )
  );
}

function ERC20({ tokenAddress }) {
  const classes = useStyles();
  const [balance, setBalance] = React.useState(ethers.BigNumber.from('0'));
  const [decimals, setDecimals] = React.useState(null);
  const [symbol, setSymbol] = React.useState(null);
  const { address } = useWallet();

  const contract = React.useMemo(
    () =>
      tokenAddress &&
      new ethers.Contract(
        tokenAddress,
        ERC20_CONTRACT_ABI,
        wallet.ethersWallet
      ),
    [tokenAddress]
  );

  const onBalanceChange = async (from, to) => {
    if (from === address || to === address) {
      await sleep(1000);
      setBalance(await contract.balanceOf(address));
    }
  };

  const load = async () => {
    if (!contract) return;
    const [decimals, symbol, balance] = await Promise.all([
      contract.decimals(),
      contract.symbol(),
      contract.balanceOf(address),
    ]);
    setDecimals(decimals);
    setSymbol(symbol);
    setBalance(balance);
  };

  const subscribe = () => {
    if (!contract) return () => {};
    const transferEvent = contract.filters.Transfer();
    contract.on(transferEvent, onBalanceChange);
    return () => {
      contract.off(transferEvent, onBalanceChange);
    };
  };

  React.useEffect(() => {
    load();
    return subscribe(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract]);

  return (
    symbol &&
    decimals &&
    balance && (
      <div className={classes.container}>
        Balance: {formatUnits(balance, decimals)} {symbol}
      </div>
    )
  );
}
