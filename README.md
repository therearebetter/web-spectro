# Web spectro

https://therearebetter.github.io/web-spectro/

Web app spectrogram, it can be used for whatever a spectrogram is meant to be used for (:

<img width="2534" height="1184" alt="image" src="https://github.com/user-attachments/assets/0819e1fa-0ecf-401b-b1b0-32b9e76b0ec9" />

## Unimportant stuff

To install dependencies:

```bash
bun install
```

To develop the client-side app with hot reloading:

```bash
bun dev
```

To build the static site for deployment:

```bash
bun run build
```

The build writes a static single-page app to `dist/`. Deploy those files to any
static host configured to serve `index.html` for application routes. The app
does not include an API or application server.

### Publish on GitHub Pages

The `Deploy to GitHub Pages` workflow builds the site with Bun and publishes
`dist/` whenever a commit is pushed to `main`. It can also be started manually
from the repository's **Actions** tab. The site is published at
<https://therearebetter.github.io/web-spectro/>.

For the first deployment, open the repository's **Settings → Pages** and set
**Build and deployment → Source** to **GitHub Actions**. The workflow needs the
repository Actions permissions `pages: write` and `id-token: write`; these are
declared in the workflow.

To type check:

```bash
bun run typecheck
```

Run `bun fmt` to format the code.

This project was created using `bun init` in bun v1.4.4. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
