import * as ethers from 'ethers';

export function bytesFormatter(input) {
  return ethers.utils.formatBytes32String(input);
}
