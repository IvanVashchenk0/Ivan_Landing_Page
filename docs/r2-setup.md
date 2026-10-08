# Manual R2 setup

Nothing is uploaded during setup. The bucket must already exist; these tools never create buckets, delete objects, or publish the website. AWS CLI v2 is required only for connectivity checks and synchronization, not app development/builds.

1. In Cloudflare R2, create a **User API token** with **Object Read & Write**, scoped to your portfolio bucket only. Save the generated S3 Access Key ID and Secret Access Key privately. Do not paste them into source files or chat. See [Cloudflare S3 setup](https://developers.cloudflare.com/r2/get-started/s3/).
2. If AWS CLI v2 is missing, install it using the [official AWS CLI instructions](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html). Then run this yourself:

   ```sh
   aws configure --profile ivan-r2
   ```

   Enter the Cloudflare R2 Access Key ID, Secret Access Key, region `auto`, and output format `json`. Credentials stay in your local AWS profile. The repository tools never print or directly open AWS credential files.
3. Edit the ignored `.env.media.local` at the repository root:

   ```dotenv
   R2_BUCKET=<your-existing-bucket-name>
   R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   R2_REGION=auto
   R2_AWS_PROFILE=ivan-r2
   R2_PUBLIC_BASE_URL=
   ```

   Paste the bucket's exact name into `R2_BUCKET`. Paste your R2 S3 API endpoint into `R2_ENDPOINT` (available in R2 Overview / the API token confirmation). Replace angle-bracket placeholders; do not leave them literally. Keep the optional public URL blank until your custom media domain exists. Do not add access/secret keys to this file when using the profile.
4. Verify local bytes, then verify read-only connectivity:

   ```sh
   npm run media:verify
   npm run media:connection
   ```

   Connection checks AWS CLI v2, lists profile **names** only, and issues `head-bucket`. It never uploads. Successful read access does not prove write permission; uploads will fail clearly if the token lacks it.
5. Inspect the offline plan:

   ```sh
   npm run media:sync -- --dry-run
   ```

   This needs no AWS CLI, credentials or remote access. It lists all local candidate IDs, source paths, versioned keys, byte sizes, SHA-256, MIME types and cache policies. Remote state is unknown in this mode; real sync will skip matching objects.
6. **Stop and inspect the output. Only when you approve the upload, run:**

   ```sh
   npm run media:sync
   ```

   Real sync verifies all sources, repeats the read-only connection precheck, compares each object's SHA-256 metadata, size and headers, and uploads only missing/mismatched objects. Previous versions remain. No command implicitly runs sync after setup.

## Configuration compatibility

The earlier scripts used `MEDIA_BUCKET`, `MEDIA_ENDPOINT`, `MEDIA_REGION`, and `MEDIA_PROFILE`. These remain fallback aliases; corresponding nonblank `R2_*` fields take priority. Environment values override the same keys in `.env.media.local`. The named AWS profile is preferred. The existing `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` environment fallback remains available when no profile is selected; do not put credentials in `VITE_` variables. No dotenv dependency was added; Node 22's built-in parser is used.

`R2_PUBLIC_BASE_URL` is optional script-side information, never an upload endpoint or automatically copied browser configuration. Bucket/private settings never enter browser code. Runtime still uses only the browser-safe manifest and `VITE_MEDIA_BASE_URL`.

## Future public delivery (not performed by setup)

In Cloudflare: **R2 bucket → Settings → Custom Domains → connect `media.<domain>`**. After it is active, set `R2_PUBLIC_BASE_URL` locally if desired and set `VITE_MEDIA_BASE_URL=https://media.<domain>` in Vercel's environment. This public custom domain is distinct from the S3 API endpoint. `r2.dev` is for temporary development/testing only, not the permanent production URL.

Configure bucket CORS for the actual website origins before using cross-origin media. GET/HEAD must work, with Content-Length, Content-Encoding, Content-Range and Accept-Ranges exposed; verify a real range response returns 206 and correct bytes. See the replaceable example policy and range checklist in [deployment](deployment.md) and [Cloudflare CORS](https://developers.cloudflare.com/r2/buckets/cors/).

Production requires a real public media base URL and forbids local mode. A build never requires source originals, AWS CLI or credentials. Without a CDN, `npm run dev` uses the manifest-only local endpoint; `VITE_USE_LOCAL_MEDIA=true` explicitly forces it. `.env.example` contains an illustrative public URL: remove it or force local mode if copying the example before a CDN exists.
