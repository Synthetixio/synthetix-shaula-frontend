import React from 'react';
import MultiCollateral from './MultiCollateral';

const COLLATERAL_ASSETS = ['ETH', 'renBTC'];

export default function() {
  return (
    <MultiCollateral
      collateralAssets={COLLATERAL_ASSETS}
      debtAssetsFilter={currentCollateralName =>
        currentCollateralName === 'ETH' ? ['sUSD', 'sETH'] : ['sUSD', 'sBTC']
      }
    />
  );
}
