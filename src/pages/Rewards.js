import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Paper, Button, Box } from '@material-ui/core';
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

export default function() {
  const classes = useStyles();

  const {
    signer,
    address,
    version,
    config: { tokenCurrencies },
    shortLoanContract,
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
      if (!(signer && shortLoanContract && tokenCurrencies)) {
        return setIsLoading(true);
      }

      const getRewardContract = async currency => {
        const currencyAddress = tokenCurrencies[currency];
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
  }, [shortLoanContract, tokenCurrencies, signer, version]);

  React.useEffect(() => {
    if (version === 1) {
      setRewards([]);
      setIsLoading(false);
      return;
    }
    if (!(rewardsContracts.length && address)) {
      return setIsLoading(true);
    }

    let isMounted = true;
    const unsubs = [() => (isMounted = false)];

    const load = async () => {
      const getRewards = async ({ contract: rewardsContract, ...rest }) => ({
        ...rest,
        rewardsContract,
        claimAmount: await rewardsContract.earned(address),
      });
      try {
        const rewards = (
          await Promise.all(rewardsContracts.map(getRewards))
        ).filter(r => !r.claimAmount.isZero());
        if (isMounted) {
          setRewards(rewards);
        }
      } catch {
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
    };

    load();
    subscribe();
    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [address, rewardsContracts, version]);

  return !signer ? null : (
    <Paper className={classes.container}>
      <div className={classes.content}>
        <div className={classes.heading}>Shorting Rewards</div>
        <div className={classes.p}>
          {isLoading ? (
            <div className={clsx(classes.paddingWrapper, 'justify-center')}>
              <Loader />
            </div>
          ) : !rewards.length ? (
            <div className={classes.paddingWrapper}>You have no rewards.</div>
          ) : (
            <div className="flex flex-col">
              {rewards.map(reward => (
                <Reward key={reward.currency} {...reward} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Paper>
  );
}

function Reward({ currency, loadRewards, claimAmount }) {
  // const classes = useStyles();
  const { tx } = useNotifications();

  const {
    address,
    shortLoanContract,
    config: { tokenCurrencies },
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
          [tokenCurrencies[currency], address],
        ]
      );
    } catch {
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <Box mb={1}>
      {formatUnits(claimAmount, 18, 4)} SNX ({currency}){' '}
      <Button
        color="secondary"
        variant="outlined"
        size="small"
        onClick={claim}
        disabled={isClaiming}
      >
        {isClaiming ? 'CLAIMING...' : 'CLAIM'}
      </Button>
    </Box>
  );
}
