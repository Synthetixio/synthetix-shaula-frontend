import React from 'react';
import MultiCollateral from './MultiCollateral';

const COLLATERAL_ASSETS = ['sUSD'];
const DEBT_ASSETS = ['sETH', 'sBTC'];

export default function() {
  return (
    <MultiCollateral
      collateralAssets={COLLATERAL_ASSETS}
      debtAssetsFilter={() => DEBT_ASSETS}
      short
    />
  );
}
