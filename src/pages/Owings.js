import React from 'react';
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
    signer,
    address,
    config: { multiCollateralTokenCurrencies },
    exchangerContract,
  } = useWallet();

  const [isLoading, setIsLoading] = React.useState(false);
  const [owings, setOwings] = React.useState([]);

  const hasOwings = React.useMemo(
    () => owings.length && !owings.find(owing => !owing.reclaimAmount.isZero()),
    [owings]
  );

  const loadOwings = async () => {};

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!(exchangerContract && multiCollateralTokenCurrencies && address)) {
        return setIsLoading(true);
      }
      const owings = [];
      for (const currency in multiCollateralTokenCurrencies) {
        owings.push({
          currency,
          ...(await exchangerContract.settlementOwing(
            address,
            multiCollateralTokenCurrencies[currency]
          )),
        });
      }
      if (isMounted) {
        setOwings(owings);
        setIsLoading(false);
      }
    })();
    return () => (isMounted = false);
  }, [exchangerContract, multiCollateralTokenCurrencies, address]);

  return !signer ? null : (
    <Paper className={classes.container}>
      <div className={classes.content}>
        <div className={classes.heading}>Owings</div>
        <div className={classes.p}>
          {isLoading ? (
            <div className={classes.paddingWrapper}>
              <Loader />
            </div>
          ) : hasOwings ? (
            <div className={classes.paddingWrapper}>
              You have no owings to settle.
            </div>
          ) : (
            owings.map(owing => (
              <Owing
                key={owing.currency}
                {...owing}
                {...{ loadOwings, exchangerContract }}
              />
            ))
          )}
        </div>
      </div>
    </Paper>
  );
}

function Owing({ exchangerContract, loadOwings, reclaimAmount, currency }) {
  // const classes = useStyles();
  const {
    showTxNotification,
    showErrorNotification,
    showSuccessNotification,
  } = useNotifications();

  const {
    address,
    config: { multiCollateralTokenCurrenciesByAddress },
  } = useWallet();

  const [isSettling, setIsSettling] = React.useState(false);

  const settle = async currency => {
    try {
      setIsSettling(true);
      const tx = await exchangerContract.settle(address, currency);
      showTxNotification(`Settling ${currency} owed.`, tx.hash);
      await tx.wait();
      showSuccessNotification(
        `You have successfully settled ${currency} owed.`
      );
      await sleep(1000);
      await loadOwings();
    } catch (e) {
      showErrorNotification(e);
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div>
      {formatUnits(reclaimAmount, 18)}{' '}
      {multiCollateralTokenCurrenciesByAddress[currency]}{' '}
      <Button
        color="secondary"
        variant="outlined"
        onClick={settle}
        disabled={isSettling}
      >
        {isSettling ? 'SETTLING...' : 'SETTLE'}
      </Button>
    </div>
  );
}
