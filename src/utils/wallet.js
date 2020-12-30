import { ethers } from 'ethers';
import Onboard from 'bnc-onboard';
import { INFURA_ID, CACHE_WALLET_KEY } from 'config';
import cache from 'utils/cache';

const DEFAULT_NETWORK_ID = 1;

class Wallet {
  async connect(tryCached = false) {
    let cachedWallet;
    if (tryCached) {
      cachedWallet = cache(CACHE_WALLET_KEY);
      if (!cachedWallet) return;
    }

    const onboard = Onboard({
      networkId: await getDefaultNetworkId(),
    });

    if (
      !(cachedWallet
        ? await onboard.walletSelect(cachedWallet)
        : await onboard.walletSelect())
    )
      return;
    await onboard.walletCheck();

    const { wallet } = onboard.getState();

    cache(CACHE_WALLET_KEY, wallet.name);

    const { provider } = wallet;
    provider.on('accountsChanged', () => {
      window.location.reload();
    });
    provider.on('chainChanged', () => {
      window.location.reload();
    });
    // provider.on('disconnect', () => {
    //   disconnect();
    // });
    await this.setProvider(new ethers.providers.Web3Provider(provider));

    this.ethersWallet = this.ethersProvider.getSigner();
    this.address = await this.ethersWallet.getAddress();
  }

  async setFallbackProvider() {
    await this.setProvider(
      new ethers.providers.InfuraProvider('mainnet', INFURA_ID)
    );
  }

  async setProvider(provider) {
    this.ethersProvider = provider;
    this.net = await this.ethersProvider.getNetwork();
  }

  async disconnect() {
    this.address = null;
    cache(CACHE_WALLET_KEY, null);
  }

  getNetworkName() {
    return ~['homestead'].indexOf(this.net.name) ? 'mainnet' : this.net.name; // todo
  }
}

// https://github.com/Synthetixio/staking/blob/c42ac534ba774d83caca183a52348c8b6260fcf4/utils/network.ts#L5
async function getDefaultNetworkId() {
  try {
    if (window?.web3?.eth?.net) {
      const networkId = await window.web3.eth.net.getId();
      return Number(networkId);
    } else if (window?.web3?.version?.network) {
      return Number(window?.web3.version.network);
    } else if (window?.ethereum?.networkVersion) {
      return Number(window?.ethereum?.networkVersion);
    }
    return DEFAULT_NETWORK_ID;
  } catch (e) {
    console.log(e);
    return DEFAULT_NETWORK_ID;
  }
}

export default new Wallet();
