import React from 'react';
import clsx from 'clsx';
import { makeStyles } from '@material-ui/core/styles';

import Header from './Header';
import Borrow from './Borrow';
import Short from './Short';
import Positions from './Positions';
import PendingWithdrawals from './PendingWithdrawals';
import Owings from './Owings';
import WrongNetwork from './WrongNetwork';

const MARGIN = 14;

const useStyles = makeStyles(theme => ({
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
    columnGap: `${MARGIN}px`,
    gridTemplateColumns: '1fr 1fr',
    [theme.breakpoints.down('sm')]: {
      columnGap: 0,
      gridTemplateColumns: 'none',
      rowGap: `${MARGIN}px`,
      gridTemplateRows: '1fr 1fr',
    },
  },
  mb: {
    marginBottom: MARGIN,
  },
}));

export default function App() {
  const classes = useStyles();

  return (
    <div className={classes.container}>
      <Header />

      <div className={clsx(classes.grid, classes.mb)}>
        <Borrow />
        <Short />
      </div>

      <div className={clsx(classes.grid, classes.mb)}>
        <PendingWithdrawals />
        <Owings />
      </div>

      <div className={clsx(classes.mb)}>
        <Positions />
      </div>

      <WrongNetwork />
    </div>
  );
}
