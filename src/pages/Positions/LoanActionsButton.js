import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
  Paper,
  Button,
  Popper,
  MenuList,
  MenuItem,
  ClickAwayListener,
  Grow,
} from '@material-ui/core';
import { ArrowDropDown as ArrowDropDownIcon } from '@material-ui/icons';

const ACTIONS = ['DEPOSIT', 'WITHDRAW', 'REPAY', 'DRAW', 'CLOSE'];

export const useStyles = makeStyles(theme => ({
  root: {
    zIndex: 1,
  },
  container: {
    background: 'rgb(53, 197, 243)',
    color: 'rgb(6, 6, 27)',
  },
}));

export default function({ onAct }) {
  const classes = useStyles();
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef(null);

  const handleMenuItemClick = (event, index) => {
    onAct(ACTIONS[index]);
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
                <MenuList id="actions-menu">
                  {ACTIONS.map((option, index) => (
                    <MenuItem
                      key={option}
                      onClick={event => handleMenuItemClick(event, index)}
                    >
                      {option}
                    </MenuItem>
                  ))}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  );
}
