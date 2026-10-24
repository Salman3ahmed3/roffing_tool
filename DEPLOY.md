# Deploying ExteriorMath to Hostinger

The site is a static Astro build (`dist/`). GitHub Actions builds it and uploads it to Hostinger
(Single web hosting, FTP only) with [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## How auto-deploy works

1. A push to `main` or `claude/dreamy-feynman-7bkuua` (or a manual run, see below) starts the
   **Deploy to Hostinger** workflow.
2. It installs dependencies with `npm ci` and runs `npm run build`. The build runs the unit tests,
   `astro check`, the Astro build and the placeholder check. **If anything fails, the job stops
   and nothing is uploaded**, so the live site stays as it was.
3. [FTP-Deploy-Action](https://github.com/SamKirkland/FTP-Deploy-Action) (v4.4.0) uploads `dist/`
   over FTPS (explicit TLS) to the FTP account's root, which is already `public_html`.
   - It only uploads files that changed since the last deploy. It keeps track in a small file on
     the server, `.ftp-deploy-sync-state.json`. Files removed from the site are also removed from
     the server.
   - `.well-known/` (used for SSL certificate renewal) is never touched.
   - It never wipes the server (`dangerous-clean-slate` is not used).
4. A smoke test then requests `https://exteriormath.com/` and
   `https://exteriormath.com/roof-pitch-calculator/`. If either does not return HTTP 200, the job
   is marked as failed.

Only one deploy runs at a time. If you push twice quickly, the second deploy waits for the first.

`public/.htaccess` is part of every build, so the server's HTTPS redirect, 404 page, security
headers and caching rules are always deployed together with the site.

### The first run

There is no sync-state file on the server yet, so **the first deploy uploads every file once**.
That takes longer than later deploys, which only upload what changed.

## Required secrets

Add these in GitHub: **repository → Settings → Secrets and variables → Actions → New repository
secret**. Get the values from Hostinger: **hPanel → Files → FTP Accounts**.

| Secret         | Value                                                             |
| -------------- | ----------------------------------------------------------------- |
| `FTP_SERVER`   | FTP hostname (or IP) shown in hPanel, without `ftp://`            |
| `FTP_USERNAME` | FTP username, e.g. `u123456789.exteriormath.com`                  |
| `FTP_PASSWORD` | FTP password (reset it in hPanel if you don't have it)            |

If a secret is missing, the upload step fails with a login or connection error.

## Seeing deploy logs

GitHub → the repository → **Actions** → **Deploy to Hostinger** → click a run. Each step
(install, build and test, upload, smoke test) has its own log. The upload log lists every file
it uploaded or deleted.

## Running a deploy by hand

Actions → **Deploy to Hostinger** → **Run workflow** → choose the branch → **Run workflow**.

## Rolling back

**Quickest: revert the bad commit.** `git revert <bad-sha>` and push (or use **Revert** on the
pull request in GitHub). The push deploys the previous content automatically.

**Or redeploy an earlier commit as it was**, with a manual run:

1. Find the last good commit in the repository's commit history and copy its SHA.
2. Create a branch at that commit, for example `git branch rollback-<sha> <sha>` and
   `git push origin rollback-<sha>`, or click **Create branch** on the commit page on GitHub.
3. Actions → **Deploy to Hostinger** → **Run workflow** → pick that branch → **Run workflow**.

Only the files that differ from the current live version are uploaded. When the problem is fixed
and pushed, the next deploy brings the site forward again.

You can also open the last successful run of the good commit in Actions and click **Re-run all
jobs**. That rebuilds and re-uploads exactly that commit.

Manual runs only work on commits that already contain `.github/workflows/deploy.yml`, so this
commit is the earliest one that can be redeployed. For anything older, use a revert.

## If the FTPS connection fails

Some shared-hosting FTP servers present a certificate whose name does not match `FTP_SERVER`.
In `deploy.yml`, add `security: loose` under the upload step's `with:` block and run again. Only
if that still fails, change `protocol: ftps` to `protocol: ftp`. That works, but sends the
password unencrypted, so treat it as a last resort.
