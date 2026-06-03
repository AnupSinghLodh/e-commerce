import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith("--"));
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 8;
const outFile = new URL("../public/data/products.json", import.meta.url);
const fallbackImage =
  "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80";
const tones = ["mint", "coral", "blue", "violet", "amber", "lime", "coffee", "steel"];

if (!inputPath) {
  console.error("Usage: node scripts/import-flipkart-html.mjs /path/to/flipkart-listing.html --limit=8");
  process.exit(1);
}

const decodeHtml = (value = "") =>
  value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

const stripTags = (value = "") =>
  decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parsePrice = (value = "") => {
  const match = decodeHtml(value).match(/₹\s?([\d,]+)/);
  return match ? Number(match[1].replace(/,/g, "")) : 0;
};

const parseRating = (value = "") => {
  const match = stripTags(value).match(/([1-5](?:\.\d)?)/);
  return match ? Number(match[1]) : 4.1;
};

const parseReviews = (value = "") => {
  const match = stripTags(value).match(/\(([\d,]+)\)/);
  return match ? Number(match[1].replace(/,/g, "")) : 40;
};

const inferCategory = (name = "", details = "") => {
  const text = `${name} ${details}`;
  if (/notebook|register|diary|journal|copy|paper/i.test(text)) return "Notebooks";
  if (/pen|pencil|marker|highlighter|eraser|sharpener|refill/i.test(text)) return "Writing";
  if (/planner|sticky|note|flag|tab|calendar/i.test(text)) return "Planning";
  if (/sketch|colour|color|brush|paint|crayon|drawing|canvas|aida/i.test(text)) return "Art Supplies";
  if (/geometry|compass|calculator|exam|school kit|stationery kit|whiteboard|board/i.test(text)) return "Study Kits";
  if (/organizer|desk|clip|file|folder|tape/i.test(text)) return "Desk Setup";
  return "Study Kits";
};

const specsFor = (name, details, category) => {
  const specs = details
    ? details
        .split(/[|,]/)
        .map((part) => part.trim())
        .filter(Boolean)
    : [];

  if (specs.length) return specs.slice(0, 3);
  if (category === "Writing") return ["Writing tool", "Student pick", "Daily use"];
  if (category === "Art Supplies") return ["Creative work", "Project ready", "Art use"];
  if (category === "Desk Setup") return ["Desk essential", "Compact", "Utility"];
  if (category === "Notebooks") return ["Study notes", "Class use", "Value pick"];
  return [category, "Flipkart listing", "StudyBox pick"];
};

const productBlocks = (html) => {
  const starts = [...html.matchAll(/<div data-id="([^"]+)"/g)].map((match) => ({
    id: match[1],
    index: match.index || 0,
  }));

  return starts.map((start, index) => ({
    id: start.id,
    html: html.slice(start.index, starts[index + 1]?.index || html.length),
  }));
};

const extractProduct = ({ id, html }, index) => {
  const titleMatch = html.match(/<a[^>]+class="[^"]*\bpIpigb\b[^"]*"[^>]+title="([^"]+)"/i);
  const hrefMatch = html.match(/<a[^>]+class="[^"]*\bpIpigb\b[^"]*"[^>]+href="([^"]+)"/i);
  const imageMatch = html.match(/<img[^>]+class="[^"]*\bUCc1lI\b[^"]*"[^>]+(?:src|data-src)="([^"]+)"/i);
  const detailMatch = html.match(/<div[^>]+class="[^"]*\bU_GKRr\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const ratingMatch = html.match(/<div[^>]+class="[^"]*\bMKiFS6\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const reviewsMatch = html.match(/<span[^>]+class="[^"]*\bPvbNMB\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  const priceMatch = html.match(/<div[^>]+class="[^"]*\bhZ3P6w\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const mrpMatch = html.match(/<div[^>]+class="[^"]*\bkRYCnD\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const stockCue = /Only few left/i.test(html);

  if (!titleMatch || !priceMatch) return null;

  const name = decodeHtml(titleMatch[1]).replace(/\s+/g, " ").trim();
  const details = detailMatch ? stripTags(detailMatch[1]) : "";
  const category = inferCategory(name, details);
  const price = parsePrice(priceMatch[1]);
  const compareAt = Math.max(parsePrice(mrpMatch?.[1] || ""), price || 1);
  const href = hrefMatch ? decodeHtml(hrefMatch[1]) : "";
  const image = imageMatch ? decodeHtml(imageMatch[1]) : fallbackImage;

  return {
    id: index + 1,
    name,
    category,
    price,
    compareAt: compareAt > price ? compareAt : Math.round(price * 1.25),
    rating: parseRating(ratingMatch?.[1] || ""),
    reviews: parseReviews(reviewsMatch?.[1] || ""),
    stock: stockCue ? 3 : 10,
    badge: stockCue ? "Only few left" : index < 4 ? "Flipkart find" : "Popular",
    image: image.startsWith("//") ? `https:${image}` : image,
    tone: tones[index % tones.length],
    description: details || "Imported from pasted Flipkart stationery listing.",
    specs: specsFor(name, details, category),
    source: href.startsWith("http") ? href : `https://www.flipkart.com${href}`,
    sourceProductId: id,
  };
};

const html = await readFile(resolve(inputPath), "utf8");
const products = productBlocks(html)
  .map(extractProduct)
  .filter(Boolean)
  .filter((product, index, list) => list.findIndex((item) => item.name === product.name) === index)
  .slice(0, Number.isFinite(limit) && limit > 0 ? limit : 8);

await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(
  outFile,
  JSON.stringify(
    {
      source: "flipkart-pasted-html",
      scrapedAt: new Date().toISOString(),
      blocked: false,
      errors: [],
      products,
    },
    null,
    2
  )
);

console.log(`Imported ${products.length} products from pasted Flipkart HTML.`);
console.log(`Wrote ${outFile.pathname}`);
