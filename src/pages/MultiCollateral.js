import React from 'react';
import * as ethers from 'ethers';
import { makeStyles } from '@material-ui/core/styles';
import { Paper, Select, MenuItem, TextField, Button } from '@material-ui/core';
import { useWallet } from 'contexts/wallet';
import { formatUnits } from 'utils/big-number';
import Balance from 'components/Balance';
import ERC20_CONTRACT_ABI from 'abis/erc20.json';
import { useNotifications } from 'contexts/notifications';

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

export default function({ collateralAssets, targetAssetsFilter, short }) {
  const classes = useStyles();
  const label = short ? 'Short' : 'Borrow';

  const {
    showTxNotification,
    showErrorNotification,
    showSuccessNotification,
  } = useNotifications();

  const {
    signer,
    address,
    connect,
    config: {
      tokens,
      multiCollateralTokenCurrencies,
      multiCollateralERC20Address,
      multiCollateralETHAddress,
      multiCollateralShortAddress,
    },

    erc20CollateralContract,
    ethCollateralContract,
    shortCollateralContract,
  } = useWallet();

  const [isApproving, setIsApproving] = React.useState(false);
  const [isApproved, setIsApproved] = React.useState(false);
  const [isTrading, setIsTrading] = React.useState(false);

  const [targetName, setTargetAsset] = React.useState(
    targetAssetsFilter(collateralAssets[0])[0]
  );
  const [targetAssets, setTargetAssets] = React.useState(
    targetAssetsFilter(collateralAssets[0])
  );
  const [targetDecimals, targetAddress] = React.useMemo(
    () => (tokens && targetName && tokens[targetName]) ?? [],
    [tokens, targetName]
  );

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

  const [collateralName, setCollateralAsset] = React.useState(
    collateralAssets[0]
  );
  const collateralIsETH = collateralName === 'ETH';
  const [collateralDecimals, collateralAddress] = React.useMemo(
    () => (tokens && collateralName && tokens[collateralName]) ?? [],
    [tokens, collateralName]
  );
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

  const multiCollateralAddress = short
    ? multiCollateralShortAddress
    : collateralIsETH
    ? multiCollateralETHAddress
    : multiCollateralERC20Address;

  const collateralContract = React.useMemo(
    () =>
      signer &&
      !collateralIsETH &&
      collateralAddress &&
      new ethers.Contract(collateralAddress, ERC20_CONTRACT_ABI, signer),
    [collateralIsETH, collateralAddress, signer]
  );

  const multiCollateralContract = React.useMemo(
    () =>
      signer && short
        ? shortCollateralContract
        : collateralIsETH
        ? ethCollateralContract
        : erc20CollateralContract,
    [
      signer,
      short,
      collateralIsETH,
      erc20CollateralContract,
      ethCollateralContract,
      shortCollateralContract,
    ]
  );

  const onConnectOrApproveOrTrade = async () => {
    if (!signer) {
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
      return showErrorNotification(
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
      showTxNotification(`Approving ${collateralName}`, tx.hash);
      await tx.wait();
      showSuccessNotification(`Approved ${collateralName}`, tx.hash);

      if (collateralIsETH || !(signer && multiCollateralAddress && address))
        return setIsApproved(true);
      const allowance = await collateralContract.allowance(
        address,
        multiCollateralAddress
      );
      setIsApproved(allowance.gte(collateralAmount));
    } catch (e) {
      showErrorNotification(e);
    } finally {
      setIsApproving(false);
    }
  };

  const trade = async () => {
    try {
      if (targetAmount.isZero()) {
        return showErrorNotification(`Enter ${targetName} amount..`);
      }
      setIsTrading(true);
      const tx = await (collateralIsETH
        ? multiCollateralContract.open(
            targetAmount,
            multiCollateralTokenCurrencies[targetName],
            { value: collateralAmount }
          )
        : multiCollateralContract.open(
            collateralAmount,
            targetAmount,
            multiCollateralTokenCurrencies[targetName]
          ));
      showTxNotification(
        `${label}ing ${formatUnits(
          targetAmount,
          targetDecimals
        )} ${targetName}`,
        tx.hash
      );
      await tx.wait();
      showSuccessNotification(
        `${label}ed ${formatUnits(targetAmount, targetDecimals)} ${targetName}`,
        tx.hash
      );
    } catch (e) {
      showErrorNotification(e);
    } finally {
      setIsTrading(false);
    }
  };

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      if (
        collateralIsETH ||
        !(collateralContract && multiCollateralAddress && address)
      ) {
        return setIsApproved(true);
      }
      const allowance = await collateralContract.allowance(
        address,
        multiCollateralAddress
      );
      if (isMounted) setIsApproved(allowance.gte(collateralAmount));
    })();
    return () => (isMounted = false);
  }, [
    collateralIsETH,
    collateralContract,
    address,
    multiCollateralAddress,
    collateralAmount,
  ]);

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
            onChange={event => {
              const collateralName = event.target.value;
              setCollateralAsset(collateralName);
              const targetAssets = targetAssetsFilter(collateralName);
              setTargetAsset(targetAssets[0]);
              setTargetAssets(targetAssets);
            }}
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
              <Balance
                isETH={collateralIsETH}
                tokenAddress={collateralAddress}
              />
            </div>
          }
          type="number"
          inputProps={{
            step: 'any',
          }}
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
              <Balance tokenAddress={targetAddress} />
            </div>
          }
          type="number"
          inputProps={{
            step: 'any',
          }}
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
            : !signer
            ? 'Connect Wallet'
            : !isApproved
            ? 'Approve'
            : label}
        </Button>
      </div>
    </Paper>
  );
}
