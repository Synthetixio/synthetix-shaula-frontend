import React from 'react';
import moment from 'moment';
import { makeStyles } from '@material-ui/core/styles';
import {
  Paper,
  Button,
  Popper,
  MenuList,
  MenuItem,
  ClickAwayListener,
  Grow,
  Box,
} from '@material-ui/core';
import { ArrowDropDown as ArrowDropDownIcon } from '@material-ui/icons';
import { useWallet } from 'contexts/wallet';
import { Big } from 'utils/big-number';
import { LOAN_TYPE_SHORT } from 'config';

const ACTIONS = ['DEPOSIT', 'WITHDRAW', 'REPAY', 'DRAW', 'CLOSE'];

export const useStyles = makeStyles(theme => ({
  root: {
    zIndex: 1,
  },
  container: {
    background: 'rgb(53, 197, 243)',
    color: 'rgb(6, 6, 27)',
  },
  interactionInfoBox: {
    width: 200,
    textAlign: 'left',
  },
}));

export default function({ loan, onAct }) {
  const classes = useStyles();
  const anchorRef = React.useRef(null);
  const { interactionDelays } = useWallet();
  const [open, setOpen] = React.useState(false);
  const [waitETA, setWaitETA] = React.useState('');

  const nextInteractionDate = React.useMemo(() => {
    if (!(loan.type && interactionDelays && loan.type in interactionDelays))
      return;
    const interactionDelay = interactionDelays[loan.type];
    return moment
      .unix(parseInt(loan.lastInteraction.toString()))
      .add(parseInt(interactionDelay.toString()), 'seconds');
  }, [loan.type, loan.lastInteraction, interactionDelays]);

  const actions = ACTIONS.slice();
  if (loan.type === LOAN_TYPE_SHORT) {
    actions.push('HEDGE');
  }

  const handleMenuItemClick = (event, index) => {
    onAct(actions[index]);
    setOpen(false);
  };

  const handleToggle = () => {
    setOpen(prevOpen => !prevOpen);
  };

  const handleClose = event => {
    if (anchorRef.current && anchorRef.current.contains(event.target)) {
      return;
    }

    setOpen(false);
  };

  React.useEffect(() => {
    if (!nextInteractionDate) return;

    let isMounted = true;
    const unsubs = [() => (isMounted = false)];

    const timer = () => {
      const intervalId = setInterval(() => {
        const now = moment.utc();
        if (now.isAfter(nextInteractionDate)) {
          return stopTimer();
        }
        if (isMounted) {
          setWaitETA(
            toHumanizedDuration(Big(nextInteractionDate.diff(now, 'seconds')))
          );
        }
      }, 1000);

      const stopTimer = () => {
        if (isMounted) {
          setWaitETA('');
        }
        clearInterval(intervalId);
      };

      unsubs.push(stopTimer);
    };

    timer();

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [nextInteractionDate]);

  return (
    <>
      <Button
        color="secondary"
        variant="outlined"
        size="small"
        aria-controls={open ? 'actions-menu' : undefined}
        aria-expanded={open ? 'true' : undefined}
        aria-label="select action"
        aria-haspopup="menu"
        onClick={handleToggle}
        ref={anchorRef}
      >
        ACTIONS
        <ArrowDropDownIcon />
      </Button>
      <Popper
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
        className={classes.root}
      >
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin:
                placement === 'bottom' ? 'center top' : 'center bottom',
            }}
          >
            <Paper className={classes.container}>
              <ClickAwayListener onClickAway={handleClose}>
                {waitETA ? (
                  <Box p={2} className={classes.interactionInfoBox}>
                    There is a waiting period after interacting with a loan.
                    Please wait approximately {waitETA} before reinteracting
                    with it.
                  </Box>
                ) : (
                  <MenuList id="actions-menu">
                    {actions.map((option, index) => (
                      <MenuItem
                        key={option}
                        onClick={event => handleMenuItemClick(event, index)}
                      >
                        {option}
                      </MenuItem>
                    ))}
                  </MenuList>
                )}
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  );
}

function toHumanizedDuration(ms) {
  const dur = {};
  const units = [
    { label: 's', mod: 60 },
    { label: 'm', mod: 60 },
    // { label: 'h', mod: 24 },
    // { label: 'd', mod: 31 },
    // {label: "w", mod: 7},
  ];
  units.forEach(u => {
    const z = (dur[u.label] = ms.mod(u.mod));
    ms = ms.sub(z).div(u.mod);
  });
  return units
    .reverse()
    .filter(u => {
      return u.label !== 'ms'; // && dur[u.label]
    })
    .map(u => {
      let val = dur[u.label];
      if (u.label === 'm' || u.label === 's') {
        val = val.toString().padStart(2, '0');
      }
      return val + u.label;
    })
    .join(':');
}
