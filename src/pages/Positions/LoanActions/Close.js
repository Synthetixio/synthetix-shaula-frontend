import React from 'react';
import { Box, Button, DialogTitle, DialogContent } from '@material-ui/core';
import { useWallet } from 'contexts/wallet';
import { useNotifications } from 'contexts/notifications';
import { useStyles, CloseButton } from './utils';
import { formatUnits } from 'utils/big-number';

export default function({ loan, collateralName, debtName, closeModal }) {
  const classes = useStyles();
  const [isWorking, setIsWorking] = React.useState(false);
  const {
    loanContracts,
    config: { tokens },
  } = useWallet();
  const { tx } = useNotifications();

  // const [collateralDecimals] = tokens[collateralName]; // renBTC shoul be 8
  const collateralDecimals = 18;
  const [debtDecimals] = tokens[debtName];

  const loanContract = loanContracts[loan.type];

  const close = async () => {
    try {
      setIsWorking('Closing...');
      await tx(
        `Closing loan(#${loan.id.toString()})`,
        `Loan(#${loan.id.toString()}) successfully closed.`,
        () => [loanContract, 'close', [loan.id]]
      );
      closeModal();
    } catch {
      setIsWorking(false);
    }
  };

  return (
    <>
      <DialogTitle>
        Close loan #{loan.id.toString()} <CloseButton onClose={closeModal} />
      </DialogTitle>
      <DialogContent className={classes.body}>
        <Box mb={2}>
          You are paying {formatUnits(loan.amount, debtDecimals)} {debtName} to
          get back {formatUnits(loan.collateral, collateralDecimals)}{' '}
          {collateralName}.
        </Box>
        <Box mb={2}>
          <Button
            color="secondary"
            variant="outlined"
            onClick={close}
            disabled={!!isWorking}
          >
            {isWorking ? isWorking : 'CLOSE LOAN'}
          </Button>
        </Box>
      </DialogContent>
    </>
  );
}
