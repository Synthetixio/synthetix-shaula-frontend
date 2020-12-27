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
import wallet from 'utils/wallet';
import { formatUnits } from 'utils/big-number';
import sl from 'utils/sl';
import COLLATERAL_STATE_ABI from 'abis/collateral-state.json';
import MULTI_COLLATERAL_ERC20_ABI from 'abis/multi-collateral-erc20.json';
import MULTI_COLLATERAL_ETH_ABI from 'abis/multi-collateral-eth.json';
import MULTI_COLLATERAL_SHORT_ABI from 'abis/multi-collateral-short.json';

import {
  ERC20_COLLATERAL_STATE_ADDRESS,
  ETH_COLLATERAL_STATE_ADDRESS,
  SHORT_COLLATERAL_STATE_ADDRESS,
  MULTI_COLLATERAL_ERC20_ADDRESS,
  MULTI_COLLATERAL_ETH_ADDRESS,
  MULTI_COLLATERAL_SHORT_ADDRESS,
  MULTI_COLLATERAL_TOKEN_CURRENCIES_BY_ADDRESS,
} from 'config';

export const useStyles = makeStyles(theme => ({
  container: {
    background: 'rgb(16, 16, 78)', // 'linear-gradient(0deg, rgb(8, 2, 30) 0%, rgb(18, 4, 70) 146.21%)',
    padding: '20px 50px',
    borderRadius: 8,
    flex: 1,
    '& button': {
      width: '100%',
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

  const { address } = useWallet();
  const isConnected = !!address;

  const [isLoading, setIsLoading] = React.useState(false);
  const [loans, setLoans] = React.useState([]);

  const erc20CollateralStateContract = React.useMemo(
    () =>
      isConnected &&
      new ethers.Contract(
        ERC20_COLLATERAL_STATE_ADDRESS,
        COLLATERAL_STATE_ABI,
        wallet.ethersWallet
      ),
    [isConnected]
  );

  const ethCollateralStateContract = React.useMemo(
    () =>
      isConnected &&
      new ethers.Contract(
        ETH_COLLATERAL_STATE_ADDRESS,
        COLLATERAL_STATE_ABI,
        wallet.ethersWallet
      ),
    [isConnected]
  );

  const shortCollateralStateContract = React.useMemo(
    () =>
      isConnected &&
      new ethers.Contract(
        SHORT_COLLATERAL_STATE_ADDRESS,
        COLLATERAL_STATE_ABI,
        wallet.ethersWallet
      ),
    [isConnected]
  );

  const erc20CollateralContract = React.useMemo(
    () =>
      isConnected &&
      new ethers.Contract(
        MULTI_COLLATERAL_ERC20_ADDRESS,
        MULTI_COLLATERAL_ERC20_ABI,
        wallet.ethersWallet
      ),
    [isConnected]
  );

  const ethCollateralContract = React.useMemo(
    () =>
      isConnected &&
      new ethers.Contract(
        MULTI_COLLATERAL_ETH_ADDRESS,
        MULTI_COLLATERAL_ETH_ABI,
        wallet.ethersWallet
      ),
    [isConnected]
  );

  const shortCollateralContract = React.useMemo(
    () =>
      isConnected &&
      new ethers.Contract(
        MULTI_COLLATERAL_SHORT_ADDRESS,
        MULTI_COLLATERAL_SHORT_ABI,
        wallet.ethersWallet
      ),
    [isConnected]
  );

  const contracts = {
    erc20: erc20CollateralContract,
    eth: ethCollateralContract,
    short: shortCollateralContract,
  };

  const stateContracts = {
    erc20: erc20CollateralStateContract,
    eth: ethCollateralStateContract,
    short: shortCollateralStateContract,
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
        type: 'erc20',
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
        type: 'eth',
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
        type: 'short',
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

  const close = async (type, id) => {
    try {
      await contracts[type].close(id);
      sl('info', 'Waiting for transaction to be mined.', 'Done');
    } catch (e) {
      sl('error', e);
    }
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

  return !isConnected ? null : (
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
                  <TableCell>Interest</TableCell>
                  <TableCell align="right"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loans.map(loan => (
                  <TableRow key={loan.id.toString()}>
                    <TableCell component="th" scope="row">
                      {loan.id.toString()}
                    </TableCell>
                    <TableCell>
                      {moment
                        .unix(loan.lastInteraction.toNumber())
                        .local()
                        .format('YYYY-MM-DD HH:mm')}
                    </TableCell>
                    <TableCell>{loan.short ? 'short' : 'long'}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>
                      {formatUnits(loan.amount, 18)}{' '}
                      {
                        MULTI_COLLATERAL_TOKEN_CURRENCIES_BY_ADDRESS[
                          loan.currency
                        ]
                      }
                    </TableCell>
                    <TableCell>
                      {formatUnits(loan.accruedInterest, 18)}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        color="secondary"
                        variant="outlined"
                        onClick={() => close(loan.type, loan.id)}
                      >
                        CLOSE
                      </Button>{' '}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </Paper>
  );
}
