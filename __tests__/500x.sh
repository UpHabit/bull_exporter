npx zx -e 'for (let i = 1; i <= 500; i += 1) { console.log(`==== ${i} ====`); const child = await $`npm run test`; if (child.exitCode !== 0) throw new Error('fail') }'
