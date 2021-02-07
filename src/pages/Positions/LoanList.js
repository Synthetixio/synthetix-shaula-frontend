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
import { Big } from 'utils/big-number';
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
    erc20LoanStateContract,
    ethLoanStateContract,
    shortLoanStateContract,
    loanContracts,
    loanStateContracts,
    exchangeRatesContract,
    subgraph,
  } = useWallet();

  const [isLoading, setIsLoading] = React.useState(false);
  const [loans, setLoans] = React.useState([]);
  const [loanBeingActedOn, setLoanBeingActedOn] = React.useState(null);

  React.useEffect(() => {
    if (
      !(
        erc20LoanStateContract &&
        ethLoanStateContract &&
        shortLoanStateContract &&
        address &&
        exchangeRatesContract &&
        subgraph
      )
    )
      return;

    let isMounted = true;
    const unsubs = [() => (isMounted = false)];

    const getLoanIndices = async type => {
      const [n, minCRatio] = await Promise.all([
        loanStateContracts[type].getNumLoans(address),
        loanContracts[type].minCratio(),
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
        loan: await loanStateContracts[type].loans(address, loanIndex),
      };
    };

    const makeLoan = async ({ loan, type, minCRatio }) => {
      const {
        shorts: [{ txHash }],
      } = await subgraph(
        `query ($id: String!) {
          shorts(where: {id: $id}) {
            txHash
          }
        }`,
        {
          id: loan.id.toString(),
        }
      );
      console.log({ txHash });
      const {
        blockNumber: creationBlockNumber,
      } = await signer.provider.getTransaction(txHash);
      console.log({ creationBlockNumber });
      // const interest = loan.amount.add(loan.accruedInterest).mul(debtUSDPrice);
      let [initialUSDPrice, latestUSDPrice] = await Promise.all([
        exchangeRatesContract.rateForCurrency(loan.currency, {
          blockTag: creationBlockNumber,
        }),
        exchangeRatesContract.rateForCurrency(loan.currency),
      ]);
      const loanAmount = Big(loan.amount).div(1e18);
      initialUSDPrice = Big(initialUSDPrice).div(1e18);
      latestUSDPrice = Big(latestUSDPrice).div(1e18);
      console.log({
        initialUSDPrice: initialUSDPrice.toString(),
        latestUSDPrice: latestUSDPrice.toString(),
      });
      const pnl = latestUSDPrice
        .sub(initialUSDPrice)
        .div(latestUSDPrice)
        .mul(loanAmount)
        .mul(initialUSDPrice);
      console.log({ pnl: pnl.toString() });
      return {
        ...loan,
        type,
        minCRatio,
        cratio: await loanContracts[type].collateralRatio(loan),
        pnl,
      };
    };

    const loadLoans = async () => {
      setIsLoading(true);

      const loanIndices = await Promise.all(
        Object.keys(loanStateContracts).map(getLoanIndices)
      );
      const loans = await Promise.all(loanIndices.map(getLoans));
      let activeLoans = [];
      for (let i = 0; i < loans.length; i++) {
        for (let j = 0; j < loans[i].length; j++) {
          const { type, minCRatio, loan } = loans[i][j];
          if (!loan.amount.isZero()) {
            activeLoans.push({
              loan,
              type,
              minCRatio,
            });
          }
        }
      }
      activeLoans = await Promise.all(activeLoans.map(makeLoan));
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
      for (const type in loanContracts) {
        const contract = loanContracts[type];

        // todo: refresh c-ratio

        const onLoanCreated = async (owner, id) => {
          const loan = await makeLoan({
            loan: await loanStateContracts[type].getLoan(owner, id),
            type,
            minCRatio: await loanContracts[type].minCratio(),
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
      unsubs.forEach(unsub => unsub());
    };
  }, [
    erc20LoanStateContract,
    ethLoanStateContract,
    shortLoanStateContract,
    address,
    loanContracts,
    loanStateContracts,
    exchangeRatesContract,
    subgraph,
    signer,
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
            <Table aria-label="Loans" size={'small'}>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Collateral</TableCell>
                  <TableCell>Debt</TableCell>
                  <TableCell align="right">PNL</TableCell>
                  <TableCell align="right">Accrued&nbsp; Interest</TableCell>
                  <TableCell align="right">CRatio</TableCell>
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
