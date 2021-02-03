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

export default function({ loan, debtName, closeModal }) {
  const classes = useStyles();
  const [isWorking, setIsWorking] = React.useState(false);
  const {
    loanContracts,
    address,
    config: { tokens },
    signer,
  } = useWallet();
  const { tx } = useNotifications();
  const [isApproved, setIsApproved] = React.useState(false);

  const [debtDecimals, debtAddress] = tokens[debtName];

  const [debtAmountNumber, setDebtAmountNumber] = React.useState(0);
  const debtAmount = React.useMemo(() => {
    try {
      return ethers.utils.parseUnits(debtAmountNumber.toString(), debtDecimals);
    } catch {
      return ethers.BigNumber.from('0');
    }
  }, [debtAmountNumber, debtDecimals]);

  const debtContract = React.useMemo(
    () =>
      signer &&
      debtAddress &&
      new ethers.Contract(debtAddress, ERC20_CONTRACT_ABI, signer),
    [debtAddress, signer]
  );

  const loanContract = loanContracts[loan.type];
  const loanContractAddress = loanContract.address;

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!(debtContract && loanContractAddress && address)) {
        return setIsApproved(true);
      }
      const allowance = await debtContract.allowance(
        address,
        loanContractAddress
      );
      if (isMounted) setIsApproved(allowance.gte(debtAmount));
    })();
    return () => (isMounted = false);
  }, [debtContract, address, loanContractAddress, debtAmount]);

  const onApproveOrRepay = async e => {
    e.preventDefault();
    !isApproved ? approve() : repay();
  };

  const approve = async () => {
    try {
      setIsWorking('Approving...');
      await tx(`Approving ${debtName}`, `Approved ${debtName}`, () =>
        debtContract.approve(loanContractAddress, debtAmount)
      );

      if (!(signer && loanContractAddress && address))
        return setIsApproved(true);
      const allowance = await debtContract.allowance(
        address,
        loanContractAddress
      );
      setIsApproved(allowance.gte(debtAmount));
    } finally {
      setIsWorking(false);
    }
  };

  const repay = async e => {
    try {
      setIsWorking('Repaying...');
      await tx(
        `Repaying debt for loan(#${loan.id.toString()})`,
        `Repaying debt for loan(#${loan.id.toString()}).`,
        () => loanContract.repay(address, loan.id, debtAmount)
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
        <form onSubmit={onApproveOrRepay}>
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
              {isWorking ? isWorking : !isApproved ? 'Approve' : 'Repay'}
            </Button>
          </Box>
        </form>
      </DialogContent>
    </>
  );
}
