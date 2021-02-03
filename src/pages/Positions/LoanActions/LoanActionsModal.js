import React from 'react';
import { Dialog } from '@material-ui/core';
import { useStyles } from './utils';
import Deposit from './Deposit';
import Withdraw from './Withdraw';
import Repay from './Repay';
import Draw from './Draw';
import Close from './Close';

const ACTIONS = {
  DEPOSIT: Deposit,
  WITHDRAW: Withdraw,
  DRAW: Draw,
  REPAY: Repay,
  CLOSE: Close,
};

const noop = () => {};

export default function({ loan, action, collateralName, debtName, onClose }) {
  const classes = useStyles();
  const C = ACTIONS[action];
  return (
    <Dialog
      className={classes.container}
      onClose={noop}
      aria-labelledby={`${action} loan.`}
      open={!!C}
    >
      {!C ? null : (
        <C
          {...{
            loan,
            collateralName,
            debtName,
            closeModal: onClose,
          }}
        />
      )}
    </Dialog>
  );
}
