# etl-marketplace

This project contains multiple scripts that helps Marketplace Developers to perform some actions on our Platform.

The scripts are written using [Bun](https://bun.sh), a Javascript runtime that executes TypeScript by default.

To Install Bun

```bash
    curl -fsSL https://bun.sh/install | bash
```

Install Dependencies

```bash
bun install
```

To run:

```bash
bun run src/scripts/index.ts
```

Some scripts depends on environment variables that you can find on .env.example

Clone .env.example and rename to .env

Add the properties based on the instructions found on the script you desire to run
