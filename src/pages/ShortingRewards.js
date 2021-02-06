import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
  Paper,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@material-ui/core';
import clsx from 'clsx';
import * as ethers from 'ethers';
import { useWallet } from 'contexts/wallet';
import Loader from 'components/Loader';
import { formatUnits } from 'utils/big-number';
import { useNotifications } from 'contexts/notifications';
import REWARDS_CONTRACT_ABI from 'abis/shorting-rewards.json';

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
      marginLeft: -16,
    },
    '& td, th': {
      border: 'none',
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
    signer,
    address,
    version,
    config: { tokenKeysByName },
    shortLoanContract,
    collateralManagerContract,
    exchangeRatesContract,
  } = useWallet();

  const [isLoading, setIsLoading] = React.useState(false);
  const [rewards, setRewards] = React.useState([]);
  const [rewardsContracts, setRewardsContracts] = React.useState([]);

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      if (version === 1) {
        if (isMounted) {
          setRewardsContracts([]);
        }
        return;
      }
      if (!(signer && shortLoanContract && tokenKeysByName)) {
        return;
      }

      const getRewardContract = async currency => {
        const currencyAddress = tokenKeysByName[currency];
        const rewardAddress = await shortLoanContract.shortingRewards(
          currencyAddress
        );
        return {
          currency,
          currencyAddress,
          contract: new ethers.Contract(
            rewardAddress,
            REWARDS_CONTRACT_ABI,
            signer
          ),
        };
      };
      const contracts = await Promise.all(
        ['sBTC', 'sETH'].map(getRewardContract)
      );

      if (isMounted) {
        setRewardsContracts(contracts);
      }
    })();
    return () => (isMounted = false);
  }, [shortLoanContract, tokenKeysByName, signer, version]);

  React.useEffect(() => {
    if (version === 1) {
      setRewards([]);
      setIsLoading(false);
      return;
    }
    if (
      !(
        rewardsContracts.length &&
        address &&
        signer &&
        collateralManagerContract &&
        exchangeRatesContract &&
        tokenKeysByName
      )
    ) {
      return;
    }

    let isMounted = true;
    const unsubs = [() => (isMounted = false)];

    const load = async () => {
      const getRewards = async ({
        contract: rewardsContract,
        currency,
        ...rest
      }) => {
        // console.trace();
        const [claimAmount] = await Promise.all([
          rewardsContract.earned(address),
        ]);

        return {
          ...rest,
          rewardsContract,
          currency,
          claimAmount,
        };
      };
      try {
        const rewards = await Promise.all(rewardsContracts.map(getRewards));
        if (isMounted) {
          setRewards(rewards);
        }
      } catch (e) {
        console.error(e);
        if (isMounted) {
          setRewards([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const subscribe = () => {
      rewardsContracts.forEach(({ contract }) => {
        const claimEvent = contract.filters.RewardPaid(address);
        contract.on(claimEvent, load);
        unsubs.push(() => contract.off(claimEvent, load));
      });

      const newBlockEvent = 'block';
      signer.provider.on(newBlockEvent, load);
      unsubs.push(() => signer.provider.off(newBlockEvent, load));
    };

    setIsLoading(true);
    load();
    subscribe();
    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [
    address,
    rewardsContracts,
    version,
    signer,
    collateralManagerContract,
    tokenKeysByName,
    exchangeRatesContract,
  ]);

  return (
    <Paper className={clsx(classes.container, className)}>
      <Box className={classes.content}>
        <Box className={classes.heading}>Shorting Rewards</Box>
        <Box className={classes.p}>
          {isLoading ? (
            <Box className={clsx(classes.paddingWrapper, 'justify-center')}>
              <Loader />
            </Box>
          ) : !address ? (
            '-'
          ) : (
            <Table aria-label="Rewards" size="small">
              <TableBody>
                {rewards.map(reward => (
                  <Reward key={reward.currency} {...reward} />
                ))}
              </TableBody>
            </Table>
          )}
        </Box>
      </Box>
    </Paper>
  );
}

function Reward({ currency, claimAmount }) {
  // const classes = useStyles();
  const { tx } = useNotifications();

  const {
    address,
    shortLoanContract,
    config: { tokenKeysByName },
  } = useWallet();
  const [isClaiming, setIsClaiming] = React.useState(false);

  const claim = async () => {
    try {
      setIsClaiming(true);
      await tx(
        `Claiming ${currency} reward.`,
        `You have successfully claimed your ${currency} short rewards.`,
        () => [
          shortLoanContract,
          'getReward',
          [tokenKeysByName[currency], address],
        ]
      );
    } catch {
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <TableRow>
      <TableCell>{currency}</TableCell>
      <TableCell>
        {claimAmount.isZero() ? '-' : `${formatUnits(claimAmount, 18, 4)} SNX`}
      </TableCell>
      <TableCell>
        <Button
          color="secondary"
          size="small"
          onClick={claim}
          disabled={isClaiming || claimAmount.isZero()}
        >
          {isClaiming ? 'CLAIMING...' : 'CLAIM'}
        </Button>
      </TableCell>
    </TableRow>
  );
}
