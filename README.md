# Bun + React SPA

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

To type check:

```bash
bun run typecheck
```

Run `bun fmt` to format the code.

This project was created using `bun init` in bun v1.4.4. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
