import React from 'react';
import Promise from 'bluebird';
import * as ethers from 'ethers';
import { makeStyles } from '@material-ui/core/styles';
import ERC20_CONTRACT_ABI from 'abis/erc20.json';
import { formatUnits } from 'utils/big-number';
import { useWallet } from 'contexts/wallet';
import sleep from 'utils/sleep';

const useStyles = makeStyles(theme => ({
  container: {},
}));

export default function({ isETH, tokenAddress }) {
  const { signer } = useWallet();
  return !signer ? null : isETH ? <ETH /> : <ERC20 {...{ tokenAddress }} />;
}

function ETH() {
  const classes = useStyles();
  const { signer } = useWallet();
  const [balance, setBalance] = React.useState(ethers.BigNumber.from('0'));

  React.useEffect(() => {
    if (!signer) return;

    let isMounted = true;
    const unsubs = [];

    const onSetBalance = async () => {
      const balance = await signer.getBalance();
      if (isMounted) setBalance(balance);
    };

    const subscribe = () => {
      const newBlockEvent = 'block';
      signer.provider.on(newBlockEvent, onSetBalance);
      unsubs.push(() => signer.provider.off(newBlockEvent, onSetBalance));
    };

    onSetBalance();
    subscribe();
    return () => {
      isMounted = false;
      unsubs.forEach(unsub => unsub());
    };
  }, [signer]);

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
  const { address, signer } = useWallet();

  const contract = React.useMemo(
    () =>
      signer &&
      tokenAddress &&
      new ethers.Contract(tokenAddress, ERC20_CONTRACT_ABI, signer),
    [tokenAddress, signer]
  );

  React.useEffect(() => {
    if (!(contract && address)) return;

    let isMounted = true;
    const unsubs = [];

    const loadBalance = async () => {
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
      const transferEvent = contract.filters.Transfer();
      const onBalanceChange = async (from, to) => {
        if (from === address || to === address) {
          await sleep(1000);
          if (isMounted) setBalance(await contract.balanceOf(address));
        }
      };

      contract.on(transferEvent, onBalanceChange);
      unsubs.push(() => contract.off(transferEvent, onBalanceChange));
    };

    loadBalance();
    subscribe();
    return () => {
      isMounted = false;
      unsubs.forEach(unsub => unsub());
    };
  }, [contract, address]);

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
