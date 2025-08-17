# GitHub Pages Starter

A minimal static site starter for hosting on GitHub Pages with a custom domain.

## Quick start

1. Create a new, empty GitHub repository. Name can be anything.
2. Download this folder and initialize git in it:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
git push -u origin main
```

3. Enable Pages:
   - In GitHub, open **Settings → Pages**.
   - Set **Source** to the `main` branch, **/ (root)** folder.
   - Save. Wait a few minutes for the site to publish.

4. Set your custom domain:
   - In **Settings → Pages**, set **Custom domain** to `example.com` or `www.example.com` and save.
   - This creates or updates the `CNAME` file in the repo. You can also edit `CNAME` directly.

5. Configure DNS with your domain registrar:
   - If using a subdomain like `www.example.com`, add a **CNAME** record pointing `www` to `YOUR-USER.github.io` or to `YOUR-USER.github.io` for user sites, or `YOUR-USER.github.io` for project sites.
   - If pointing the bare/apex domain like `example.com`, add `ALIAS` or `ANAME` to `YOUR-USER.github.io` if supported by your DNS provider. If not supported, follow GitHub Pages docs to add the recommended `A` and `AAAA` records.
   - Ensure the CNAME in the repo matches the domain.

6. Force HTTPS in **Settings → Pages** when the certificate becomes available.

## Repo layout

```
.
├── 404.html
├── CNAME                  # set to your domain, or let GitHub write it
├── assets
│   ├── css/styles.css
│   └── js/main.js
├── images/
├── index.html
├── about/index.html
├── robots.txt
├── sitemap.xml
├── .nojekyll              # ensures no Jekyll processing
└── README.md
```

## Local development

Open `index.html` in your browser or run a tiny server:

```bash
python3 -m http.server 8080
```

Visit `http://localhost:8080`.

## Notes

- Keep `CNAME` containing your exact domain. GitHub Pages uses it to issue the TLS certificate.
- If you later use a static site generator, remove `.nojekyll` if needed and set the correct build target for Pages.
- For SEO, update `title`, `description`, `sitemap.xml`, and `robots.txt` with your domain.
- Add analytics or custom scripts in `assets/js/main.js`.
