# ilmrr

Public site for ilmrr — artificial intelligence and advanced robotics.

Static files for GitHub Pages on the custom domain `ilmrr.com`. Asset paths are root-relative (`/assets/...`), which matches that domain.

## Local preview

Serve this directory and open the site at the root:

```bash
python3 -m http.server 8765
```

Then visit `http://127.0.0.1:8765/`.

## Deploy

Repository: [sajjad-ahmed/ilmrr-prod](https://github.com/sajjad-ahmed/ilmrr-prod)

Push to `main`. The workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) publishes the site. `CNAME` sets the Pages domain to `ilmrr.com`.

In the repository, set **Settings → Pages → Source** to **GitHub Actions** once. After DNS is in place, turn on **Enforce HTTPS**.
