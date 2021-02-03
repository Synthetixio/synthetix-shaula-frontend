import React from 'react';
import { Box, Button, DialogTitle, DialogContent } from '@material-ui/core';
import { useWallet } from 'contexts/wallet';
import { useNotifications } from 'contexts/notifications';
import { useStyles, CloseButton } from './utils';

export default function({ loan, closeModal }) {
  const classes = useStyles();
  const [isWorking, setIsWorking] = React.useState(false);
  const { collateralContracts } = useWallet();
  const { tx } = useNotifications();

  const close = async () => {
    try {
      setIsWorking('Closing...');
      await tx(
        `Closing loan(#${loan.id.toString()})`,
        `Loan(#${loan.id.toString()}) successfully closed.`,
        () => collateralContracts[loan.type].close(loan.id)
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
          <Button
            color="secondary"
            variant="outlined"
            onClick={close}
            disabled={!!isWorking}
          >
            {isWorking ? isWorking : 'CLOSE'}
          </Button>
        </Box>
      </DialogContent>
    </>
  );
}
