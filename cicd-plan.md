# CI/CD Plan: conkgames

## Section 1: Direct Node Script (implementing now)

A JavaScript script (`deploy.mjs`) that runs locally to build and deploy everything in one command.

### Steps the script performs

1. **Astro build** — runs `npm run build`, which outputs the static site to `dist/`
2. **Sync Astro dist to S3** — uploads all files in `dist/` to the root of the `conkgames` S3 bucket, replacing any changed files (delete stale files that no longer exist in `dist/`)
3. **Sync single_file_games to S3** — walks each folder under `single_file_games/`; for every folder that contains an `index.html`, upserts that folder name and its `index.html` to `s3://conkgames/<foldername>/index.html`. No deletions — game removals are intentional and manual.
4. **CloudFront invalidation** — invalidates `/*` so the CDN picks up all changes immediately

### What the script needs

- AWS credentials available in the environment (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`) — loaded from a local `.env` file or shell environment
- `BUCKET_NAME` and `CLOUDFRONT_DISTRIBUTION_ID` as env vars
- AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/client-cloudfront`) installed as dev dependencies

### S3 path mapping

| Local path | S3 key |
|---|---|
| `dist/index.html` | `index.html` |
| `dist/assets/...` | `assets/...` |
| `single_file_games/phonepass/index.html` | `phonepass/index.html` |
| `single_file_games/newgame/index.html` | `newgame/index.html` |

---

## Section 2: GitHub Action (TODO — future)

### Trigger
- GitHub Action on `push` to `main`

### Build steps
- Checkout repo
- Setup Node (match local version, e.g. 20.x)
- `npm ci`
- `npm run build` → outputs Astro static site to `dist/`

### AWS auth / secrets
- Use GitHub OIDC → AWS IAM role (preferred, no long-lived keys), or store `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` as repo secrets
- Store `AWS_REGION` and bucket name(s) as repo secrets/vars
- IAM permissions: `s3:PutObject`, `s3:GetObject`, `s3:ListBucket`, `s3:DeleteObject` (for `--delete` sync) scoped to target bucket(s)/prefixes

### Sync job 1: Astro site
- `aws s3 sync dist/ s3://<BUCKET_NAME>/ --delete`
- CloudFront invalidation step after sync

### Sync job 2: single_file_games
Each game is a folder under `single_file_games/` containing one `index.html`. Both the folder and its `index.html` are upserted to the `conkgames` S3 bucket at the matching path (e.g. `single_file_games/phonepass/index.html` → `s3://conkgames/phonepass/index.html`).

```bash
aws s3 sync single_file_games/ s3://conkgames/ \
  --exclude "*" --include "*/index.html"
```

No `--delete` here — game removals are intentional and manual to avoid accidents.

After both syncs, invalidate CloudFront:
```bash
aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
  --paths "/*"
```

### Open questions
- CloudFront distribution ID (store as repo secret/var)
- AWS region
- OIDC role ARN vs. access key secrets — which auth method to set up
- Node version to pin in workflow
