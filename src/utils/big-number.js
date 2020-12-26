import Big from 'big.js';

const PRECISION = 4;

export function toFixed(a, b) {
  if (isZero(Big(a)) || isZero(Big(b))) {
    return '0';
  }
  return Big(a.toString())
    .div(Big(b.toString()))
    .toFixed(PRECISION);
}

export function formatUnits(a, decimals) {
  return toFixed(a.toString(), Big(10).pow(decimals));
}

export function isZero(a) {
  return a.eq(Big('0'));
}
