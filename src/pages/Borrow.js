import React from 'react';
import MultiCollateral from './MultiCollateral';

const DEBT_ASSETS = ['sUSD', 'sETH', 'sBTC'];

export default function() {
  return (
    <MultiCollateral
      collateralAssetsFilter={debt =>
        debt === 'sETH'
          ? ['ETH']
          : debt === 'sBTC'
          ? ['renBTC']
          : ['ETH', 'renBTC']
      }
      debtAssets={DEBT_ASSETS}
    />
  );
}
