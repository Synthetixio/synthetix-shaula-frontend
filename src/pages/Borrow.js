import React from 'react';
import MultiCollateral from './MultiCollateral';

const COLLATERAL_ASSETS = ['renBTC', 'ETH'];

export default function() {
  return (
    <MultiCollateral
      collateralAssets={COLLATERAL_ASSETS}
      targetAssetsFilter={currentCollateralName =>
        currentCollateralName === 'ETH' ? ['sUSD', 'sETH'] : ['sUSD', 'sBTC']
      }
    />
  );
}
