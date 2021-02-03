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
import WrongNetwork from './WrongNetwork';

const MARGIN = 2;

const useStyles = makeStyles(theme => {
  const margin = theme.spacing(MARGIN);
  return {
    container: {
      width: '960px',
      margin: '0 auto',
      padding: '100px 0 30px',
      position: 'relative',
      [theme.breakpoints.down('sm')]: {
        padding: '70px 0 10px',
        width: 'auto',
      },
    },
    grid: {
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
          <Box mb={MARGIN} className={clsx(classes.grid)}>
            <Borrow />
            <Short />
          </Box>
          <Box mb={MARGIN} className={clsx(classes.grid)}>
            <PendingWithdrawals />
            <Owings />
          </Box>
          <Box mb={MARGIN}>
            <Positions />
          </Box>
          <WrongNetwork />
        </>
      )}
    </div>
  );
}
