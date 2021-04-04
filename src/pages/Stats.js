import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
  Paper,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@material-ui/core';
import clsx from 'clsx';
import { useWallet } from 'contexts/wallet';
import Loader from 'components/Loader';
import { toFixed, Big } from 'utils/big-number';

const SECONDS_IN_A_YR = 365 * 24 * 60 * 60;

export const useStyles = makeStyles(theme => ({
  container: {
    background: 'rgb(16, 16, 78)', // 'linear-gradient(0deg, rgb(8, 2, 30) 0%, rgb(18, 4, 70) 146.21%)',
    padding: '20px 50px',
    borderRadius: 8,
    flex: 1,
    [theme.breakpoints.down('sm')]: {
      margin: 10,
    },
    '& table': {
      width: 'auto',
      // marginLeft: -16,
    },
    '& td, th': {
      // border: 'none',
    },
    '& h3': {
      marginTop: 0,
      marginBottom: 3,
      textTransform: 'uppercase',
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
  },
}));

export default function({ className }) {
  const classes = useStyles();

  const {
    signerOrProvider,
    version,
    config: { tokenKeysByName },
    collateralManagerContract,
    exchangeRatesContract,
    rewardsContracts,
  } = useWallet();

  const [isLoading, setIsLoading] = React.useState(false);
  const [borrows, setBorrows] = React.useState([]);
  const [shorts, setShorts] = React.useState([]);

  const borrowsOpenInterest = React.useMemo(
    () => borrows.reduce((sum, stat) => sum.add(stat.openInterest), Big('0')),
    [borrows]
  );
  const shortsOpenInterest = React.useMemo(
    () => shorts.reduce((sum, stat) => sum.add(stat.openInterest), Big('0')),
    [shorts]
  );

  React.useEffect(() => {
    if (version === 1) {
      setShorts([]);
      setIsLoading(false);
      return;
    }
    if (
      !(
        signerOrProvider &&
        collateralManagerContract &&
        exchangeRatesContract &&
        tokenKeysByName &&
        rewardsContracts
      )
    ) {
      return setIsLoading(true);
    }

    let isMounted = true;
    const unsubs = [() => (isMounted = false)];

    const getBorrowStats = async currency => {
      const [openInterest, [assetUSDPrice]] = await Promise.all([
        collateralManagerContract.long(tokenKeysByName[currency]),
        exchangeRatesContract.rateAndInvalid(tokenKeysByName[currency]),
      ]);

      const openInterestUSD = Big(openInterest)
        .div(1e18)
        .mul(Big(assetUSDPrice).div(1e18));

      return {
        currency,
        openInterest: openInterestUSD,
      };
    };

    const getShortStats = async currency => {
      const rewardsContract = rewardsContracts.get(currency);

      const [
        openInterest,
        [assetUSDPrice],
        snxUSDPrice,
        rewardsRate,
        rewardsTotalSupply,
      ] = await Promise.all([
        collateralManagerContract.short(tokenKeysByName[currency]),
        exchangeRatesContract.rateAndInvalid(tokenKeysByName[currency]),
        exchangeRatesContract.rateForCurrency(tokenKeysByName['SNX']),
        rewardsContract.rewardRate(),
        rewardsContract.totalSupply(),
      ]);

      const openInterestUSD = Big(openInterest)
        .div(1e18)
        .mul(Big(assetUSDPrice).div(1e18));

      const apr = Big(rewardsRate)
        .mul(SECONDS_IN_A_YR)
        .mul(snxUSDPrice)
        .div(rewardsTotalSupply)
        .div(assetUSDPrice)
        .mul(100);

      return {
        currency,
        apr,
        openInterest: openInterestUSD,
      };
    };

    const loadBorrowsStats = () =>
      Promise.all(['sBTC', 'sETH', 'sUSD'].map(getBorrowStats));
    const loadShortsStats = () =>
      Promise.all(['sBTC', 'sETH'].map(getShortStats));

    const load = async () => {
      try {
        const [borrows, shorts] = await Promise.all([
          loadBorrowsStats(),
          loadShortsStats(),
        ]);
        if (isMounted) {
          setBorrows(borrows);
          setShorts(shorts);
        }
      } catch (e) {
        console.error(e);
        if (isMounted) {
          setBorrows([]);
          setShorts([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const subscribe = () => {
      const newBlockEvent = 'block';
      signerOrProvider.on(newBlockEvent, load);
      unsubs.push(() => signerOrProvider.off(newBlockEvent, load));
    };

    load();
    subscribe();
    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [
    version,
    signerOrProvider,
    collateralManagerContract,
    tokenKeysByName,
    exchangeRatesContract,
    rewardsContracts,
  ]);

  return (
    <Paper className={clsx(classes.container, className)}>
      <Box className={classes.content}>
        <Box className={classes.heading}>Statistics</Box>
        <Box className={classes.p}>
          {isLoading ? (
            <Box className={clsx(classes.paddingWrapper, 'justify-center')}>
              <Loader />
            </Box>
          ) : (
            <Box className="flex flex-col">
              <Box className="flex flex-col" mt={2}>
                <h3>Shorts</h3>
                <Table aria-label="Stats" size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Asset</TableCell>
                      <TableCell align={'right'}>Rewards&nbsp;APR</TableCell>
                      <TableCell align={'right'}>Open&nbsp;Interest</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {shorts.map(stat => (
                      <TableRow key={stat.currency}>
                        <TableCell>{stat.currency}</TableCell>
                        <TableCell align={'right'}>
                          {toFixed(stat.apr, 1, 2)}%
                        </TableCell>
                        <TableCell align={'right'}>
                          ${toFixed(stat.openInterest, 1, 2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell align={'right'}>
                        ${toFixed(shortsOpenInterest, 1, 2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>

              <Box className="flex flex-col" mt={5}>
                <h3>Borrows</h3>
                <Table aria-label="Stats" size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Asset</TableCell>
                      <TableCell align={'right'}>Open&nbsp;Interest</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {borrows.map(stat => (
                      <TableRow key={stat.currency}>
                        <TableCell>{stat.currency}</TableCell>
                        <TableCell align={'right'}>
                          ${toFixed(stat.openInterest, 1, 2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell>Total</TableCell>
                      <TableCell align={'right'}>
                        ${toFixed(borrowsOpenInterest, 1, 2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  );
}
