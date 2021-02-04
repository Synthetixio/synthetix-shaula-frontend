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
import { useStyles, CloseButton } from './utils';

export default function({ loan, collateralName, closeModal }) {
  const classes = useStyles();
  const [isWorking, setIsWorking] = React.useState(false);
  const {
    loanContracts,
    config: { tokens },
  } = useWallet();
  const { tx } = useNotifications();

  const collateralIsETH = collateralName === 'ETH';
  const [decimals, collateralAddress] = tokens[collateralName];

  const withdraw = async e => {
    e.preventDefault();
    const amount = ethers.utils.parseUnits(
      e.target.amount.value,
      collateralIsETH ? 18 : decimals
    );
    try {
      setIsWorking('Withdrawing...');
      await tx(
        `Withdrawing collateral to loan(#${loan.id.toString()})`,
        `Withdrew collateral to loan(#${loan.id.toString()}).`,
        () => [loanContracts[loan.type], 'withdraw', [loan.id, amount]]
      );
      closeModal();
    } catch {
      setIsWorking(false);
    }
  };

  return (
    <>
      <DialogTitle>
        Withdraw collateral from loan(#{loan.id.toString()}){' '}
        <CloseButton onClose={closeModal} />
      </DialogTitle>
      <DialogContent className={classes.body}>
        <form onSubmit={withdraw}>
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
              {isWorking ? isWorking : 'Withdraw'}
            </Button>
          </Box>
        </form>
      </DialogContent>
    </>
  );
}
