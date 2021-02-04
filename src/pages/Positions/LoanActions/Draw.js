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

export default function({ loan, debtName, closeModal }) {
  const classes = useStyles();
  const [isWorking, setIsWorking] = React.useState(false);
  const {
    loanContracts,
    config: { tokens },
  } = useWallet();
  const { tx } = useNotifications();

  const [decimals, debtAddress] = tokens[debtName];

  const draw = async e => {
    e.preventDefault();
    const amount = ethers.utils.parseUnits(e.target.amount.value, decimals);
    try {
      setIsWorking('Drawing...');
      await tx(
        `Increasing debt for loan(#${loan.id.toString()})`,
        `Increased debt for loan(#${loan.id.toString()}).`,
        () => [loanContracts[loan.type], 'draw', [loan.id, amount]]
      );
      closeModal();
    } catch {
      setIsWorking(false);
    }
  };

  return (
    <>
      <DialogTitle>
        Increase debt for loan(#{loan.id.toString()}){' '}
        <CloseButton onClose={closeModal} />
      </DialogTitle>
      <DialogContent className={classes.body}>
        <form onSubmit={draw}>
          <Box mb={2}>
            <TextField
              id="amount"
              label={
                <div className="flex flex-grow justify-space">
                  <div>Debt Amount ({debtName})</div>
                  <Balance tokenAddress={debtAddress} />
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
              {isWorking ? isWorking : 'Draw'}
            </Button>
          </Box>
        </form>
      </DialogContent>
    </>
  );
}
