import React from 'react';
import * as ethers from 'ethers';
import { Box, Button, DialogTitle, DialogContent } from '@material-ui/core';
import { useWallet } from 'contexts/wallet';
import { useNotifications } from 'contexts/notifications';
import { useStyles, CloseButton } from './utils';
import ERC20_CONTRACT_ABI from 'abis/erc20.json';
import { formatUnits } from 'utils/big-number';

export default function({ loan, collateralName, debtName, closeModal }) {
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

  const [collateralDecimals] = tokens[collateralName];
  const [debtDecimals, debtAddress] = tokens[debtName];
  const debtAmount = loan.amount;

  const debtContract = React.useMemo(
    () =>
      signer &&
      debtAddress &&
      new ethers.Contract(debtAddress, ERC20_CONTRACT_ABI, signer),
    [debtAddress, signer]
  );

  const multiDebtContract = collateralContracts[loan.type];
  const multiDebtAddress = multiDebtContract.address;

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!(debtContract && multiDebtAddress && address)) {
        return setIsApproved(true);
      }
      const allowance = await debtContract.allowance(address, multiDebtAddress);
      if (isMounted) setIsApproved(allowance.gte(debtAmount));
    })();
    return () => (isMounted = false);
  }, [debtContract, address, multiDebtAddress, debtAmount]);

  const onApproveOrClose = async e => {
    e.preventDefault();
    !isApproved ? approve() : close();
  };

  const approve = async () => {
    try {
      setIsWorking('Approving...');
      await tx(`Approving ${debtName}`, `Approved ${debtName}`, () =>
        debtContract.approve(multiDebtAddress, debtAmount)
      );

      if (!(signer && multiDebtAddress && address)) return setIsApproved(true);
      const allowance = await debtContract.allowance(address, multiDebtAddress);
      setIsApproved(allowance.gte(debtAmount));
    } finally {
      setIsWorking(false);
    }
  };

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
          You are paying {formatUnits(loan.amount, debtDecimals)} {debtName} to
          get back {formatUnits(loan.collateral, collateralDecimals)}{' '}
          {collateralName}.
        </Box>
        <Box mb={2}>
          <Button
            color="secondary"
            variant="outlined"
            onClick={onApproveOrClose}
            disabled={!!isWorking}
          >
            {isWorking ? isWorking : !isApproved ? 'Approve' : 'CLOSE LOAN'}
          </Button>
        </Box>
      </DialogContent>
    </>
  );
}
