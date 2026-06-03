import { mkdir, writeFile } from "node:fs/promises";

const SEARCH_QUERIES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["stationery", "notebook", "pen set", "sticky notes", "sketchbook", "geometry box"];

const OUT_FILE = new URL("../public/data/products.json", import.meta.url);
const FLIPKART_SEARCH_URL = "https://www.flipkart.com/search?q=";

const tones = ["mint", "coral", "blue", "violet", "amber", "lime", "coffee", "steel"];

const categoryRules = [
  ["Notebooks", /notebook|register|diary|journal|copy/i],
  ["Writing", /pen|pencil|marker|highlighter|eraser|sharpener/i],
  ["Planning", /planner|sticky|note|flag|tab/i],
  ["Art Supplies", /sketch|colour|color|brush|paint|crayon|drawing/i],
  ["Study Kits", /geometry|compass|exam|school kit|stationery kit/i],
  ["Desk Setup", /organizer|desk|clip|file|folder/i],
];

const fallbackImage =
  "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80";

const decodeHtml = (value) =>
  value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

const stripTags = (value) =>
  decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parsePrice = (value) => {
  const match = value.match(/₹\s?([\d,]+)/);
  return match ? Number(match[1].replace(/,/g, "")) : 0;
};

const parseRating = (value) => {
  const match = value.match(/([3-5](?:\.\d)?)\s?★/);
  return match ? Number(match[1]) : 4.2;
};

const inferCategory = (name) => {
  const rule = categoryRules.find(([, pattern]) => pattern.test(name));
  return rule ? rule[0] : "Study Kits";
};

const makeSpecs = (name, category) => {
  if (category === "Notebooks") return ["Ruled pages", "Study use", "Value pack"];
  if (category === "Writing") return ["Daily writing", "Student pick", "Smooth ink"];
  if (category === "Planning") return ["Organized study", "Quick notes", "Desk friendly"];
  if (category === "Art Supplies") return ["Creative work", "Project files", "Color ready"];
  if (category === "Desk Setup") return ["Desk storage", "Compact", "Study setup"];
  return [name.split(" ")[0] || "Study", "Exam ready", "Campus essential"];
};

const normalizeProduct = (raw, index) => {
  const name = raw.name.replace(/\s+/g, " ").trim();
  const category = inferCategory(name);
  const price = raw.price || 299 + index * 50;
  const compareAt = raw.compareAt > price ? raw.compareAt : Math.round(price * 1.28);

  return {
    id: index + 1,
    name,
    category,
    price,
    compareAt,
    rating: raw.rating || 4.2,
    reviews: raw.reviews || 40 + index * 13,
    stock: raw.stock ?? 10,
    badge: index < 2 ? "Flipkart find" : index % 3 === 0 ? "Student deal" : "Popular",
    image: raw.image || fallbackImage,
    tone: tones[index % tones.length],
    description: `Sourced from Flipkart search results for stationery shoppers. Good for study, planning, and desk use.`,
    specs: makeSpecs(name, category),
    source: raw.source,
  };
};

const fetchSearchPage = async (query) => {
  const url = `${FLIPKART_SEARCH_URL}${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-IN,en;q=0.9",
    },
  });
  const html = await response.text();

  if (response.status === 403 || /recaptcha|captcha/i.test(html)) {
    throw new Error(`Flipkart blocked "${query}" with CAPTCHA/403. Not bypassing protections.`);
  }

  if (!response.ok) {
    throw new Error(`Flipkart returned ${response.status} for "${query}".`);
  }

  return { html, url };
};

const parseProducts = (html, sourceUrl) => {
  const products = [];
  const seen = new Set();
  const linkPattern = /<a\b[^>]*href="([^"]*\/p\/[^"]*)"[^>]*>([\s\S]{100,4500}?)<\/a>/g;

  for (const match of html.matchAll(linkPattern)) {
    const href = decodeHtml(match[1]);
    const fragment = match[2];
    const titleMatch = fragment.match(/title="([^"]{8,180})"/i);
    const text = stripTags(fragment);
    const price = parsePrice(text);
    const imageMatch = fragment.match(/<img[^>]+(?:src|data-src)="([^"]+)"/i);
    const possibleName = titleMatch ? decodeHtml(titleMatch[1]) : text.split("₹")[0]?.trim();
    const name = possibleName?.replace(/\s+/g, " ").trim();

    if (!name || name.length < 8 || !price || seen.has(name.toLowerCase())) {
      continue;
    }

    seen.add(name.toLowerCase());
    products.push({
      name,
      price,
      compareAt: 0,
      rating: parseRating(text),
      image: imageMatch ? decodeHtml(imageMatch[1]) : fallbackImage,
      source: href.startsWith("http") ? href : `https://www.flipkart.com${href}`,
      sourceSearch: sourceUrl,
    });
  }

  return products;
};

const main = async () => {
  const scraped = [];
  const errors = [];

  for (const query of SEARCH_QUERIES) {
    try {
      const { html, url } = await fetchSearchPage(query);
      scraped.push(...parseProducts(html, url));
    } catch (error) {
      errors.push(error.message);
    }
  }

  const unique = Array.from(new Map(scraped.map((item) => [item.name.toLowerCase(), item])).values());
  const products = unique.slice(0, 16).map(normalizeProduct);

  await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
  await writeFile(
    OUT_FILE,
    JSON.stringify(
      {
        source: "flipkart-public-search",
        scrapedAt: new Date().toISOString(),
        blocked: products.length === 0,
        errors,
        products,
      },
      null,
      2
    )
  );

  if (products.length === 0) {
    console.warn("No Flipkart products were scraped. The app will keep using local fallback products.");
    errors.forEach((error) => console.warn(`- ${error}`));
    return;
  }

  console.log(`Saved ${products.length} Flipkart products to ${OUT_FILE.pathname}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
