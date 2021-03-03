import React from 'react';
import moment from 'moment';
import clsx from 'clsx';
import { makeStyles } from '@material-ui/core/styles';
import { TableCell, TableRow, Tooltip } from '@material-ui/core';
import { Help as TipIcon } from '@material-ui/icons';
import { useWallet } from 'contexts/wallet';
import { formatUnits, toFixed, isZero } from 'utils/big-number';
import {
  LOAN_TYPE_ERC20,
  LOAN_TYPE_ETH,
  LOAN_TYPE_SHORT,
  DANGER_COLOR,
  SUCCESS_COLOR,
} from 'config';
import ActionsButton from './LoanActionsButton';

export const useStyles = makeStyles(theme => ({
  dangerCRatio: {
    color: DANGER_COLOR,
  },
  okCRatio: {
    color: SUCCESS_COLOR,
  },
}));

export default function({ loan, onActOnLoan }) {
  const classes = useStyles();

  const {
    config: { tokenKeysByKey },
  } = useWallet();

  const targetName = React.useMemo(() => tokenKeysByKey[loan.currency], [
    tokenKeysByKey,
    loan,
  ]);
  const collateralName = React.useMemo(
    () =>
      ({
        [LOAN_TYPE_ERC20]: 'renBTC',
        [LOAN_TYPE_ETH]: 'ETH',
        [LOAN_TYPE_SHORT]: 'sUSD',
      }[loan.type]),
    [loan]
  );

  return (
    <TableRow>
      <TableCell component="th" scope="row">
        {loan.id.toString()}
      </TableCell>
      <TableCell>
        {moment
          .unix(loan.lastInteraction.toNumber())
          .local()
          .format('YYYY-MM-DD HH:mm')}
      </TableCell>
      <TableCell>{loan.short ? 'Short' : 'Borrow'}</TableCell>
      <TableCell align="right">
        {formatUnits(loan.collateral, 18)} {collateralName}
      </TableCell>
      <TableCell align="right">
        {formatUnits(loan.amount, 18)} {targetName}
      </TableCell>
      <TableCell align="right">
        {isZero(loan.pnl) ? (
          '-'
        ) : (
          <div>
            <div>{toFixed(loan.pnl, 1, 2)} sUSD</div>
            <div>{toFixed(loan.pnlPercentage, 1, 2)}%</div>
          </div>
        )}
      </TableCell>
      <TableCell align="right">
        {isZero(loan.accruedInterestUSD)
          ? '-'
          : `${formatUnits(loan.accruedInterestUSD, 18, 2)} sUSD`}
      </TableCell>
      <TableCell
        align="right"
        className={clsx(
          loan.cratio.lt(loan.minCRatio)
            ? classes.dangerCRatio
            : classes.okCRatio
        )}
      >
        <div className="flex items-center justify-end">
          {formatUnits(loan.cratio, 16, 0)}&nbsp;
          <Tooltip
            title={
              <div className="text-center">
                Position will be at risk of liquidation
                <br />
                if cratio falls below the minimum of{' '}
                {formatUnits(loan.minCRatio, 16, 0)}.
              </div>
            }
          >
            <TipIcon style={{ fontSize: 15 }} className={classes.boxTip} />
          </Tooltip>
        </div>
      </TableCell>
      <TableCell align="right">
        {isZero(loan.liquidationPriceUSD)
          ? '-'
          : `${toFixed(loan.liquidationPriceUSD, 1, 2)} sUSD`}
      </TableCell>
      <TableCell align="right">
        <ActionsButton
          {...{ loan }}
          onAct={action =>
            onActOnLoan({
              loan,
              action,
              collateralName,
              debtName: targetName,
            })
          }
        />
      </TableCell>
    </TableRow>
  );
}
