import React from 'react';
import moment from 'moment';
import * as ethers from 'ethers';
import { makeStyles } from '@material-ui/core/styles';
import {
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@material-ui/core';
import { useWallet } from 'contexts/wallet';
import Loader from 'components/Loader';
import { formatUnits } from 'utils/big-number';
import { useNotifications } from 'contexts/notifications';
import COLLATERAL_STATE_ABI from 'abis/collateral-state.json';
import MULTI_COLLATERAL_ERC20_ABI from 'abis/multi-collateral-erc20.json';
import MULTI_COLLATERAL_ETH_ABI from 'abis/multi-collateral-eth.json';
import MULTI_COLLATERAL_SHORT_ABI from 'abis/multi-collateral-short.json';

const LOAN_TYPE_ERC20 = 'erc20';
const LOAN_TYPE_ETH = 'eth';
const LOAN_TYPE_SHORT = 'short';

export const useStyles = makeStyles(theme => ({
  container: {
    background: 'rgb(16, 16, 78)', // 'linear-gradient(0deg, rgb(8, 2, 30) 0%, rgb(18, 4, 70) 146.21%)',
    padding: '20px 50px',
    borderRadius: 8,
    flex: 1,
    '& button': {
      width: 100,
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
}));

export default function() {
  const classes = useStyles();

  const {
    signer,
    address,
    config: {
      ERC20_COLLATERAL_STATE_ADDRESS,
      ETH_COLLATERAL_STATE_ADDRESS,
      SHORT_COLLATERAL_STATE_ADDRESS,
      MULTI_COLLATERAL_ERC20_ADDRESS,
      MULTI_COLLATERAL_ETH_ADDRESS,
      MULTI_COLLATERAL_SHORT_ADDRESS,
    },
  } = useWallet();

  const [isLoading, setIsLoading] = React.useState(false);
  const [loans, setLoans] = React.useState([]);

  const erc20CollateralStateContract = React.useMemo(
    () =>
      signer &&
      ERC20_COLLATERAL_STATE_ADDRESS &&
      new ethers.Contract(
        ERC20_COLLATERAL_STATE_ADDRESS,
        COLLATERAL_STATE_ABI,
        signer
      ),
    [signer, ERC20_COLLATERAL_STATE_ADDRESS]
  );

  const ethCollateralStateContract = React.useMemo(
    () =>
      signer &&
      ETH_COLLATERAL_STATE_ADDRESS &&
      new ethers.Contract(
        ETH_COLLATERAL_STATE_ADDRESS,
        COLLATERAL_STATE_ABI,
        signer
      ),
    [signer, ETH_COLLATERAL_STATE_ADDRESS]
  );

  const shortCollateralStateContract = React.useMemo(
    () =>
      signer &&
      SHORT_COLLATERAL_STATE_ADDRESS &&
      new ethers.Contract(
        SHORT_COLLATERAL_STATE_ADDRESS,
        COLLATERAL_STATE_ABI,
        signer
      ),
    [signer, SHORT_COLLATERAL_STATE_ADDRESS]
  );

  const erc20CollateralContract = React.useMemo(
    () =>
      signer &&
      MULTI_COLLATERAL_ERC20_ADDRESS &&
      new ethers.Contract(
        MULTI_COLLATERAL_ERC20_ADDRESS,
        MULTI_COLLATERAL_ERC20_ABI,
        signer
      ),
    [signer, MULTI_COLLATERAL_ERC20_ADDRESS]
  );

  const ethCollateralContract = React.useMemo(
    () =>
      signer &&
      MULTI_COLLATERAL_ETH_ADDRESS &&
      new ethers.Contract(
        MULTI_COLLATERAL_ETH_ADDRESS,
        MULTI_COLLATERAL_ETH_ABI,
        signer
      ),
    [signer, MULTI_COLLATERAL_ETH_ADDRESS]
  );

  const shortCollateralContract = React.useMemo(
    () =>
      signer &&
      MULTI_COLLATERAL_SHORT_ADDRESS &&
      new ethers.Contract(
        MULTI_COLLATERAL_SHORT_ADDRESS,
        MULTI_COLLATERAL_SHORT_ABI,
        signer
      ),
    [signer, MULTI_COLLATERAL_SHORT_ADDRESS]
  );

  const contracts = {
    [LOAN_TYPE_ERC20]: erc20CollateralContract,
    [LOAN_TYPE_ETH]: ethCollateralContract,
    [LOAN_TYPE_SHORT]: shortCollateralContract,
  };

  const stateContracts = {
    [LOAN_TYPE_ERC20]: erc20CollateralStateContract,
    [LOAN_TYPE_ETH]: ethCollateralStateContract,
    [LOAN_TYPE_SHORT]: shortCollateralStateContract,
  };

  const loadLoans = async () => {
    if (
      !(
        erc20CollateralStateContract &&
        ethCollateralStateContract &&
        shortCollateralStateContract
      )
    )
      return;
    setIsLoading(true);
    let loans = [];
    for (
      let i = 0;
      i < (await erc20CollateralStateContract.getNumLoans(address));
      i++
    ) {
      const loan = await erc20CollateralStateContract.loans(address, i);
      loans.push({
        ...loan,
        type: LOAN_TYPE_ERC20,
      });
    }
    for (
      let i = 0;
      i < (await ethCollateralStateContract.getNumLoans(address));
      i++
    ) {
      const loan = await ethCollateralStateContract.loans(address, i);
      loans.push({
        ...loan,
        type: LOAN_TYPE_ETH,
      });
    }
    for (
      let i = 0;
      i < (await shortCollateralStateContract.getNumLoans(address));
      i++
    ) {
      const loan = await shortCollateralStateContract.loans(address, i);
      loans.push({
        ...loan,
        type: LOAN_TYPE_SHORT,
      });
    }
    loans = loans.filter(loan => !loan.amount.isZero());
    loans.sort((a, b) => {
      if (a.id.gt(b.id)) return -1;
      if (a.id.lt(b.id)) return 1;
      return 0;
    });
    setLoans(loans);
    setIsLoading(false);
  };

  // subscribe to loan open+close
  const subscribe = () => {
    if (
      !(
        erc20CollateralStateContract &&
        ethCollateralStateContract &&
        shortCollateralStateContract
      )
    )
      return () => {};
    const offs = [];
    for (const type in contracts) {
      const contract = contracts[type];
      const onCreate = async (owner, id) => {
        const loan = await stateContracts[type].getLoan(owner, id);
        setLoans(loans => [{ ...loan, type }, ...loans]);
      };
      const onClose = (owner, id) => {
        setLoans(loans => loans.filter(loan => !loan.id.eq(id)));
      };
      const loanCreatedEvent = contract.filters.LoanCreated(address);
      const loanClosedEvent = contract.filters.LoanClosed(address);
      contract.on(loanCreatedEvent, onCreate);
      contract.on(loanClosedEvent, onClose);
      offs.push(() => contract.off(loanCreatedEvent, onCreate));
      offs.push(() => contract.off(loanClosedEvent, onClose));
    }
    return () => {
      offs.forEach(off => off());
    };
  };
  React.useEffect(() => {
    loadLoans();
    return subscribe(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    erc20CollateralStateContract,
    ethCollateralStateContract,
    shortCollateralStateContract,
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
                  <TableCell>Asset</TableCell>
                  <TableCell align="center">Accrued Interest</TableCell>
                  <TableCell align="right"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loans.map(loan => (
                  <Loan key={loan.id.toString()} {...{ loan, contracts }} />
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </Paper>
  );
}

function Loan({ loan, contracts }) {
  const [isClosing, setIsClosing] = React.useState(false);
  const {
    config: { MULTI_COLLATERAL_TOKEN_CURRENCIES_BY_ADDRESS },
  } = useWallet();
  const { showTxNotification, showErrorNotification } = useNotifications();

  const targetName = React.useMemo(
    () => MULTI_COLLATERAL_TOKEN_CURRENCIES_BY_ADDRESS[loan.currency],
    [MULTI_COLLATERAL_TOKEN_CURRENCIES_BY_ADDRESS, loan]
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
      const tx = await contracts[loan.type].close(loan.id);
      showTxNotification(`Closing loan(#${loan.id.toString()})`, tx.hash);
      await tx.wait();
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
