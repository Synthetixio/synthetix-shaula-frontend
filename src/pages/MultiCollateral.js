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

export default function({ collateralAssets, debtAssetsFilter, short }) {
  const classes = useStyles();
  const label = short ? 'Short' : 'Borrow';

  const { tx, showErrorNotification } = useNotifications();

  const {
    signer,
    address,
    connect,
    config: {
      tokens,
      tokenCurrencies,
      erc20LoanContractAddress,
      ethLoanContractAddress,
      shortLoanContractAddress,
    },

    erc20LoanContract,
    ethLoanContract,
    shortLoanContract,
  } = useWallet();

  const [isApproving, setIsApproving] = React.useState(false);
  const [isApproved, setIsApproved] = React.useState(false);
  const [isTrading, setIsTrading] = React.useState(false);

  const [debtName, setDebtAsset] = React.useState(
    debtAssetsFilter(collateralAssets[0])[0]
  );
  const [debtAssets, setDebtAssets] = React.useState(
    debtAssetsFilter(collateralAssets[0])
  );
  const [debtDecimals, debtAddress] = React.useMemo(
    () => (tokens && debtName && tokens[debtName]) ?? [],
    [tokens, debtName]
  );

  const [debtAmountNumber, setDebtAmountNumber] = React.useState(0);
  const debtAmount = React.useMemo(() => {
    try {
      return ethers.utils.parseUnits(debtAmountNumber.toString(), debtDecimals);
    } catch {
      return ethers.BigNumber.from('0');
    }
  }, [debtAmountNumber, debtDecimals]);

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

  const loanContractAddress = short
    ? shortLoanContractAddress
    : collateralIsETH
    ? ethLoanContractAddress
    : erc20LoanContractAddress;

  const collateralContract = React.useMemo(
    () =>
      signer &&
      !collateralIsETH &&
      collateralAddress &&
      new ethers.Contract(collateralAddress, ERC20_CONTRACT_ABI, signer),
    [collateralIsETH, collateralAddress, signer]
  );

  const loanContract = React.useMemo(
    () =>
      signer && short
        ? shortLoanContract
        : collateralIsETH
        ? ethLoanContract
        : erc20LoanContract,
    [
      signer,
      short,
      collateralIsETH,
      erc20LoanContract,
      ethLoanContract,
      shortLoanContract,
    ]
  );

  const onConnectOrApproveOrTrade = async () => {
    if (!signer) {
      return connect();
    }
    let minCollateral = await loanContract.minCollateral();
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

      await tx(
        `Approving ${collateralName}`,
        `Approved ${collateralName}`,
        () => [
          collateralContract,
          'approve',
          [loanContractAddress, collateralAmount],
        ]
      );

      if (collateralIsETH || !(signer && loanContractAddress && address))
        return setIsApproved(true);
      const allowance = await collateralContract.allowance(
        address,
        loanContractAddress
      );
      setIsApproved(allowance.gte(collateralAmount));
    } catch {
    } finally {
      setIsApproving(false);
    }
  };

  const trade = async () => {
    try {
      if (debtAmount.isZero()) {
        return showErrorNotification(`Enter ${debtName} amount..`);
      }
      setIsTrading(true);

      await tx(
        `${label}ing ${formatUnits(debtAmount, debtDecimals)} ${debtName}`,
        `${label}ed ${formatUnits(debtAmount, debtDecimals)} ${debtName}`,
        () => [
          loanContract,
          'open',
          collateralIsETH
            ? [
                debtAmount,
                tokenCurrencies[debtName],
                {
                  value: collateralAmount,
                },
              ]
            : [collateralAmount, debtAmount, tokenCurrencies[debtName]],
        ]
      );
    } catch {
    } finally {
      setIsTrading(false);
    }
  };

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      if (
        collateralIsETH ||
        !(collateralContract && loanContractAddress && address)
      ) {
        return setIsApproved(true);
      }
      const allowance = await collateralContract.allowance(
        address,
        loanContractAddress
      );
      if (isMounted) setIsApproved(allowance.gte(collateralAmount));
    })();
    return () => (isMounted = false);
  }, [
    collateralIsETH,
    collateralContract,
    address,
    loanContractAddress,
    collateralAmount,
  ]);

  return (
    <Paper className={classes.container}>
      <div className={classes.content}>
        <div className={classes.heading}>{label}</div>

        <div className={classes.p}>
          <span className="mr">{label}</span>
          <Select
            labelId="debtNameLabel"
            id="debtName"
            value={debtName}
            onChange={e => setDebtAsset(e.target.value)}
          >
            {debtAssets.map(name => (
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
            onChange={e => {
              const collateralName = e.target.value;
              setCollateralAsset(collateralName);
              const debtAssets = debtAssetsFilter(collateralName);
              setDebtAsset(debtAssets[0]);
              setDebtAssets(debtAssets);
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
          id="debtAmount"
          label={
            <div className="flex flex-grow justify-space">
              <div>
                {label} Amount ({debtName})
              </div>
              <Balance tokenAddress={debtAddress} />
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
          onChange={e => setDebtAmountNumber(e.target.value || 0)}
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
