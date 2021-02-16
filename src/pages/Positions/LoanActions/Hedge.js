import React from 'react';
import * as ethers from 'ethers';
import { Box, Button, DialogTitle, DialogContent } from '@material-ui/core';
import { useWallet } from 'contexts/wallet';
import { useNotifications } from 'contexts/notifications';
import { formatUnits, Big } from 'utils/big-number';
import * as request from 'utils/request';
import { useStyles, CloseButton } from './utils';

export default function({ loan, debtName, closeModal }) {
  const classes = useStyles();
  const {
    makeErc20Contract,
    config: { tokens },
    signer,
    address,
  } = useWallet();
  const {
    tx,
    showErrorNotification,
    showSuccessNotification,
    showTxNotification,
  } = useNotifications();
  const [isWorking, setIsWorking] = React.useState(false);
  const [requiresApproval, setRequiresApproval] = React.useState(false);
  const [estimatedGas, setEstimatedGas] = React.useState(null);
  const [oneInchSpenderAddress, setOneInchSpenderAddress] = React.useState(
    null
  );

  const fromAssetName = 'sUSD';
  const [fromAssetDecimals, fromAssetAddress] = tokens[fromAssetName];
  const [fromAssetAmount, setFromAssetAmount] = React.useState(Big(0));
  const fromAssetContract = React.useMemo(
    () => makeErc20Contract(fromAssetAddress),
    [makeErc20Contract, fromAssetAddress]
  );

  const toAssetName = { sBTC: 'WBTC', sETH: 'ETH' }[debtName];
  const [toAssetDecimals, toAssetAddress] = tokens[toAssetName];
  const toAssetAmount = React.useMemo(
    () =>
      Big(loan.amount)
        .div(1e18)
        .mul(Math.pow(10, toAssetDecimals)),
    [loan.amount, toAssetDecimals]
  );

  const approveOrHedge = () => (requiresApproval ? approve() : hedge());

  const approve = async () => {
    try {
      setIsWorking('Approving...');
      await tx('Approving...', 'Approved', () => [
        fromAssetContract,
        'approve',
        [
          oneInchSpenderAddress,
          ethers.utils.parseUnits(fromAssetAmount.div(1e18).toString(), 18),
        ],
      ]);
    } catch {
    } finally {
      setIsWorking(false);
    }
  };

  const hedge = async () => {
    try {
      setIsWorking('Hedging...');
      const {
        tx: {
          from,
          to,
          data,
          value,
          // gasPrice,
          // gas
        },
      } = await request.get('https://api.1inch.exchange/v2.0/swap', {
        fromTokenAddress: fromAssetAddress,
        toTokenAddress: toAssetAddress,
        amount: fromAssetAmount.toString(),
        fromAddress: address,
        slippage: 1,
      });
      const tx = await signer.sendTransaction({
        from,
        to,
        data,
        value: ethers.BigNumber.from(value),
        // gasPrice,
        // gas
      });
      showTxNotification(`Hedging loan(#${loan.id.toString()})`, tx.hash);
      await tx.wait();
      showSuccessNotification(
        `Loan(#${loan.id.toString()}) successfully hedged.`,
        tx.hash
      );
    } catch (err) {
      showErrorNotification(err);
    } finally {
      setIsWorking(false);
    }
  };

  React.useEffect(() => {
    let isMounted = true;
    const unsubs = [() => (isMounted = false)];

    const load = async () => {
      const [
        { address: spenderAddress },
        { toTokenAmount, estimatedGas },
      ] = await Promise.all([
        request.get('https://api.1inch.exchange/v2.0/approve/spender'),
        request.get('https://api.1inch.exchange/v2.0/quote', {
          fromTokenAddress: toAssetAddress,
          toTokenAddress: fromAssetAddress,
          amount: toAssetAmount.toString(),
        }),
      ]);

      const fromAssetAmount = Big(toTokenAmount);

      // console.log({
      //   spenderAddress,
      //   estimatedGas: estimatedGas.toString(),
      //   fromAssetAmount: fromAssetAmount.toString(),
      //   toAssetAmount: toAssetAmount.toString(),
      // });

      const allowance = await fromAssetContract.allowance(
        address,
        spenderAddress
      );
      const requiresApproval = fromAssetAmount.gt(allowance);
      if (isMounted) {
        setOneInchSpenderAddress(spenderAddress);
        setRequiresApproval(requiresApproval);
        setEstimatedGas(estimatedGas);
        setFromAssetAmount(fromAssetAmount);
      }
    };

    load();

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [
    address,
    fromAssetAddress,
    fromAssetContract,
    toAssetAddress,
    toAssetAmount,
  ]);

  return (
    <>
      <DialogTitle>
        Hedge loan #{loan.id.toString()} <CloseButton onClose={closeModal} />
      </DialogTitle>
      <DialogContent className={classes.body}>
        <Box mb={2}>
          Swapping {formatUnits(fromAssetAmount, fromAssetDecimals, 2)}{' '}
          {fromAssetName} for {formatUnits(toAssetAmount, toAssetDecimals, 2)}{' '}
          {toAssetName}
          <br />
          {!estimatedGas ? null : (
            <Box>
              <small>(Gas Fee: {estimatedGas})</small>
            </Box>
          )}
        </Box>
        <Box mb={2}>
          <Button
            color="secondary"
            variant="outlined"
            onClick={approveOrHedge}
            disabled={!!isWorking}
          >
            {isWorking
              ? isWorking
              : requiresApproval
              ? 'APPROVE'
              : 'HEDGE LOAN'}
          </Button>
        </Box>
      </DialogContent>
    </>
  );
}
