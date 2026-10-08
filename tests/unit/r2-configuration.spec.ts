import { test, expect } from '@playwright/test'
import { checkConnection, r2Config, uploadEnvironment } from '../../scripts/media/lib/sync.mjs'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const env = { R2_BUCKET: 'test-bucket', R2_ENDPOINT: 'https://example.r2.cloudflarestorage.com', R2_REGION: 'auto', R2_AWS_PROFILE: 'ivan-r2' }
test('R2 configuration prefers requested names, preserves legacy aliases and isolates the public URL', async () => {
  expect(r2Config({...env, MEDIA_BUCKET:'legacy'}).bucket).toBe('test-bucket')
  expect(r2Config({...env, R2_PUBLIC_BASE_URL:'https://media.example.com'}).options).not.toContain('https://media.example.com')
  const directory = await mkdtemp(path.join(tmpdir(),'r2-config-'))
  try {
    const file=path.join(directory,'.env.media.local')
    await writeFile(file,'R2_BUCKET=local-bucket\nR2_ENDPOINT=https://example.r2.cloudflarestorage.com\nR2_REGION=auto\nR2_AWS_PROFILE=ivan-r2\nR2_PUBLIC_BASE_URL=\n')
    expect((await uploadEnvironment({R2_BUCKET:'environment-bucket'},file)).R2_BUCKET).toBe('environment-bucket')
  } finally { await rm(directory,{recursive:true,force:true}) }
})
test('connection only checks version, profile names and bucket access', async () => {
  const calls:string[][]=[]
  await checkConnection({env,run:async (args:string[])=>{
    calls.push(args)
    return {code:0,stdout:args[0]==='--version'?'aws-cli/2.0':args[1]==='list-profiles'?'other\nivan-r2\n':'',stderr:''}
  }})
  expect(calls.map(args=>args.slice(0,2))).toEqual([['--version'],['configure','list-profiles'],['s3api','head-bucket']])
  expect(calls[2]).toContain('--profile'); expect(calls[2]).toContain('ivan-r2')
  expect(calls[2]).toContain(env.R2_ENDPOINT)
})
test('missing config, CLI v1, missing profile and rejected credentials cannot reach upload', async () => {
  expect(()=>r2Config({...env,R2_BUCKET:''})).toThrow('R2_BUCKET')
  expect(()=>r2Config({...env,R2_ENDPOINT:''})).toThrow('R2_ENDPOINT')
  expect(()=>r2Config({...env,R2_AWS_PROFILE:''})).toThrow('aws configure')
  expect(()=>r2Config({...env,R2_ENDPOINT:'https://user:secret@example.com'})).toThrow('embedded credentials')
  await expect(checkConnection({env,run:async()=>({code:0,stdout:'aws-cli/1.0',stderr:''})})).rejects.toThrow('AWS CLI v2')
  await expect(checkConnection({env,run:async(args:string[])=>({code:0,stdout:args[0]==='--version'?'aws-cli/2.0':'missing',stderr:''})})).rejects.toThrow('aws configure --profile ivan-r2')
  let message=''
  try { await checkConnection({env,run:async(args:string[])=>({code:args[1]==='head-bucket'?1:0,stdout:args[0]==='--version'?'aws-cli/2.0':'ivan-r2',stderr:'DO_NOT_EXPOSE_SECRET'})}) } catch(error) {message=(error as Error).message}
  expect(message).toContain('connection failed'); expect(message).not.toContain('DO_NOT_EXPOSE_SECRET')
})
