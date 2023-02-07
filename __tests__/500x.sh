# npx zx -e 'for (let i = 1; i <= 500; i += 1) { console.log(`==== ${i} ====`); const child = await $`npm run test`; if (child.exitCode !== 0) throw new Error('fail') }'

for i in $(seq 1 500); do echo "==== $i ===="; npm run test || break; done
