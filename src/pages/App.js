import React from 'react';
import clsx from 'clsx';
import { makeStyles } from '@material-ui/core/styles';
import { Box } from '@material-ui/core';

import { useWallet } from 'contexts/wallet';
import Loader from 'components/Loader';
import Header from './Header';
import Borrow from './Borrow';
import Short from './Short';
import Positions from './Positions';
import PendingWithdrawals from './PendingWithdrawals';
import Owings from './Owings';
import ShortingRewards from './ShortingRewards';
import Stats from './Stats';
import WrongNetwork from './WrongNetwork';

const MARGIN = 2;

const useStyles = makeStyles(theme => {
  const margin = theme.spacing(MARGIN);
  return {
    container: {
      margin: '0 50px',
      padding: '100px 0 30px',
      position: 'relative',
      [theme.breakpoints.down('sm')]: {
        padding: '70px 0 10px',
        width: 'auto',
      },
      '& th, td': {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
    },
    formGrid: {
      display: 'grid',
      columnGap: `${margin}px`,
      gridTemplateColumns: '1fr 1fr',
      [theme.breakpoints.down('sm')]: {
        columnGap: 0,
        gridTemplateColumns: 'none',
        rowGap: `${margin}px`,
        gridTemplateRows: '1fr 1fr',
      },
    },
    withdrawals: {
      gridArea: 'withdrawals',
    },
    owings: {
      gridArea: 'owings',
    },
    rewards: {
      gridArea: 'rewards',
    },
    stats: {
      gridArea: 'stats',
    },
    statsGrid: {
      display: 'grid',
      columnGap: `${margin}px`,
      rowGap: `${margin}px`,
      gridTemplateColumns: '1fr 1fr 1fr',
      gridTemplateAreas: `
        "withdrawals  rewards stats"
        "owings rewards stats"
      `.trim(),

      //
      // [theme.breakpoints.down('sm')]: {
      //   columnGap: 0,
      //   gridTemplateColumns: 'none',
      //   rowGap: `${margin}px`,
      //   gridTemplateRows: '1fr 1fr 1fr',
      // },
    },
  };
});

export default function App() {
  const classes = useStyles();
  const { isLoaded: walletIsLoaded } = useWallet();

  return (
    <div className={classes.container}>
      <Header />
      {!walletIsLoaded ? (
        <Box pt={20}>
          <Loader />
        </Box>
      ) : (
        <>
          <Box mb={MARGIN} className={clsx(classes.formGrid)}>
            <Borrow />
            <Short />
          </Box>
          <Box mb={MARGIN}>
            <Positions />
          </Box>
          <Box mb={MARGIN} className={clsx(classes.statsGrid)}>
            <PendingWithdrawals className={classes.withdrawals} />
            <Owings className={classes.owings} />
            <ShortingRewards className={classes.rewards} />
            <Stats className={classes.stats} />
          </Box>
          <WrongNetwork />
        </>
      )}
    </div>
  );
}
