import { readFile } from "node:fs/promises";
import http from "node:http";

const PORT = Number(process.env.PORT || process.env.FLIPKART_PROXY_PORT || 8787);
const AFFILIATE_SEARCH_URL = "https://affiliate-api.flipkart.net/affiliate/search/json";
const tones = ["mint", "coral", "blue", "violet", "amber", "lime", "coffee", "steel"];

const loadDotEnv = async () => {
  try {
    const envFile = await readFile(new URL("../.env", import.meta.url), "utf8");
    for (const line of envFile.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

      const [key, ...valueParts] = trimmed.split("=");
      if (!process.env[key]) {
        process.env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // .env is optional; real deployments can provide environment variables directly.
  }
};

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "http://127.0.0.1:5174",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end(JSON.stringify(payload, null, 2));
};

const getAmount = (...prices) => {
  for (const price of prices) {
    if (typeof price === "number") return price;
    if (typeof price?.amount === "number") return price.amount;
  }
  return 0;
};

const inferCategory = (name = "", categoryPath = "") => {
  const text = `${name} ${categoryPath}`;
  if (/notebook|register|diary|journal|copy/i.test(text)) return "Notebooks";
  if (/pen|pencil|marker|highlighter|eraser|sharpener/i.test(text)) return "Writing";
  if (/planner|sticky|note|flag|tab/i.test(text)) return "Planning";
  if (/sketch|colour|color|brush|paint|crayon|drawing/i.test(text)) return "Art Supplies";
  if (/geometry|compass|exam|school kit|stationery kit/i.test(text)) return "Study Kits";
  if (/organizer|desk|clip|file|folder/i.test(text)) return "Desk Setup";
  return "Study Kits";
};

const getImage = (baseInfo) => {
  const imageUrls = baseInfo.imageUrls || {};
  return (
    imageUrls["800x800"] ||
    imageUrls["400x400"] ||
    imageUrls["275x275"] ||
    imageUrls["200x200"] ||
    Object.values(imageUrls)[0] ||
    "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80"
  );
};

const normalizeFlipkartProduct = (item, index) => {
  const baseInfo = item.productBaseInfoV1 || item.productBaseInfo || item;
  const name = baseInfo.title || baseInfo.productName || "Study essential";
  const category = inferCategory(name, baseInfo.categoryPath || "");
  const price = getAmount(baseInfo.flipkartSpecialPrice, baseInfo.flipkartSellingPrice, baseInfo.price) || 299;
  const compareAt =
    getAmount(baseInfo.maximumRetailPrice, baseInfo.mrp, baseInfo.flipkartSellingPrice) || Math.round(price * 1.25);
  const rating = Number(baseInfo.productRating?.average || baseInfo.rating || 4.2);
  const reviews = Number(baseInfo.productRating?.count || baseInfo.reviewCount || 50 + index * 11);

  return {
    id: index + 1,
    name,
    category,
    price,
    compareAt: Math.max(compareAt, price),
    rating: Number.isFinite(rating) ? Math.min(Math.max(rating, 3.5), 5) : 4.2,
    reviews: Number.isFinite(reviews) ? reviews : 50 + index * 11,
    stock: baseInfo.inStock === false ? 0 : 10,
    badge: index < 2 ? "Flipkart API" : index % 3 === 0 ? "Student deal" : "Popular",
    image: getImage(baseInfo),
    tone: tones[index % tones.length],
    description: baseInfo.productDescription || "Official Flipkart API product for stationery shoppers.",
    specs: [category, "Official API", baseInfo.inStock === false ? "Out of stock" : "In stock"],
    source: baseInfo.productUrl,
  };
};

const searchFlipkart = async (query, resultCount) => {
  const affiliateId = process.env.FLIPKART_AFFILIATE_ID;
  const affiliateToken = process.env.FLIPKART_AFFILIATE_TOKEN;

  if (!affiliateId || !affiliateToken) {
    return {
      statusCode: 401,
      payload: {
        source: "flipkart-official-api",
        products: [],
        error: "Missing FLIPKART_AFFILIATE_ID or FLIPKART_AFFILIATE_TOKEN.",
      },
    };
  }

  const url = new URL(AFFILIATE_SEARCH_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("resultCount", String(Math.min(Math.max(resultCount, 1), 10)));

  const flipkartResponse = await fetch(url, {
    headers: {
      "Fk-Affiliate-Id": affiliateId,
      "Fk-Affiliate-Token": affiliateToken,
    },
  });
  const text = await flipkartResponse.text();

  if (!flipkartResponse.ok) {
    return {
      statusCode: flipkartResponse.status,
      payload: {
        source: "flipkart-official-api",
        products: [],
        error: `Flipkart API returned ${flipkartResponse.status}.`,
        details: text.slice(0, 500),
      },
    };
  }

  const data = JSON.parse(text);
  const rawProducts = data.productInfoList || data.products || [];

  return {
    statusCode: 200,
    payload: {
      source: "flipkart-official-api",
      query,
      products: rawProducts.map(normalizeFlipkartProduct),
    },
  };
};

await loadDotEnv();

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 200, {});
    return;
  }

  const requestUrl = new URL(request.url || "/", `http://${request.headers.host}`);

  if (requestUrl.pathname === "/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (requestUrl.pathname !== "/api/flipkart/search") {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  try {
    const query = requestUrl.searchParams.get("query") || "stationery";
    const resultCount = Number(requestUrl.searchParams.get("resultCount") || 10);
    const result = await searchFlipkart(query, resultCount);
    sendJson(response, result.statusCode, result.payload);
  } catch (error) {
    sendJson(response, 500, {
      source: "flipkart-official-api",
      products: [],
      error: error instanceof Error ? error.message : "Unknown proxy error.",
    });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Flipkart proxy running at http://127.0.0.1:${PORT}`);
});
