import React from 'react';
import clsx from 'clsx';
import { makeStyles } from '@material-ui/core/styles';
import { Dialog, Button } from '@material-ui/core';
import {
  ArrowUpward as SubmittedIcon,
  Close as CloseIcon,
} from '@material-ui/icons';
import { useNotifications } from 'contexts/notifications';
import { useWallet } from 'contexts/wallet';

const useStyles = makeStyles(theme => ({
  container: {
    width: 380,
    height: 450,
    padding: '30px 50px',
    lineHeight: '1.5rem',
    '& a': {
      color: theme.palette.secondary.main,
      display: 'block',
      textDecoration: 'underline',
    },
    '& button': {
      width: '100%',
      padding: '10px 0',
      marginTop: 20,
      fontSize: 18,
      fontFamily: 'GT-America-Extended-Bold, "Work Sans", Arial',
    },
  },
  arrow: {
    fontSize: 70,
    border: '1px solid',
    borderRadius: '50%',
    padding: 20,
  },
  bottom: {
    width: '100%',
  },
  close: {
    position: 'absolute',
    top: 15,
    right: 15,
    cursor: 'pointer',
  },
}));

export default function() {
  const classes = useStyles();
  const { notification, clearNotification } = useNotifications();
  const { network } = useWallet();

  return (
    <Dialog
      onClose={clearNotification}
      aria-labelledby="notification"
      open={!!notification}
    >
      {!notification ? null : (
        <>
          {' '}
          <div className={classes.close} onClick={clearNotification}>
            <CloseIcon />
          </div>
          <div
            className={clsx(
              'flex',
              'flex-grow',
              'flex-col',
              'items-center',
              classes.container
            )}
          >
            <div
              className={clsx(
                classes.top,
                'flex',
                'flex-grow',
                'items-center',
                'justify-center'
              )}
            >
              <div className={classes.arrow}>
                <SubmittedIcon style={{ fontSize: 50 }} />
              </div>
            </div>

            <div
              className={clsx(
                classes.bottom,
                'flex',
                'flex-col',
                'items-center',
                'justify-center'
              )}
            >
              <div>Transaction Submitted</div>

              <strong>{notification.description}</strong>

              <a
                href={`https://${
                  network === 'mainnet' ? '' : `${network}.`
                }etherscan.io/tx/${notification.hash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Etherscan
              </a>

              <Button
                color="secondary"
                variant="contained"
                fullWidth
                onClick={clearNotification}
              >
                Close
              </Button>
            </div>
          </div>
        </>
      )}
    </Dialog>
  );
}
