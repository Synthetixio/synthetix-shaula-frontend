import React from 'react';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  error: {
    padding: 50,
    color: theme.palette.secondary.main,
    textAlign: 'center',
  },
}));

export default function Component({ error, isLoaded, theme, isDark }) {
  const classes = useStyles();
  return <div className={classes.error}>{error}</div>;
}
