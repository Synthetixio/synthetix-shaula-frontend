import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import clsx from 'clsx';
import { AppBar, Typography, Toolbar, Button, Box } from '@material-ui/core';
import { APP_TITLE } from 'config';
import { useWallet } from 'contexts/wallet';

const VERSIONS = [2, 1];

const useStyles = makeStyles(theme => ({
  container: {
    background:
      'linear-gradient(0deg, rgb(8, 2, 30) 0%, rgb(18, 4, 70) 146.21%)',
  },
  account: {
    marginRight: 10,
    [theme.breakpoints.down('sm')]: {
      display: 'none',
    },
  },
  buttonV2: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  buttonV1: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  buttonVInactive: {
    background: 'rgb(16, 16, 78)',
    color: 'white',
    '&:hover': {
      background: 'rgb(16, 16, 78)',
      color: 'white',
      opacity: 0.5,
    },
  },
}));

export default function Component() {
  const classes = useStyles();
  const {
    address,
    connect,
    disconnect,
    network,
    version,
    setVersion,
  } = useWallet();

  const shortAddress =
    address && `${address.slice(0, 6)}....${address.slice(-4)}`;

  return (
    <AppBar position="fixed" color="inherit" className={classes.container}>
      <Toolbar color="inherit">
        <Typography variant="h6" className={'flex flex-grow'}>
          <div className={'flex flex-col'}>
            <div>{APP_TITLE}</div>
          </div>
        </Typography>

        <Box mr={2}>
          {VERSIONS.map(v => (
            <Button
              color={v === version ? 'secondary' : 'default'}
              variant="contained"
              key={v}
              onClick={() => setVersion(v)}
              className={clsx(classes[`buttonV${v}`], {
                [classes.buttonVInactive]: v !== version,
              })}
            >
              V{v}
            </Button>
          ))}
        </Box>

        {address ? (
          <>
            &nbsp;
            <div className={classes.account}>
              {shortAddress} ({network.toUpperCase()})
            </div>
            <Button color="secondary" onClick={disconnect}>
              Disconnect
            </Button>
          </>
        ) : (
          <Button color="secondary" onClick={() => connect()}>
            Connect Wallet
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}
