import React from 'react';
import MultiCollateral from './MultiCollateral';

const COLLATERAL_ASSETS = ['sUSD'];
const DEBT_ASSETS = ['sETH', 'sBTC'];

export default function() {
  return (
    <MultiCollateral
      collateralAssetsFilter={() => COLLATERAL_ASSETS}
      debtAssets={DEBT_ASSETS}
      short
    />
  );
}
