import React from 'react';
import clsx from 'clsx';
import {
  ThemeProvider as MuiThemeProvider,
  makeStyles,
} from '@material-ui/core/styles';
import { CssBaseline } from '@material-ui/core';
import muiTheme from 'utils/theme';

import Header from 'components/Header';
import Borrow from './Borrow';
import Short from './Short';
import Positions from './Positions';
import PendingWithdrawals from './PendingWithdrawals';
import Notification from './Notification';

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
  types: {
    [theme.breakpoints.down('sm')]: {
      flexDirection: 'column',
      marginBottom: '0',
    },
  },
  ml: {
    marginLeft: MARGIN / 2,
    [theme.breakpoints.down('sm')]: {
      margin: '0 10px 10px',
    },
  },
  mr: {
    marginRight: MARGIN / 2,
    [theme.breakpoints.down('sm')]: {
      margin: '0 10px 10px',
    },
  },
  mb: {
    marginBottom: MARGIN,
  },
}));

export default function App() {
  const classes = useStyles();

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      <div className={classes.container}>
        <Header />
        <div
          className={clsx(
            classes.types,
            classes.mb,
            'flex flex-grow justify-space'
          )}
        >
          <div className={clsx(classes.mr, 'flex', 'flex-grow')}>
            <Borrow />
          </div>
          <div className={clsx(classes.ml, 'flex', 'flex-grow')}>
            <Short />
          </div>
        </div>
        <div className={clsx(classes.mb)}>
          <PendingWithdrawals />
        </div>
        <div className={clsx(classes.mb)}>
          <Positions />
        </div>
      </div>
      <Notification />
    </MuiThemeProvider>
  );
}
