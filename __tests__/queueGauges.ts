import { getStats } from '../src/queueGauges';

import { TestData } from './create.util';
import { getCurrentTestHash } from './setup.util';

let testData: TestData;

beforeEach(async () => {
  jest.resetModuleRegistry();
  const { makeQueue } = await import('./create.util');
  const hash = getCurrentTestHash();
  testData = makeQueue(hash);
});

afterEach(async () => {
  await testData.queue.empty();
  await testData.queue.close();
});

it('should list 1 queued job', async () => {

  const {
    name,
    queue,
    prefix,
    guages,
    registry,
  } = testData;

  await queue.add({ a: 1 });

  await getStats(prefix, name, queue, guages);

  expect(registry.metrics()).toMatchSnapshot();
});
