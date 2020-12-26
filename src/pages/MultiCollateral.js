import React from 'react';
import * as ethers from 'ethers';
import { makeStyles } from '@material-ui/core/styles';
import { Paper, Select, MenuItem, TextField, Button } from '@material-ui/core';
import { useWallet } from 'contexts/wallet';
import wallet from 'utils/wallet';
import { formatUnits } from 'utils/big-number';
import sl from 'utils/sl';
import ERC20_CONTRACT_ABI from 'abis/erc20.json';
import MULTI_COLLATERAL_ERC20_ABI from 'abis/multi-collateral-erc20.json';
import MULTI_COLLATERAL_ETH_ABI from 'abis/multi-collateral-eth.json';
import MULTI_COLLATERAL_SHORT_ABI from 'abis/multi-collateral-short.json';
import {
  TOKENS,
  MULTI_COLLATERAL_TOKEN_CURRENCIES,
  MULTI_COLLATERAL_ERC20_ADDRESS,
  MULTI_COLLATERAL_ETH_ADDRESS,
  MULTI_COLLATERAL_SHORT_ADDRESS,
} from 'config';

export const useStyles = makeStyles(theme => ({
  container: {
    background: 'rgb(16, 16, 78)', // 'linear-gradient(0deg, rgb(8, 2, 30) 0%, rgb(18, 4, 70) 146.21%)',
    padding: '40px 50px',
    borderRadius: 8,
    flex: 1,
    width: '100%',
    '& button': {
      width: '100%',
      fontFamily: 'GT-America-Extended-Bold, "Work Sans", Arial',
    },
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  heading: {
    fontSize: 20,
    fontFamily: 'GT-America-Extended-Bold, "Work Sans", Arial',
    textAlign: 'center',
  },
  p: {
    margin: '20px 0',
    display: 'flex',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    '& .mr': {
      marginRight: 20,
    },
    '& .mx': {
      margin: '0 20px',
    },
  },
  input: {
    margin: '0 0 20px',
    '& .MuiInputLabel-shrink': {
      right: 0,
      transform: 'translate(0, 1.5px) scale(1)',
      transformOrigin: 'top left',
      fontSize: 12,
    },
  },
}));

export default function({ collateralAssets, targetAssets, short }) {
  const classes = useStyles();
  const label = short ? 'Short' : 'Borrow';

  const { address, connect } = useWallet();
  const isConnected = !!address;

  const [isApproving, setIsApproving] = React.useState(false);
  const [isApproved, setIsApproved] = React.useState(false);
  const [isTrading, setIsTrading] = React.useState(false);

  const [targetName, setTargetAsset] = React.useState(targetAssets[0]);
  const [targetDecimals, targetAddress] = TOKENS[targetName];
  const [targetAmountNumber, setTargetAmountNumber] = React.useState(0);
  const targetAmount = React.useMemo(() => {
    try {
      return ethers.utils.parseUnits(
        targetAmountNumber.toString(),
        targetDecimals
      );
    } catch {
      return ethers.BigNumber.from('0');
    }
  }, [targetAmountNumber, targetDecimals]);
  const [targetBalance, setTargetBalance] = React.useState(
    ethers.BigNumber.from('0')
  );
  const targetContract = React.useMemo(
    () =>
      isConnected &&
      new ethers.Contract(
        targetAddress,
        ERC20_CONTRACT_ABI,
        wallet.ethersWallet
      ),
    [isConnected, targetAddress]
  );

  const [collateralName, setCollateralAsset] = React.useState(
    collateralAssets[0]
  );
  const collateralIsETH = collateralName === 'ETH';
  const [collateralDecimals, collateralAddress] = TOKENS[collateralName];
  const [collateralAmountNumber, setCollateralAmountNumber] = React.useState(0);
  const collateralAmount = React.useMemo(() => {
    try {
      return ethers.utils.parseUnits(
        collateralAmountNumber.toString(),
        collateralDecimals
      );
    } catch {
      return ethers.BigNumber.from('0');
    }
  }, [collateralAmountNumber, collateralDecimals]);
  const [collateralBalance, setCollateralBalance] = React.useState(
    ethers.BigNumber.from('0')
  );
  const multiCollateralAddress = short
    ? MULTI_COLLATERAL_SHORT_ADDRESS
    : collateralIsETH
    ? MULTI_COLLATERAL_ETH_ADDRESS
    : MULTI_COLLATERAL_ERC20_ADDRESS;
  const collateralContract = React.useMemo(
    () =>
      isConnected &&
      !collateralIsETH &&
      new ethers.Contract(
        collateralAddress,
        ERC20_CONTRACT_ABI,
        wallet.ethersWallet
      ),
    [isConnected, collateralIsETH, collateralAddress]
  );

  const multiCollateralContract = React.useMemo(
    () =>
      isConnected &&
      new ethers.Contract(
        short
          ? MULTI_COLLATERAL_SHORT_ADDRESS
          : collateralIsETH
          ? MULTI_COLLATERAL_ETH_ADDRESS
          : multiCollateralAddress,
        short
          ? MULTI_COLLATERAL_SHORT_ABI
          : collateralIsETH
          ? MULTI_COLLATERAL_ETH_ABI
          : MULTI_COLLATERAL_ERC20_ABI,
        wallet.ethersWallet
      ),
    [isConnected, collateralIsETH, multiCollateralAddress, short]
  );

  const onConnectOrApproveOrTrade = async () => {
    if (!isConnected) {
      return connect();
    }
    let minCollateral = await multiCollateralContract.minCollateral();
    if (!short) {
      // workaround for issue where minCollateral should be of decimals of 8, for renBTC
      minCollateral = minCollateral.div(
        1e18 / Math.pow(10, collateralDecimals)
      );
    }
    if (collateralAmount.lt(minCollateral)) {
      return sl(
        'error',
        `Minimum collateral is ${formatUnits(
          minCollateral,
          collateralDecimals
        )} ${collateralName}`
      );
    }
    !isApproved ? approve() : trade();
  };

  const approve = async () => {
    try {
      setIsApproving(true);
      const tx = await collateralContract.approve(
        multiCollateralAddress,
        collateralAmount
      );
      await tx.wait();
      await checkCollateralAllowance();
    } catch (e) {
      sl('error', e);
    } finally {
      setIsApproving(false);
    }
  };

  const trade = async () => {
    try {
      setIsTrading(true);
      const tx = await (collateralIsETH
        ? multiCollateralContract.open(
            targetAmount,
            MULTI_COLLATERAL_TOKEN_CURRENCIES[targetName],
            { value: collateralAmount }
          )
        : multiCollateralContract.open(
            collateralAmount,
            targetAmount,
            MULTI_COLLATERAL_TOKEN_CURRENCIES[targetName]
          ));
      await tx.wait();
      await Promise.all([checkCollateralBalance(), checkTargetBalance()]);
    } catch (e) {
      sl('error', e);
    } finally {
      setIsTrading(false);
    }
  };

  const checkCollateralAllowance = async () => {
    if (collateralIsETH || !isConnected) return setIsApproved(true);
    const allowance = await collateralContract.allowance(
      address,
      multiCollateralAddress
    );
    setIsApproved(allowance.gte(collateralAmount));
  };
  React.useEffect(() => {
    checkCollateralAllowance();
  }, [isConnected, collateralAmount, collateralContract]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkCollateralBalance = async () => {
    if (!isConnected) return;
    const balance = await (collateralIsETH
      ? wallet.ethersWallet.getBalance()
      : collateralContract.balanceOf(address));
    setCollateralBalance(balance);
  };
  React.useEffect(() => {
    checkCollateralBalance();
  }, [isConnected, collateralContract]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkTargetBalance = async () => {
    if (!isConnected) return;
    const balance = await targetContract.balanceOf(address);
    setTargetBalance(balance);
  };
  React.useEffect(() => {
    checkTargetBalance();
  }, [isConnected, targetContract]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Paper className={classes.container}>
      <div className={classes.content}>
        <div className={classes.heading}>{label}</div>

        <div className={classes.p}>
          <span className="mr">{label}</span>
          <Select
            labelId="targetNameLabel"
            id="targetName"
            value={targetName}
            onChange={event => setTargetAsset(event.target.value)}
          >
            {targetAssets.map(name => (
              <MenuItem value={name} key={name}>
                {name}
              </MenuItem>
            ))}
          </Select>
          <span className="mx">using</span>
          <Select
            labelId="collateralNameLabel"
            id="collateralName"
            value={collateralName}
            onChange={event => setCollateralAsset(event.target.value)}
          >
            {collateralAssets.map(name => (
              <MenuItem value={name} key={name}>
                {name}
              </MenuItem>
            ))}
          </Select>
        </div>

        <TextField
          id="collateralAmount"
          label={
            <div className="flex flex-grow justify-space">
              <div>Collateral Amount ({collateralName})</div>
              <div>
                Balance: {formatUnits(collateralBalance, collateralDecimals)}{' '}
                {collateralName}
              </div>
            </div>
          }
          type="number"
          step="any"
          className={classes.input}
          InputLabelProps={{
            shrink: true,
          }}
          fullWidth
          onChange={e => setCollateralAmountNumber(e.target.value || 0)}
        />

        <TextField
          id="targetAmount"
          label={
            <div className="flex flex-grow justify-space">
              <div>
                {label} Amount ({targetName})
              </div>
              <div>
                Balance: {formatUnits(targetBalance, targetDecimals)}{' '}
                {targetName}
              </div>
            </div>
          }
          type="number"
          step="any"
          className={classes.input}
          InputLabelProps={{
            shrink: true,
          }}
          fullWidth
          onChange={e => setTargetAmountNumber(e.target.value || 0)}
        />

        <Button
          color="secondary"
          variant="contained"
          disabled={isTrading || isApproving}
          onClick={onConnectOrApproveOrTrade}
        >
          {isTrading
            ? 'Trading...'
            : isApproving
            ? 'Approving...'
            : !isConnected
            ? 'Connect Wallet'
            : !isApproved
            ? 'Approve'
            : label}
        </Button>
      </div>
    </Paper>
  );
}
