import React from 'react';
import * as ethers from 'ethers';
import { makeStyles } from '@material-ui/core/styles';
import { Paper, Button } from '@material-ui/core';
import { useWallet } from 'contexts/wallet';
import Loader from 'components/Loader';
import { formatUnits } from 'utils/big-number';
import sleep from 'utils/sleep';
import { useNotifications } from 'contexts/notifications';

export const useStyles = makeStyles(theme => ({
  container: {
    background: 'rgb(16, 16, 78)', // 'linear-gradient(0deg, rgb(8, 2, 30) 0%, rgb(18, 4, 70) 146.21%)',
    padding: '20px 50px',
    borderRadius: 8,
    flex: 1,
    '& button': {
      width: 100,
      fontFamily: 'GT-America-Compressed-Regular',
      marginLeft: 10,
    },
    [theme.breakpoints.down('sm')]: {
      margin: 10,
    },
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  heading: {
    fontSize: 20,
    fontFamily: 'GT-America-Extended-Bold, "Work Sans", Arial',
  },
  p: {
    margin: '20px 0',
    display: 'flex',
    flex: 1,
  },
  paddingWrapper: {
    display: 'flex',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

export default function() {
  const classes = useStyles();
  const {
    showTxNotification,
    showErrorNotification,
    showSuccessNotification,
  } = useNotifications();

  const { signer, address, ethCollateralContract } = useWallet();

  const [isLoading, setIsLoading] = React.useState(false);
  const [isClaiming, setIsClaiming] = React.useState(false);
  const [pendingWithdrawals, setPendingWithdrawals] = React.useState(
    ethers.BigNumber.from('0')
  );

  const claim = async () => {
    try {
      setIsClaiming(true);
      const tx = await ethCollateralContract.claim(
        await ethCollateralContract.pendingWithdrawals(address)
      );
      showTxNotification(
        `Withdrawing ${formatUnits(pendingWithdrawals, 18)} ETH`,
        tx.hash
      );
      await tx.wait();
      showSuccessNotification(
        `You have successfully withdrawn ${formatUnits(
          pendingWithdrawals,
          18
        )} ETH.`
      );
      await sleep(1000);
      await loadPendingWithdrawals();
    } catch (e) {
      showErrorNotification(e);
    } finally {
      setIsClaiming(false);
    }
  };

  const loadPendingWithdrawals = async () => {
    if (!(ethCollateralContract && address)) return;
    setIsLoading(true);
    setPendingWithdrawals(
      await ethCollateralContract.pendingWithdrawals(address)
    );
    setIsLoading(false);
  };

  React.useEffect(() => {
    loadPendingWithdrawals(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ethCollateralContract, address]);

  return !signer ? null : (
    <Paper className={classes.container}>
      <div className={classes.content}>
        <div className={classes.heading}>Pending Withdrawals</div>
        <div className={classes.p}>
          {isLoading ? (
            <div className={classes.paddingWrapper}>
              <Loader />
            </div>
          ) : pendingWithdrawals.isZero() ? (
            <div className={classes.paddingWrapper}>
              You have no pending withdrawals.
            </div>
          ) : (
            <div>
              You have pending withdrawals totaling{' '}
              {formatUnits(pendingWithdrawals, 18)} ETH{' '}
              <Button
                color="secondary"
                variant="outlined"
                onClick={claim}
                disabled={isClaiming}
              >
                {isClaiming ? 'CLAIMING...' : 'CLAIM'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Paper>
  );
}
