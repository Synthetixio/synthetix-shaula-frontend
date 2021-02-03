import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { IconButton } from '@material-ui/core';
import { Close as CloseIcon } from '@material-ui/icons';

export const useStyles = makeStyles(theme => ({
  body: {
    width: 500,
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1),
    color: theme.palette.grey[500],
  },
  input: {
    '& .MuiFormLabel-root': {
      display: 'flex',
    },
    '& .MuiInputLabel-shrink': {
      right: 0,
      transform: 'translate(0, 1.5px) scale(1)',
      transformOrigin: 'top left',
      fontSize: 12,
    },
  },
}));

export function CloseButton({ onClose }) {
  const classes = useStyles();
  return (
    <IconButton
      aria-label="close"
      className={classes.closeButton}
      onClick={onClose}
    >
      <CloseIcon />
    </IconButton>
  );
}
