import * as crypto from 'crypto';

let currentTest;

(jasmine as any).getEnv().addReporter({
  specStarted: result => currentTest = result,
});

export function getCurrentTest(): string {
  return currentTest.description;
}

export function getCurrentTestHash(): string {
  return crypto.createHash('md5')
    .update(getCurrentTest())
    .digest('hex')
    .substr(0, 16);
}
