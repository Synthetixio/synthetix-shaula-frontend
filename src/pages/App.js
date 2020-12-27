import React from 'react';
import clsx from 'clsx';
import { Router } from 'react-router-dom';
import {
  ThemeProvider as MuiThemeProvider,
  makeStyles,
} from '@material-ui/core/styles';
import { CssBaseline } from '@material-ui/core';
import { createHashHistory } from 'history';
import { useTheme, useMuiTheme } from 'contexts/theme';

import Header from 'components/Header';
import Borrow from './Borrow';
import Short from './Short';
import Positions from './Positions';

const history = createHashHistory();

const MARGIN = 14;

const useStyles = makeStyles(theme => ({
  container: {
    width: '960px',
    margin: '0 auto',
    padding: '100px 0 30px',
    position: 'relative',
    [theme.breakpoints.down('sm')]: {
      padding: '130px 0 10px',
      width: 'auto',
    },
  },
  types: {
    marginBottom: MARGIN,
    // margin: '20px 15px',
    // [theme.breakpoints.down('sm')]: {
    //   margin: '20px 5px',
    // },
  },
  ml: {
    marginLeft: MARGIN / 2,
  },
  mr: {
    marginRight: MARGIN / 2,
  },
}));

export default function App() {
  const classes = useStyles();
  const { isDark } = useTheme();
  const muiTheme = useMuiTheme();

  React.useEffect(() => {
    const root = document.documentElement;
    if (root.classList.contains(isDark ? 'light' : 'dark')) {
      root.classList.remove(isDark ? 'light' : 'dark');
      root.classList.add(isDark ? 'dark' : 'light');
    }
  }, [isDark]);

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Router {...{ history }}>
        <div className={classes.container}>
          <Header />
          <div className={clsx(classes.types, 'flex flex-grow justify-space')}>
            <div className={clsx(classes.mr, 'flex', 'flex-grow')}>
              <Borrow />
            </div>
            <div className={clsx(classes.ml, 'flex', 'flex-grow')}>
              <Short />
            </div>
          </div>
          <Positions />
        </div>
      </Router>
    </MuiThemeProvider>
  );
}
