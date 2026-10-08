import { checkConnection, uploadEnvironment } from './lib/sync.mjs'
try {
  await checkConnection({ env: await uploadEnvironment() })
  console.log('R2 connection succeeded: AWS CLI v2 and read-only bucket access verified. No objects were uploaded or modified.')
} catch (error) { console.error(error.message); process.exitCode = 1 }
