import React from 'react';
import * as ethers from 'ethers';
import {
  Box,
  Button,
  DialogTitle,
  DialogContent,
  TextField,
} from '@material-ui/core';
import { useWallet } from 'contexts/wallet';
import { useNotifications } from 'contexts/notifications';
import Balance from 'components/Balance';
import ERC20_CONTRACT_ABI from 'abis/erc20.json';
import { useStyles, CloseButton } from './utils';

export default function({ loan, collateralName, closeModal }) {
  const classes = useStyles();
  const [isWorking, setIsWorking] = React.useState(false);
  const {
    collateralContracts,
    address,
    config: { tokens },
    signer,
  } = useWallet();
  const { tx } = useNotifications();
  const [isApproved, setIsApproved] = React.useState(false);

  const collateralIsETH = collateralName === 'ETH';
  const [collateralDecimals, collateralAddress] = tokens[collateralName];

  const [collateralAmountNumber, setCollateralAmountNumber] = React.useState(0);
  const collateralAmount = React.useMemo(() => {
    try {
      return ethers.utils.parseUnits(
        collateralAmountNumber.toString(),
        collateralIsETH ? 18 : collateralDecimals
      );
    } catch {
      return ethers.BigNumber.from('0');
    }
  }, [collateralIsETH, collateralAmountNumber, collateralDecimals]);

  const collateralContract = React.useMemo(
    () =>
      signer &&
      !collateralIsETH &&
      collateralAddress &&
      new ethers.Contract(collateralAddress, ERC20_CONTRACT_ABI, signer),
    [collateralIsETH, collateralAddress, signer]
  );

  const multiCollateralContract = collateralContracts[loan.type];
  const multiCollateralAddress = multiCollateralContract.address;

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

  const onApproveOrDeposit = async e => {
    e.preventDefault();
    !isApproved ? approve() : deposit();
  };

  const approve = async () => {
    try {
      setIsWorking('Approving...');
      await tx(
        `Approving ${collateralName}`,
        `Approved ${collateralName}`,
        () =>
          collateralContract.approve(multiCollateralAddress, collateralAmount)
      );

      if (collateralIsETH || !(signer && multiCollateralAddress && address))
        return setIsApproved(true);
      const allowance = await collateralContract.allowance(
        address,
        multiCollateralAddress
      );
      setIsApproved(allowance.gte(collateralAmount));
    } finally {
      setIsWorking(false);
    }
  };

  const deposit = async e => {
    try {
      setIsWorking('Depositing...');
      await tx(
        `Adding collateral to loan(#${loan.id.toString()})`,
        `Added collateral to loan(#${loan.id.toString()}).`,
        () =>
          multiCollateralContract.deposit(
            address,
            loan.id,
            collateralIsETH ? { value: collateralAmount } : collateralAmount
          )
      );
      closeModal();
    } catch {
      setIsWorking(false);
    }
  };

  return (
    <>
      <DialogTitle>
        Add collateral to loan(#{loan.id.toString()}){' '}
        <CloseButton onClose={closeModal} />
      </DialogTitle>
      <DialogContent className={classes.body}>
        <form onSubmit={onApproveOrDeposit}>
          <Box mb={2}>
            <TextField
              id="amount"
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
              required
              InputLabelProps={{
                shrink: true,
              }}
              value={collateralAmountNumber || ''}
              onChange={e => setCollateralAmountNumber(e.target.value || 0)}
              fullWidth
            />
          </Box>
          <Box mb={2}>
            <Button
              color="secondary"
              variant="outlined"
              disabled={!!isWorking}
              type="submit"
            >
              {isWorking ? isWorking : !isApproved ? 'Approve' : 'Deposit'}
            </Button>
          </Box>
        </form>
      </DialogContent>
    </>
  );
}
