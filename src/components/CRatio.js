import React from 'react';
import clsx from 'clsx';
import { makeStyles } from '@material-ui/core/styles';
import { Box, Tooltip } from '@material-ui/core';
import { Help as TipIcon } from '@material-ui/icons';
import { toFixed } from 'utils/big-number';
import { DANGER_COLOR, SUCCESS_COLOR, MIN_CRATIO } from 'config';

export const useStyles = makeStyles(theme => ({
  dangerCRatio: {
    color: DANGER_COLOR,
  },
  okCRatio: {
    color: SUCCESS_COLOR,
  },
}));

export default function({ cratio }) {
  const classes = useStyles();
  return (
    <div
      className={clsx(
        'flex',
        'items-center',
        cratio.lt(MIN_CRATIO) ? classes.dangerCRatio : classes.okCRatio
      )}
    >
      CRATIO: {toFixed(cratio, 1, 0)}%
      <Box ml={1} className={'flex items-center'}>
        <Tooltip
          title={
            <div className="text-center">
              You can only short at 150% or higher. Your position will be
              eligible for liquidation if it falls below 120%.
            </div>
          }
        >
          <TipIcon style={{ fontSize: 15 }} className={classes.boxTip} />
        </Tooltip>
      </Box>
    </div>
  );
}
