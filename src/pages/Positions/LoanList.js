import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@material-ui/core';
import { useWallet } from 'contexts/wallet';
import Loader from 'components/Loader';
import Loan from './LoanListItem';
import LoanActionsModal from './LoanActions/LoanActionsModal';

export const useStyles = makeStyles(theme => ({
  container: {
    background: 'rgb(16, 16, 78)', // 'linear-gradient(0deg, rgb(8, 2, 30) 0%, rgb(18, 4, 70) 146.21%)',
    padding: '20px 50px',
    borderRadius: 8,
    flex: 1,
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
  const [loanBeingActedOn, setLoanBeingActedOn] = React.useState(null);

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

        // todo: refresh c-ratio

        const onLoanCreated = async (owner, id) => {
          const loan = await makeLoan({
            loan: await collateralStateContracts[type].getLoan(owner, id),
            type,
            minCRatio: await collateralContracts[type].minCratio(),
          });
          setLoans(loans => [loan, ...loans]);
        };

        const onLoanClosed = (owner, id) => {
          setLoans(loans => loans.filter(loan => !loan.id.eq(id)));
        };

        const onCollateralDeposited = (owner, id, amount) => {
          setLoans(loans =>
            loans.map(loan => {
              if (loan.id.eq(id)) {
                loan.collateral = loan.collateral.add(amount);
              }
              return loan;
            })
          );
        };

        const onCollateralWithdrawn = (owner, id, amount) => {
          setLoans(loans =>
            loans.map(loan => {
              if (loan.id.eq(id)) {
                loan.collateral = loan.collateral.sub(amount);
              }
              return loan;
            })
          );
        };

        const onLoanRepaymentMade = (borrower, repayer, id, payment) => {
          setLoans(loans =>
            loans.map(loan => {
              if (loan.id.eq(id)) {
                loan.amount = loan.amount.sub(payment);
              }
              return loan;
            })
          );
        };

        const onLoanDrawnDown = (owner, id, amount) => {
          setLoans(loans =>
            loans.map(loan => {
              if (loan.id.eq(id)) {
                loan.amount = loan.amount.add(amount);
              }
              return loan;
            })
          );
        };

        const loanCreatedEvent = contract.filters.LoanCreated(address);
        const loanClosedEvent = contract.filters.LoanClosed(address);
        const collateralDepositedEvent = contract.filters.CollateralDeposited(
          address
        );
        const collateralWithdrawnEvent = contract.filters.CollateralWithdrawn(
          address
        );
        const loanDrawnDownEvent = contract.filters.LoanDrawnDown(address);
        const loanRepaymentMadeEvent = contract.filters.LoanRepaymentMade(
          address
        );

        contract.on(loanCreatedEvent, onLoanCreated);
        contract.on(loanClosedEvent, onLoanClosed);
        contract.on(collateralDepositedEvent, onCollateralDeposited);
        contract.on(collateralWithdrawnEvent, onCollateralWithdrawn);
        contract.on(loanDrawnDownEvent, onLoanDrawnDown);
        contract.on(loanRepaymentMadeEvent, onLoanRepaymentMade);

        unsubs.push(() => contract.off(loanCreatedEvent, onLoanCreated));
        unsubs.push(() => contract.off(loanClosedEvent, onLoanClosed));
        unsubs.push(() =>
          contract.off(collateralDepositedEvent, onCollateralDeposited)
        );
        unsubs.push(() =>
          contract.off(collateralWithdrawnEvent, onCollateralWithdrawn)
        );
        unsubs.push(() => contract.off(loanDrawnDownEvent, onLoanDrawnDown));
        unsubs.push(() =>
          contract.off(loanRepaymentMadeEvent, onLoanRepaymentMade)
        );
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

  const startActOnLoan = args => setLoanBeingActedOn(args);
  const closeLoansActionModal = () => setLoanBeingActedOn(null);

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
            <Table aria-label="Loans">
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
                  <Loan
                    key={loan.id.toString()}
                    {...{ loan }}
                    onActOnLoan={startActOnLoan}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <LoanActionsModal {...loanBeingActedOn} onClose={closeLoansActionModal} />
    </Paper>
  );
}
