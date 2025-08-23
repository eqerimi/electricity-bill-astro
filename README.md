# Electricity Bill Astro

An Astro + React application that estimates electricity bills for different consumer groups using 2025 tariff data. The calculation logic is exposed through a Netlify serverless function.

## Development

Requirements:

- Node.js 20
- npm

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Other useful scripts:

- `npm run build` – build the production site into `dist`
- `npm run preview` – preview the production build locally

## Testing

Run the test suite with [Vitest](https://vitest.dev/):

```bash
npm test
```

Generate coverage information with:

```bash
npm run test:coverage
```

## Deployment

The project is configured for deployment on Netlify. The default build command is `npm run build` and the output directory is `dist` (see `netlify.toml`). Deploy by connecting the repository to Netlify or using the CLI:

```bash
npm run build
netlify deploy --prod
```

This also builds and uploads the Netlify function located in `netlify/functions/calculate-bill.ts`.

