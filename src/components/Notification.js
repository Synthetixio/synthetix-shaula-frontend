import React from 'react';
import clsx from 'clsx';
import { makeStyles } from '@material-ui/core/styles';
import { Paper } from '@material-ui/core';
import {
  ArrowUpward as TxIcon,
  Done as SuccessIcon,
  Clear as ErrorIcon,
  Close as CloseIcon,
} from '@material-ui/icons';
import { useSnackbar } from 'notistack';
import { useWallet } from 'contexts/wallet';
import { INFO_COLOR, DANGER_COLOR, SUCCESS_COLOR } from 'config';

const useStyles = makeStyles(theme => ({
  paper: {
    color: 'white',
  },
  container: {
    padding: '10px 20px 10px 10px',
    '& a': {
      color: 'white',
      display: 'block',
      textDecoration: 'underline',
    },
  },
  icon: {
    // border: '1px solid',
    // borderRadius: '50%',
    // padding: 10,
    marginRight: 10,
    display: 'inline-flex',
  },
  close: {
    position: 'absolute',
    top: 5,
    right: 5,
    cursor: 'pointer',
  },
  tx: {
    background: INFO_COLOR,
  },
  error: {
    background: DANGER_COLOR,
  },
  success: {
    background: SUCCESS_COLOR,
  },
  small: {
    fontSize: 12,
  },
}));

const TYPES = new Map([
  ['tx', [TxIcon, TxContent]],
  ['error', [ErrorIcon, ErrorContent]],
  ['success', [SuccessIcon, SuccessContent]],
]);

export default function({ id, notification }) {
  const classes = useStyles();
  const { closeSnackbar } = useSnackbar();
  const clearNotification = () => closeSnackbar(id);

  const [
    ,
    // Icon
    Content,
  ] = TYPES.get(notification.type);

  return (
    <Paper className={clsx(classes.paper, classes[notification.type])}>
      <div className={classes.close} onClick={clearNotification}>
        <CloseIcon style={{ fontSize: 15 }} />
      </div>
      <div
        className={clsx('flex', 'flex-grow', 'items-center', classes.container)}
      >
        <div
          className={clsx('flex', 'flex-grow', 'flex-col', 'justify-center')}
        >
          <Content {...{ notification }} />
        </div>
      </div>
    </Paper>
  );
}

function TxContent({ notification }) {
  const classes = useStyles();

  return (
    <>
      <strong className={classes.small}>{notification.description}</strong>
      <ViewOnEtherscan hash={notification.hash} />
    </>
  );
}

function ErrorContent({ notification }) {
  const classes = useStyles();
  return (
    <>
      <strong className={clsx(classes.small, classes.error)}>
        {notification.message}
      </strong>
    </>
  );
}

function SuccessContent({ notification }) {
  const classes = useStyles();
  return (
    <>
      <strong className={clsx(classes.small, classes.success)}>
        {notification.message}
      </strong>
      {!notification.hash ? null : <ViewOnEtherscan hash={notification.hash} />}
    </>
  );
}

function ViewOnEtherscan({ hash }) {
  const classes = useStyles();
  const { network } = useWallet();
  return (
    <a
      href={`https://${
        network === 'mainnet' ? '' : `${network}.`
      }etherscan.io/tx/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className={classes.small}
    >
      View on Etherscan
    </a>
  );
}
