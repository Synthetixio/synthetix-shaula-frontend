import { ethers } from 'ethers';
import Onboard from 'bnc-onboard';
import { BLOCKNATIVE_KEY, INFURA_ID, CACHE_WALLET_KEY } from 'config';
import cache from 'utils/cache';

const onboard = Onboard({
  dappId: BLOCKNATIVE_KEY,
  networkId: 1,
});

class Wallet {
  async connect(tryCached = false) {
    let cachedWallet;
    if (tryCached) {
      cachedWallet = cache(CACHE_WALLET_KEY);
      if (!cachedWallet) return;
    }

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

  getIsCached() {}

  getNetworkName() {
    return ~['homestead'].indexOf(this.net.name) ? 'mainnet' : this.net.name; // todo
  }
}

export default new Wallet();
