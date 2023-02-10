import * as crypto from 'crypto';

export function getCurrentTestHash(): string {
  return crypto.createHash('md5')
    .update(expect.getState().currentTestName)
    .digest('hex')
    .slice(0, 16);
}
