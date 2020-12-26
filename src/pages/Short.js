import React from 'react';
import MultiCollateral from './MultiCollateral';

const COLLATERAL_ASSETS = ['sUSD'];
const SHORT_ASSETS = ['sBTC', 'sETH'];

export default function() {
  return (
    <MultiCollateral
      collateralAssets={COLLATERAL_ASSETS}
      targetAssets={SHORT_ASSETS}
      short
    />
  );
}
