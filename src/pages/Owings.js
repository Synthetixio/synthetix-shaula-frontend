import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import clsx from 'clsx';
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
  },
}));

export default function({ className }) {
  const classes = useStyles();

  const {
    address,
    config: { tokenKeysByName },
    exchangerContract,
  } = useWallet();

  const [isLoading, setIsLoading] = React.useState(false);
  const [owings, setOwings] = React.useState([]);

  const loadOwings = async ({
    exchangerContract,
    address,
    isMounted,
    setOwings,
    setIsLoading,
    tokenKeysByName,
  }) => {
    const getOwingsByCurrency = async ([currency, key]) => ({
      currency,
      ...(await exchangerContract.settlementOwing(address, key)),
    });
    const owings = (
      await Promise.all(
        Object.entries(tokenKeysByName).map(getOwingsByCurrency)
      )
    ).filter(o => !o.reclaimAmount.isZero());
    if (isMounted) {
      setOwings(owings);
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (!(exchangerContract && tokenKeysByName && address)) return;

    let isMounted = true;
    const unsubs = [() => (isMounted = false)];

    const load = async () => {
      loadOwings({
        exchangerContract,
        address,
        isMounted,
        setOwings,
        setIsLoading,
        tokenKeysByName,
      });
    };

    // const subscribe = () => {
    //   const settleEvent = exchangerContract.filters.Settled();
    //   exchangerContract.on(settleEvent, load);
    //   unsubs.push(() => exchangerContract.off(settleEvent, load));
    // };

    setIsLoading(true);
    load();
    // subscribe();
    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [exchangerContract, tokenKeysByName, address]);

  return (
    <Paper className={clsx(classes.container, className)}>
      <div className={classes.content}>
        <div className={classes.heading}>Owings</div>
        <div className={classes.p}>
          {isLoading ? (
            <div className={clsx(classes.paddingWrapper, 'justify-center')}>
              <Loader />
            </div>
          ) : !address ? (
            '-'
          ) : !owings.length ? (
            <div className={classes.paddingWrapper}>
              You have no owings to settle.
            </div>
          ) : (
            owings.map(owing => (
              <Owing key={owing.currency} {...owing} {...{ loadOwings }} />
            ))
          )}
        </div>
      </div>
    </Paper>
  );
}

function Owing({ loadOwings, reclaimAmount, currency }) {
  // const classes = useStyles();
  const { tx } = useNotifications();

  const {
    address,
    exchangerContract,
    config: { tokenKeysByKey },
  } = useWallet();

  const [isSettling, setIsSettling] = React.useState(false);

  const settle = async () => {
    try {
      setIsSettling(true);
      await tx(
        `Settling ${currency} owed.`,
        `You have successfully settled ${currency} owed.`,
        () => [exchangerContract, 'settle', [address, currency]]
      );
      await sleep(1000);
      await loadOwings();
    } catch {
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div>
      {formatUnits(reclaimAmount, 18)} {tokenKeysByKey[currency]}{' '}
      <Button
        color="secondary"
        variant="outlined"
        onClick={settle}
        size="small"
        disabled={isSettling}
      >
        {isSettling ? 'SETTLING...' : 'SETTLE'}
      </Button>
    </div>
  );
}
