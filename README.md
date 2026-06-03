# The StudyBox

A modern React e-commerce storefront for stationery products such as notebooks, writing kits, planners, sticky notes, geometry boxes, art supplies, and desk organizers.

## Features

- Stationery catalog with product photography.
- Category filters, search, max price range, in-stock toggle, and sorting.
- Wishlist state saved in the browser.
- Cart drawer with quantity controls and localStorage persistence.
- Promo code flow with `STUDY10`.
- Delivery calculation and checkout-ready order summary.
- Responsive layout for desktop, tablet, and mobile screens.
- Scroll reveal animations, floating hero visuals, product hover transitions, and reduced-motion support.

## Tech Stack

- React
- TypeScript
- Vite
- CSS3
- Node.js API proxy
- Browser localStorage

## Run Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5174/
```

When using official Flipkart credentials, run the API proxy in a second terminal:

```bash
npm run api
```

Then run Vite:

```bash
npm run dev -- --host 127.0.0.1 --port 5174
```

## Build

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Flipkart Scraper

Run the public-search scraper:

```bash
npm run scrape:flipkart
```

The scraper tries public Flipkart search pages for stationery queries and writes results to:

```text
public/data/products.json
```

If Flipkart returns CAPTCHA or `403`, the script stops safely and records the error. The app then keeps using the local stationery fallback catalog.

## Official Flipkart API Proxy

The frontend calls:

```text
/api/flipkart/search?query=stationery&resultCount=10
```

Vite proxies that request to the local Node backend:

```text
http://127.0.0.1:8787/api/flipkart/search
```

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Add your official Flipkart Affiliate credentials:

```text
FLIPKART_AFFILIATE_ID=your_affiliate_tracking_id
FLIPKART_AFFILIATE_TOKEN=your_affiliate_api_token
FLIPKART_PROXY_PORT=8787
```

These credentials stay on the backend and are never exposed to React. If credentials are missing or the proxy is not running, the app falls back to `public/data/products.json`, then the local stationery catalog.

## Pasted Flipkart HTML Import

If you have copied a Flipkart listing page HTML, convert it into catalog data with:

```bash
npm run import:flipkart-html -- /path/to/pasted-text.txt --limit=8
```

This writes normalized products to:

```text
public/data/products.json
```

## Notes

This is a frontend stationery storefront prototype. It is ready to connect with backend services such as product APIs, authentication, payment gateway integration, order management, and admin inventory tools.
