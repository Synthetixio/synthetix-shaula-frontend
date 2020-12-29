import './styles';

import React from 'react';
import { render } from 'react-dom';
import {
  ThemeProvider as MuiThemeProvider,
  makeStyles,
} from '@material-ui/core/styles';
import { CssBaseline } from '@material-ui/core';
import { SnackbarProvider } from 'notistack';

import muiTheme from 'utils/theme';
import { WalletProvider } from 'contexts/wallet';
import { NotificationsProvider } from 'contexts/notifications';
import Notification from 'components/Notification';
import * as serviceWorker from './serviceWorker';

import App from 'pages/App';

const useStyles = makeStyles(theme => ({
  snackbar: {
    top: 70,
  },
}));

(async () => {
  document.documentElement.classList.remove('anim-loading');
  document.getElementById('loader-container').remove();
  const root = document.createElement('div');
  root.setAttribute('id', 'root');
  document.body.appendChild(root);

  render(
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      <WalletProvider>
        <Shell />
      </WalletProvider>
    </MuiThemeProvider>,
    document.getElementById('root')
  );
})();

function Shell() {
  const classes = useStyles();

  return (
    <SnackbarProvider
      classes={{ root: classes.snackbar }}
      maxSnack={4}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      content={(key, data) => (
        <div>
          <Notification id={key} notification={data} />
        </div>
      )}
    >
      <NotificationsProvider>
        <App />
      </NotificationsProvider>{' '}
    </SnackbarProvider>
  );
}

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
