# Static Site Hosting: S3 + CloudFront + Route 53

## Overview

One S3 bucket holds everything. One CloudFront distribution serves one domain. Games live at paths, not subdomains.

**Your setup:**

| URL | Points to |
|---|---|
| `conkgames.com` | Astro build output (`/index.html`, `/assets/`, etc.) |
| `www.conkgames.com` | Same as above |
| `conkgames.com/phonepass` | `/phonepass/index.html` in the same bucket |
| `conkgames.com/newgame` | `/newgame/index.html` — adding more follows the same pattern |

**Why path-based:** no wildcard cert, no CloudFront Function, no per-game DNS record. Adding a game is just "drop a folder in S3." One cert, one cache namespace, one Route 53 record set, ever.

---

## 1. S3 Bucket Structure

Create one bucket (e.g., `conkgames`) with this layout:

```
conkgames/
├── index.html          ← Astro site root (conkgames.com)
├── assets/             ← Astro build assets
├── _astro/             ← Astro build output
├── phonepass/
│   └── index.html      ← conkgames.com/phonepass
└── newgame/
    └── index.html       ← conkgames.com/newgame (future)
```

Setup:
1. **S3 → Create bucket**, name it `conkgames` (name doesn't matter)
2. **Region:** `us-east-1` or wherever
3. **Block all public access:** leave it **ON** — CloudFront uses OAC (private access), bucket stays private
4. Upload your files in the structure above

---

## 2. Request an SSL Certificate (ACM)

CloudFront requires the cert to be in **us-east-1** regardless of your bucket region.

1. Go to **Certificate Manager → Request a certificate**
2. Switch region to **us-east-1**
3. Choose **Request a public certificate**
4. Add domain names:
   - `conkgames.com`
   - `www.conkgames.com`
5. Validation: **DNS validation**
6. Click **Create records in Route 53** — AWS adds the validation CNAMEs automatically
7. Wait until status shows **Issued** (~2 minutes)

---

## 3. Create the CloudFront Distribution

1. Go to **CloudFront → Create distribution**
2. **Origin domain:** select your S3 bucket (use the S3 REST endpoint, not the website endpoint)
3. **Origin access:** choose **Origin access control settings (recommended)**
   - Create a new OAC with default settings
   - CloudFront will prompt you to update the S3 bucket policy — do this after creation
4. **Viewer protocol policy:** Redirect HTTP to HTTPS
5. **Cache policy:** `CachingOptimized`
6. **Alternate domain names (CNAMEs):** add `conkgames.com` and `www.conkgames.com`
7. **Custom SSL certificate:** select the cert you just issued
8. **Default root object:** `index.html`
9. Create distribution — deploys in ~5-10 minutes

### Handle Folder URLs Without Trailing Slash

By default, S3/CloudFront only auto-resolves `index.html` for the root `/`, not for `/phonepass`. To make `conkgames.com/phonepass` (no trailing slash) serve `/phonepass/index.html`, add a small CloudFront Function:

1. **CloudFront → Functions → Create function**, name it `conkgames-index-rewrite`
2. Runtime: `cloudfront-js-2.0`
3. Code:

```javascript
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Leave the bare root alone — default root object handles conkgames.com/
  if (uri === '/' || uri === '') {
    return request;
  }

  // Normalize: strip a trailing slash so "/phonepass" and "/phonepass/" match
  if (uri.endsWith('/')) {
    uri = uri.slice(0, -1);
  }

  // If there's no file extension, treat it as a folder and append /index.html
  if (!uri.includes('.', uri.lastIndexOf('/'))) {
    uri = uri + '/index.html';
  }

  request.uri = uri;
  return request;
}
```

4. **Save**, then **Publish**
5. Back in the distribution's default cache behavior → **Function associations → Viewer request** → select `conkgames-index-rewrite`

> Alternative if you'd rather skip the function: always link to games with a trailing slash (`conkgames.com/phonepass/`) and rely on each subfolder having its own implicit index — but CloudFront's default root object only applies to the bucket root, so subfolders still need this function or an S3 redirect rule either way. The function is the simplest fix.

### Update the S3 Bucket Policy

CloudFront shows a banner with the policy to copy after creation. Go to:

**S3 → your bucket → Permissions → Bucket policy → Edit**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::conkgames/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

---

## 4. Configure Route 53

1. Go to **Route 53 → Hosted zones → conkgames.com**
2. Create an **A record** for the apex domain:
   - Record type: **A**
   - Alias ON → **Alias to CloudFront distribution**
   - Select your distribution
3. Create another **A record** for `www`, same alias target

That's it — these two records never change as you add games, since everything is path-based on the same domain.

---

## 5. Astro Build Deploy

Build your Astro site and upload the output to the bucket root:

```bash
npm run build
# output is in ./dist/

aws s3 sync ./dist s3://conkgames --delete
```

Individual game folders go alongside it:

```bash
aws s3 cp phonepass/ s3://conkgames/phonepass/ --recursive
```

> Be careful with `--delete` on `aws s3 sync` — only sync the Astro `dist/` output to the bucket root, don't sync the whole bucket, or you'll wipe out your game folders. Keep Astro deploys and game deploys as separate commands.

---

## 6. Invalidate Cache After Deploys

```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

Or invalidate just what changed:

```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/phonepass/*"
```

---

## Adding a New Game (Future)

Each new game is a folder under `single_file_games/<gamename>/` in the repo with a single `index.html` inside. CI/CD syncs it automatically on push. To deploy manually:

1. Create `single_file_games/newgame/index.html` in the repo
2. Upload the folder to S3: `aws s3 cp single_file_games/newgame/ s3://conkgames/newgame/ --recursive`
3. Invalidate cache: `--paths "/newgame/*"`

No DNS changes, no cert changes, no CloudFront config changes. The index-rewrite function already handles it.

---

## Cost Estimate (low traffic)

| Service | Monthly |
|---|---|
| S3 storage + requests | < $0.10 |
| CloudFront (first 1TB free tier) | $0 |
| Route 53 hosted zone | $0.50 |
| ACM certificate | Free |
| CloudFront Functions | Free (first 2M invocations/month) |

---

## Quick Checklist

- [ ] S3 bucket created with correct file structure (`/`, `/phonepass/`, etc.)
- [ ] Astro build output uploaded to bucket root
- [ ] Game folders uploaded with their own `index.html`
- [ ] ACM cert (`conkgames.com` + `www.conkgames.com`) issued in us-east-1
- [ ] CloudFront Function `conkgames-index-rewrite` created, published, and attached to viewer request
- [ ] CloudFront distribution created with OAC
- [ ] S3 bucket policy updated with CloudFront OAC policy
- [ ] Route 53 A records for apex and www only
- [ ] Default root object set to `index.html`
