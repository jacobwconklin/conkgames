import { execSync } from 'child_process';
import { readdir, readFile, stat } from 'fs/promises';
import { join, relative, posix } from 'path';
import { createReadStream } from 'fs';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { createRequire } from 'module';

// Load .env if present
const require = createRequire(import.meta.url);
try {
  const { config } = await import('dotenv');
  config();
} catch {}

const BUCKET = process.env.BUCKET_NAME;
const DISTRIBUTION_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID;
const REGION = process.env.AWS_REGION ?? 'us-east-1';

if (!BUCKET) throw new Error('Missing env var: BUCKET_NAME');
if (!DISTRIBUTION_ID) throw new Error('Missing env var: CLOUDFRONT_DISTRIBUTION_ID');

const s3 = new S3Client({ region: REGION });
const cf = new CloudFrontClient({ region: 'us-east-1' });

function mime(filePath) {
  if (filePath.endsWith('.html')) return 'text/html';
  if (filePath.endsWith('.css')) return 'text/css';
  if (filePath.endsWith('.js')) return 'application/javascript';
  if (filePath.endsWith('.json')) return 'application/json';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  if (filePath.endsWith('.webp')) return 'image/webp';
  if (filePath.endsWith('.ico')) return 'image/x-icon';
  if (filePath.endsWith('.woff2')) return 'font/woff2';
  if (filePath.endsWith('.woff')) return 'font/woff';
  if (filePath.endsWith('.txt')) return 'text/plain';
  if (filePath.endsWith('.xml')) return 'application/xml';
  return 'application/octet-stream';
}

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

async function putFile(localPath, s3Key) {
  console.log(`  upload: ${s3Key}`);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    Body: createReadStream(localPath),
    ContentType: mime(localPath),
  }));
}

// ── Step 1: Astro build ────────────────────────────────────────────────────
console.log('\n── Step 1: Astro build');
execSync('npm run build', { stdio: 'inherit' });

// ── Step 2: Sync dist/ to S3 root, delete stale keys ──────────────────────
console.log('\n── Step 2: Sync dist/ → s3://' + BUCKET + '/');

const distDir = 'dist';
const distFiles = await collectFiles(distDir);
const distKeys = new Set();

for (const file of distFiles) {
  const rel = relative(distDir, file).replace(/\\/g, '/');
  distKeys.add(rel);
  await putFile(file, rel);
}

// Delete S3 objects under the "site" keys that no longer exist in dist.
// We only delete keys that don't look like game folders (no slash after first segment means it's a root asset).
// Game folders are top-level directories with a single index.html — we skip deleting those.
const gameFolders = new Set(
  (await readdir('single_file_games', { withFileTypes: true }))
    .filter(e => e.isDirectory())
    .map(e => e.name)
);

let continuationToken;
const staleKeys = [];
do {
  const res = await s3.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    ContinuationToken: continuationToken,
  }));
  for (const obj of res.Contents ?? []) {
    const topLevel = obj.Key.split('/')[0];
    if (!gameFolders.has(topLevel) && !distKeys.has(obj.Key)) {
      staleKeys.push(obj.Key);
    }
  }
  continuationToken = res.NextContinuationToken;
} while (continuationToken);

for (const key of staleKeys) {
  console.log(`  delete: ${key}`);
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

// ── Step 3: Upsert single_file_games ──────────────────────────────────────
console.log('\n── Step 3: Upsert single_file_games/ → s3://' + BUCKET + '/');

const gamesDir = 'single_file_games';
const gameDirs = (await readdir(gamesDir, { withFileTypes: true })).filter(e => e.isDirectory());

for (const dir of gameDirs) {
  const indexPath = join(gamesDir, dir.name, 'index.html');
  try {
    await stat(indexPath);
  } catch {
    console.log(`  skip: ${dir.name}/ (no index.html)`);
    continue;
  }
  await putFile(indexPath, `${dir.name}/index.html`);
}

// ── Step 4: CloudFront invalidation ───────────────────────────────────────
console.log('\n── Step 4: CloudFront invalidation');
const inv = await cf.send(new CreateInvalidationCommand({
  DistributionId: DISTRIBUTION_ID,
  InvalidationBatch: {
    CallerReference: Date.now().toString(),
    Paths: { Quantity: 1, Items: ['/*'] },
  },
}));
console.log(`  invalidation: ${inv.Invalidation.Id} (${inv.Invalidation.Status})`);

console.log('\n✓ Deploy complete');
