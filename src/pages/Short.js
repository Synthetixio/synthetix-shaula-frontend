import React from 'react';
import MultiCollateral from './MultiCollateral';

const COLLATERAL_ASSETS = ['sUSD'];
const SHORT_ASSETS = ['sETH', 'sBTC'];

export default function() {
  return (
    <MultiCollateral
      collateralAssets={COLLATERAL_ASSETS}
      targetAssetsFilter={() => SHORT_ASSETS}
      short
    />
  );
}
