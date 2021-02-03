import React from 'react';
import moment from 'moment';
import clsx from 'clsx';
import { makeStyles } from '@material-ui/core/styles';
import {
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
} from '@material-ui/core';
import { Help as TipIcon } from '@material-ui/icons';
import { useWallet } from 'contexts/wallet';
import Loader from 'components/Loader';
import { formatUnits } from 'utils/big-number';
import { useNotifications } from 'contexts/notifications';
import {
  LOAN_TYPE_ERC20,
  LOAN_TYPE_ETH,
  LOAN_TYPE_SHORT,
  DANGER_COLOR,
  SUCCESS_COLOR,
} from 'config';

export const useStyles = makeStyles(theme => ({
  container: {
    background: 'rgb(16, 16, 78)', // 'linear-gradient(0deg, rgb(8, 2, 30) 0%, rgb(18, 4, 70) 146.21%)',
    padding: '20px 50px',
    borderRadius: 8,
    flex: 1,
    '& button': {
      width: 50,
      fontFamily: 'GT-America-Compressed-Regular',
    },
    [theme.breakpoints.down('sm')]: {
      margin: 10,
    },
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  heading: {
    fontSize: 20,
    fontFamily: 'GT-America-Extended-Bold, "Work Sans", Arial',
  },
  p: {
    margin: '20px 0',
    display: 'flex',
    flex: 1,
  },
  paddingWrapper: {
    display: 'flex',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerCRatio: {
    color: DANGER_COLOR,
  },
  okCRatio: {
    color: SUCCESS_COLOR,
  },
}));

export default function() {
  const classes = useStyles();

  const {
    signer,
    address,
    erc20CollateralStateContract,
    ethCollateralStateContract,
    shortCollateralStateContract,
    collateralContracts,
    collateralStateContracts,
  } = useWallet();

  const [isLoading, setIsLoading] = React.useState(false);
  const [loans, setLoans] = React.useState([]);

  React.useEffect(() => {
    let isMounted = true;
    const unsubs = [];

    const getLoanIndices = async type => {
      const [n, minCRatio] = await Promise.all([
        collateralStateContracts[type].getNumLoans(address),
        collateralContracts[type].minCratio(),
      ]);
      const loanIndices = [];
      for (let i = 0; i < n; i++) {
        loanIndices.push(i);
      }
      return { type, minCRatio, loanIndices };
    };

    const getLoans = async ({ type, minCRatio, loanIndices }) => {
      return Promise.all(loanIndices.map(getLoan.bind(null, type, minCRatio)));
    };

    const getLoan = async (type, minCRatio, loanIndex) => {
      return {
        type,
        minCRatio,
        loan: await collateralStateContracts[type].loans(address, loanIndex),
      };
    };

    const makeLoan = async ({ loan, type, minCRatio }) => {
      return {
        ...loan,
        type,
        minCRatio,
        cratio: await collateralContracts[type].collateralRatio(loan),
      };
    };

    const loadLoans = async () => {
      if (
        !(
          erc20CollateralStateContract &&
          ethCollateralStateContract &&
          shortCollateralStateContract &&
          address
        )
      )
        return;
      setIsLoading(true);

      const loanIndices = await Promise.all(
        Object.keys(collateralStateContracts).map(getLoanIndices)
      );
      const loans = await Promise.all(loanIndices.map(getLoans));
      const activeLoans = [];
      for (let i = 0; i < loans.length; i++) {
        for (let j = 0; j < loans[i].length; j++) {
          const { type, minCRatio, loan } = loans[i][j];
          if (!loan.amount.isZero()) {
            activeLoans.push(
              await makeLoan({
                loan,
                type,
                minCRatio,
              })
            );
          }
        }
      }
      activeLoans.sort((a, b) => {
        if (a.id.gt(b.id)) return -1;
        if (a.id.lt(b.id)) return 1;
        return 0;
      });
      if (isMounted) {
        setLoans(activeLoans);
        setIsLoading(false);
      }
    };

    // subscribe to loan open+close
    const subscribe = () => {
      if (
        !(
          erc20CollateralStateContract &&
          ethCollateralStateContract &&
          shortCollateralStateContract &&
          address
        )
      )
        return () => {};
      for (const type in collateralContracts) {
        const contract = collateralContracts[type];
        const onCreate = async (owner, id) => {
          const loan = await makeLoan({
            loan: await collateralStateContracts[type].getLoan(owner, id),
            type,
            minCRatio: await collateralContracts[type].minCratio(),
          });
          setLoans(loans => [loan, ...loans]);
        };
        const onClose = (owner, id) => {
          setLoans(loans => loans.filter(loan => !loan.id.eq(id)));
        };
        const loanCreatedEvent = contract.filters.LoanCreated(address);
        const loanClosedEvent = contract.filters.LoanClosed(address);
        contract.on(loanCreatedEvent, onCreate);
        contract.on(loanClosedEvent, onClose);
        unsubs.push(() => contract.off(loanCreatedEvent, onCreate));
        unsubs.push(() => contract.off(loanClosedEvent, onClose));
      }
    };

    loadLoans();
    subscribe();
    return () => {
      isMounted = false;
      unsubs.forEach(unsub => unsub());
    };
  }, [
    erc20CollateralStateContract,
    ethCollateralStateContract,
    shortCollateralStateContract,
    address,
    collateralContracts,
    collateralStateContracts,
  ]);

  return !signer ? null : (
    <Paper className={classes.container}>
      <div className={classes.content}>
        <div className={classes.heading}>Loans</div>

        <div className={classes.p}>
          {isLoading ? (
            <div className={classes.paddingWrapper}>
              <Loader />
            </div>
          ) : !loans.length ? (
            <div className={classes.paddingWrapper}>You have no loans.</div>
          ) : (
            <Table className={classes.table} aria-label="Loans">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Collateral</TableCell>
                  <TableCell>Debt</TableCell>
                  <TableCell align="center">
                    Accrued
                    <br />
                    Interest
                  </TableCell>
                  <TableCell align="center">CRatio</TableCell>
                  <TableCell align="right"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loans.map(loan => (
                  <Loan key={loan.id.toString()} {...{ loan }} />
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </Paper>
  );
}

function Loan({ loan }) {
  const classes = useStyles();

  const [isClosing, setIsClosing] = React.useState(false);
  const {
    collateralContracts,
    config: { multiCollateralTokenCurrenciesByAddress },
  } = useWallet();
  const {
    showTxNotification,
    showErrorNotification,
    showSuccessNotification,
  } = useNotifications();

  const targetName = React.useMemo(
    () => multiCollateralTokenCurrenciesByAddress[loan.currency],
    [multiCollateralTokenCurrenciesByAddress, loan]
  );
  const collateralName = React.useMemo(
    () =>
      ({
        [LOAN_TYPE_ERC20]: 'renBTC',
        [LOAN_TYPE_ETH]: 'ETH',
        [LOAN_TYPE_SHORT]: 'sUSD',
      }[loan.type]),
    [loan]
  );

  const close = async () => {
    try {
      setIsClosing(true);
      const tx = await collateralContracts[loan.type].close(loan.id);
      showTxNotification(`Closing loan(#${loan.id.toString()})`, tx.hash);
      await tx.wait();
      showSuccessNotification(
        `Loan(#${loan.id.toString()}) successfully closed.`,
        tx.hash
      );
    } catch (e) {
      showErrorNotification(e);
    } finally {
      setIsClosing(false);
    }
  };

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
      <TableCell>
        {formatUnits(loan.collateral, 18)} {collateralName}
      </TableCell>
      <TableCell>
        {formatUnits(loan.amount, 18)} {targetName}
      </TableCell>
      <TableCell align="center">
        {formatUnits(loan.accruedInterest, 18)}
      </TableCell>
      <TableCell
        align="center"
        className={clsx(
          loan.cratio.lt(loan.minCRatio)
            ? classes.dangerCRatio
            : classes.okCRatio
        )}
      >
        <div className="flex items-center">
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
        <Button
          color="secondary"
          variant="outlined"
          onClick={close}
          disabled={isClosing}
        >
          {isClosing ? 'CLOSING...' : 'CLOSE'}
        </Button>{' '}
      </TableCell>
    </TableRow>
  );
}
