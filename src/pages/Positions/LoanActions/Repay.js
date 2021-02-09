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
    address,
    config: { tokens },
  } = useWallet();
  const { tx, showErrorNotification } = useNotifications();

  const [debtDecimals, debtAddress] = tokens[debtName];

  const [debtAmountNumber, setDebtAmountNumber] = React.useState(0);
  const debtAmount = React.useMemo(() => {
    try {
      return ethers.utils.parseUnits(debtAmountNumber.toString(), debtDecimals);
    } catch {
      return ethers.BigNumber.from('0');
    }
  }, [debtAmountNumber, debtDecimals]);

  const loanContract = loanContracts[loan.type];

  const repay = async e => {
    e.preventDefault();
    if (debtAmount.gt(loan.amount)) {
      return showErrorNotification(
        'Repayment amount is greater than the debt.'
      );
    }
    if (debtAmount.eq(loan.amount)) {
      return showErrorNotification(
        'Consider closing the loan instead of performing a full repayment.'
      );
    }
    try {
      setIsWorking('Repaying...');
      await tx(
        `Repaying debt for loan(#${loan.id.toString()})`,
        `Repayed debt for loan(#${loan.id.toString()}).`,
        () => [loanContract, 'repay', [address, loan.id, debtAmount]]
      );
      closeModal();
    } catch {
      setIsWorking(false);
    }
  };

  return (
    <>
      <DialogTitle>
        Repay debt for loan(#{loan.id.toString()}){' '}
        <CloseButton onClose={closeModal} />
      </DialogTitle>
      <DialogContent className={classes.body}>
        <form onSubmit={repay}>
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
              value={debtAmountNumber || ''}
              onChange={e => setDebtAmountNumber(e.target.value || 0)}
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
              {isWorking ? isWorking : 'Repay'}
            </Button>
          </Box>
        </form>
      </DialogContent>
    </>
  );
}
