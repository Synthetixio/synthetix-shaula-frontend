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
import { LOAN_TYPE_ERC20, LOAN_TYPE_ETH, LOAN_TYPE_SHORT } from 'config';
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
    '& th, td': {
      verticalAlign: 'top',
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
    shortsSubgraph,
    erc20LoansSubgraph,
    ethLoansSubgraph,
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
        shortsSubgraph &&
        erc20LoansSubgraph &&
        ethLoansSubgraph
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
      const variables = {
        id: loan.id.toString(),
      };
      const subgraph = {
        [LOAN_TYPE_SHORT]: shortsSubgraph,
        [LOAN_TYPE_ERC20]: erc20LoansSubgraph,
        [LOAN_TYPE_ETH]: ethLoansSubgraph,
      }[type];
      const query = {
        [LOAN_TYPE_SHORT]: 'shorts',
        [LOAN_TYPE_ERC20]: 'erc20Loans',
        [LOAN_TYPE_ETH]: 'ethLoans',
      }[type];
      const {
        [query]: [{ txHash }],
      } = await subgraph(
        `query ($id: String!) {
              ${query}(where: {id: $id}) {
                txHash
              }
            }`,
        variables
      );
      const {
        blockNumber: creationBlockNumber,
      } = await signer.provider.getTransaction(txHash);
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
      let pnlPercentage;
      if ('short' === type) {
        pnlPercentage = initialUSDPrice
          .sub(latestUSDPrice)
          .div(initialUSDPrice);
      } else {
        pnlPercentage = latestUSDPrice.sub(initialUSDPrice).div(latestUSDPrice);
      }
      const pnl = pnlPercentage.mul(loanAmount).mul(initialUSDPrice);
      pnlPercentage = pnlPercentage.mul(1e2);

      // console.log({
      //   initialUSDPrice: initialUSDPrice.toString(),
      //   latestUSDPrice: latestUSDPrice.toString(),
      //   pnl: pnl.toString(),
      //   pnlPercentage: pnlPercentage.toString(),
      // });

      const accruedInterestUSD = Big(loan.accruedInterest).mul(latestUSDPrice);

      return {
        ...loan,
        type,
        minCRatio,
        cratio: await loanContracts[type].collateralRatio(loan),
        pnl,
        pnlPercentage,
        accruedInterestUSD,
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

        const fetchLoan = async (owner, id) =>
          makeLoan({
            loan: await loanStateContracts[type].getLoan(owner, id),
            type,
            minCRatio: await loanContracts[type].minCratio(),
          });

        const updateLoan = async (owner, id) => {
          const loan = await fetchLoan(owner, id);
          setLoans(originalLoans => {
            const loans = originalLoans.slice();
            const idx = loans.findIndex(l => l.id.eq(id));
            if (~idx) {
              loans[idx] = loan;
            } else {
              console.warn(
                `unknown loan(id=${id.toString()}, owner=${owner.toString()})`
              );
            }
            return loans;
          });
        };

        const onLoanCreated = async (owner, id) => {
          const loan = await fetchLoan(owner, id);
          setLoans(loans => [loan, ...loans]);
        };

        const onLoanClosed = (owner, id) => {
          setLoans(loans => loans.filter(loan => !loan.id.eq(id)));
        };

        const onCollateralDeposited = async (owner, id, amount) => {
          setLoans(loans =>
            loans.map(loan => {
              if (loan.id.eq(id)) {
                loan.collateral = loan.collateral.add(amount);
              }
              return loan;
            })
          );
          await updateLoan(owner, id);
        };

        const onCollateralWithdrawn = async (owner, id, amount) => {
          setLoans(loans =>
            loans.map(loan => {
              if (loan.id.eq(id)) {
                loan.collateral = loan.collateral.sub(amount);
              }
              return loan;
            })
          );
          await updateLoan(owner, id);
        };

        const onLoanRepaymentMade = async (borrower, repayer, id, payment) => {
          setLoans(loans =>
            loans.map(loan => {
              if (loan.id.eq(id)) {
                loan.amount = loan.amount.sub(payment);
              }
              return loan;
            })
          );
          await updateLoan(borrower, id);
        };

        const onLoanDrawnDown = async (owner, id, amount) => {
          setLoans(loans =>
            loans.map(loan => {
              if (loan.id.eq(id)) {
                loan.amount = loan.amount.add(amount);
              }
              return loan;
            })
          );
          await updateLoan(owner, id);
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
    shortsSubgraph,
    erc20LoansSubgraph,
    ethLoansSubgraph,
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
                  <TableCell align="right">Collateral</TableCell>
                  <TableCell align="right">Debt</TableCell>
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
