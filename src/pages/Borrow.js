import React from 'react';
import MultiCollateral from './MultiCollateral';

const COLLATERAL_ASSETS = ['renBTC', 'ETH'];
const BORROW_ASSETS = ['sBTC', 'sUSD'];

export default function() {
  return (
    <MultiCollateral
      collateralAssets={COLLATERAL_ASSETS}
      targetAssets={BORROW_ASSETS}
    />
  );
}
