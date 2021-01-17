import React from 'react';
import clsx from 'clsx';
import { makeStyles } from '@material-ui/core/styles';
import { Dialog, Button } from '@material-ui/core';
import { Close as Icon } from '@material-ui/icons';
import { useWallet } from 'contexts/wallet';

const useStyles = makeStyles(theme => ({
  container: {
    height: 450,
    padding: '30px 50px',
    lineHeight: '1.5rem',
    '& button': {
      width: '100%',
      padding: '10px 0',
      marginTop: 20,
      fontSize: 18,
      fontFamily: 'GT-America-Extended-Bold, "Work Sans", Arial',
    },
  },
  icon: {
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
  const { availableNetworkNames, network } = useWallet();
  const isOnCorrectNetwork = React.useMemo(
    () =>
      !(network && availableNetworkNames) ||
      ~availableNetworkNames.indexOf(network),
    [network, availableNetworkNames]
  );
  const onChange = () => window.location.reload();

  return (
    <Dialog
      onClose={() => {}}
      aria-labelledby="wrong-network-prompt"
      open={!isOnCorrectNetwork}
    >
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
          <div className={classes.icon}>
            <Icon style={{ fontSize: 50 }} />
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
          <div>You are connected to the wrong network.</div>

          <strong>
            Please connect to {availableNetworkNames.join(' or ')}.
          </strong>

          <Button
            color="secondary"
            variant="contained"
            fullWidth
            onClick={onChange}
          >
            I've Changed
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
