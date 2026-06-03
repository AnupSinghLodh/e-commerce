import { useEffect, useMemo, useState, type CSSProperties } from "react";

type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  compareAt: number;
  rating: number;
  reviews: number;
  stock: number;
  badge: string;
  image: string;
  tone: string;
  description: string;
  specs: string[];
};

type Cart = Record<number, number>;
type SortKey = "featured" | "priceLow" | "priceHigh" | "rating";

type ProductFeed = {
  source?: string;
  scrapedAt?: string | null;
  blocked?: boolean;
  errors?: string[];
  products?: Product[];
};

const formatPrice = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const fallbackProducts: Product[] = [
  {
    id: 1,
    name: "Classmate Premium Notebook Set",
    category: "Notebooks",
    price: 499,
    compareAt: 699,
    rating: 4.8,
    reviews: 184,
    stock: 12,
    badge: "Best seller",
    tone: "mint",
    image:
      "https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=900&q=80",
    description: "A ruled notebook bundle for class notes, assignments, revision plans, and daily study work.",
    specs: ["5 notebooks", "Ruled pages", "Soft cover"],
  },
  {
    id: 2,
    name: "Campus Writing Essentials Kit",
    category: "Writing",
    price: 349,
    compareAt: 499,
    rating: 4.7,
    reviews: 96,
    stock: 8,
    badge: "New drop",
    tone: "coral",
    image:
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80",
    description: "Pens, pencils, eraser, sharpener, and highlighter packed for everyday classroom work.",
    specs: ["Gel pens", "Pencils", "Highlighter"],
  },
  {
    id: 3,
    name: "Weekly Study Planner",
    category: "Planning",
    price: 799,
    compareAt: 999,
    rating: 4.9,
    reviews: 211,
    stock: 5,
    badge: "Top rated",
    tone: "blue",
    image:
      "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=900&q=80",
    description: "A clean weekly planner for assignments, deadlines, exam prep, and habit tracking.",
    specs: ["Undated", "Goal pages", "A5 size"],
  },
  {
    id: 4,
    name: "Desk Organizer Tray",
    category: "Desk Setup",
    price: 649,
    compareAt: 899,
    rating: 4.6,
    reviews: 73,
    stock: 15,
    badge: "Hot",
    tone: "violet",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
    description: "Keeps pens, clips, sticky notes, cards, and desk supplies arranged in one compact place.",
    specs: ["3 sections", "Matte finish", "Compact"],
  },
  {
    id: 5,
    name: "Artist Sketchbook Pack",
    category: "Art Supplies",
    price: 899,
    compareAt: 1199,
    rating: 4.5,
    reviews: 58,
    stock: 20,
    badge: "Smart pick",
    tone: "amber",
    image:
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=80",
    description: "Thick drawing sheets for pencil sketching, ink practice, color studies, and portfolio work.",
    specs: ["140 GSM", "Spiral bound", "Acid free"],
  },
  {
    id: 6,
    name: "Pastel Sticky Notes Bundle",
    category: "Planning",
    price: 249,
    compareAt: 349,
    rating: 4.4,
    reviews: 140,
    stock: 10,
    badge: "Weekend deal",
    tone: "lime",
    image:
      "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=900&q=80",
    description: "Color-coded sticky notes for revision reminders, bookmarks, quick tasks, and daily planning.",
    specs: ["6 colors", "Page flags", "Reusable tabs"],
  },
  {
    id: 7,
    name: "Geometry Box Pro",
    category: "Study Kits",
    price: 399,
    compareAt: 549,
    rating: 4.7,
    reviews: 64,
    stock: 7,
    badge: "Curated",
    tone: "coffee",
    image:
      "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=900&q=80",
    description: "A complete geometry set for maths diagrams, engineering basics, and exam preparation.",
    specs: ["Compass", "Scale set", "Protractor"],
  },
  {
    id: 8,
    name: "Dual Tip Marker Set",
    category: "Art Supplies",
    price: 1199,
    compareAt: 1599,
    rating: 4.3,
    reviews: 118,
    stock: 0,
    badge: "Sold out",
    tone: "steel",
    image:
      "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=900&q=80",
    description: "Vibrant dual-tip markers for diagrams, headings, project files, journaling, and artwork.",
    specs: ["24 shades", "Brush tip", "Fine tip"],
  },
];

const categoryTiles = [
  ["Notebooks", "Books", "Class notes and journals"],
  ["Writing", "Pens", "Pens, pencils and markers"],
  ["Planning", "Plans", "Planners and sticky notes"],
  ["Art Supplies", "Art", "Sketching and colors"],
  ["Study Kits", "Kits", "Exam-ready essentials"],
  ["Desk Setup", "Desk", "Organizers and clips"],
];

const dealBadges = ["Deal of the day", "Student pick", "Bank offer", "Fast delivery"];

const getDiscount = (product: Product) => Math.round(((product.compareAt - product.price) / product.compareAt) * 100);

function App() {
  const [catalogProducts, setCatalogProducts] = useState<Product[]>(fallbackProducts);
  const [feedStatus, setFeedStatus] = useState("Local stationery catalog");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<SortKey>("featured");
  const [maxPrice, setMaxPrice] = useState(1500);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [wishlist, setWishlist] = useState<Set<number>>(() => new Set());
  const [cart, setCart] = useState<Cart>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [promo, setPromo] = useState("");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(catalogProducts.map((product) => product.category)))],
    [catalogProducts]
  );

  useEffect(() => {
    const storedCart = window.localStorage.getItem("the-studybox-cart");
    const storedWishlist = window.localStorage.getItem("the-studybox-wishlist");

    if (storedCart) {
      setCart(JSON.parse(storedCart) as Cart);
    }

    if (storedWishlist) {
      setWishlist(new Set(JSON.parse(storedWishlist) as number[]));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadProductFeed = async () => {
      try {
        const apiResponse = await fetch("/api/flipkart/search?query=stationery&resultCount=10");
        if (apiResponse.ok) {
          const apiFeed = (await apiResponse.json()) as ProductFeed;
          if (cancelled) return;

          if (apiFeed.products?.length) {
            setCatalogProducts(apiFeed.products);
            setMaxPrice(Math.max(1500, ...apiFeed.products.map((product) => product.price)));
            setFeedStatus("Flipkart official API catalog");
            return;
          }
        }
      } catch {
        // The local proxy is optional in development; fallback data keeps the store usable.
      }

      try {
        const response = await fetch("/data/products.json");
        if (!response.ok) return;

        const feed = (await response.json()) as ProductFeed;
        if (cancelled) return;

        if (feed.products?.length) {
          setCatalogProducts(feed.products);
          setMaxPrice(Math.max(1500, ...feed.products.map((product) => product.price)));
          setFeedStatus(
            feed.source === "flipkart-public-search"
              ? "Flipkart public search data"
              : feed.source === "flipkart-pasted-html"
                ? "Imported Flipkart listing HTML"
                : "Imported catalog"
          );
          return;
        }

        if (feed.blocked) {
          setFeedStatus("Flipkart blocked scraping; showing local catalog");
        }
      } catch {
        if (!cancelled) {
          setFeedStatus("Local stationery catalog");
        }
      }
    };

    loadProductFeed();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem("the-studybox-cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    window.localStorage.setItem("the-studybox-wishlist", JSON.stringify(Array.from(wishlist)));
  }, [wishlist]);

  useEffect(() => {
    const revealTargets = document.querySelectorAll<HTMLElement>("[data-reveal]");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      revealTargets.forEach((target) => target.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    revealTargets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  const filteredProducts = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return catalogProducts
      .filter((product) => category === "All" || product.category === category)
      .filter((product) => product.price <= maxPrice)
      .filter((product) => (inStockOnly ? product.stock > 0 : true))
      .filter((product) => {
        const searchable = `${product.name} ${product.category} ${product.description} ${product.specs.join(" ")}`;
        return searchable.toLowerCase().includes(cleanQuery);
      })
      .sort((a, b) => {
        if (sort === "priceLow") return a.price - b.price;
        if (sort === "priceHigh") return b.price - a.price;
        if (sort === "rating") return b.rating - a.rating;
        return b.reviews + b.rating * 100 - (a.reviews + a.rating * 100);
      });
  }, [catalogProducts, category, inStockOnly, maxPrice, query, sort]);

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, quantity]) => {
          const product = catalogProducts.find((item) => item.id === Number(id));
          return product ? { product, quantity } : null;
        })
        .filter(Boolean) as { product: Product; quantity: number }[],
    [cart, catalogProducts]
  );

  const itemCount = cartLines.reduce((total, line) => total + line.quantity, 0);
  const subtotal = cartLines.reduce((total, line) => total + line.product.price * line.quantity, 0);
  const discount = promo.trim().toUpperCase() === "STUDY10" ? subtotal * 0.1 : 0;
  const delivery = subtotal > 999 || subtotal === 0 ? 0 : 49;
  const total = Math.max(subtotal - discount + delivery, 0);

  const addToCart = (product: Product) => {
    if (!product.stock) return;

    setCart((current) => ({
      ...current,
      [product.id]: Math.min((current[product.id] || 0) + 1, product.stock),
    }));
    setCartOpen(true);
  };

  const updateQuantity = (productId: number, nextQuantity: number) => {
    setCart((current) => {
      const next = { ...current };
      if (nextQuantity <= 0) {
        delete next[productId];
      } else {
        next[productId] = nextQuantity;
      }
      return next;
    });
  };

  const toggleWishlist = (productId: number) => {
    setWishlist((current) => {
      const next = new Set(current);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  return (
    <div className="app-shell">
      <Header itemCount={itemCount} onCartOpen={() => setCartOpen(true)} />

      <main>
        <CategoryRail activeCategory={category} onCategoryChange={setCategory} />
        <DealBanner />
        <TrustBar />

        <section className="storefront" id="catalog">
          <div className="section-heading" data-reveal>
            <span>Live catalog</span>
            <div>
              <h2>Discover stationery that keeps your study desk moving.</h2>
              <p>
                Search, filter, compare, wishlist, and build a cart for notebooks, pens, planners, and art supplies.
                <span className="feed-status">{feedStatus}</span>
              </p>
            </div>
          </div>

          <div className="shop-layout">
            <aside className="filters-panel" data-reveal>
              <div>
                <label htmlFor="search">Search products</label>
                <input
                  id="search"
                  type="search"
                  placeholder="Try notebooks, pens, planner..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>

              <div>
                <p className="control-label">Category</p>
                <div className="category-list">
                  {categories.map((item) => (
                    <button
                      className={category === item ? "is-active" : ""}
                      type="button"
                      key={item}
                      onClick={() => setCategory(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="range-row">
                  <label htmlFor="price">Max price</label>
                  <strong>{formatPrice.format(maxPrice)}</strong>
                </div>
                <input
                  id="price"
                  type="range"
                  min="100"
                  max="1500"
                  step="50"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(Number(event.target.value))}
                />
              </div>

              <label className="switch-row">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(event) => setInStockOnly(event.target.checked)}
                />
                <span>Show in-stock products only</span>
              </label>
            </aside>

            <div className="catalog-panel">
              <div className="catalog-toolbar" data-reveal>
                <p>
                  <strong>{filteredProducts.length}</strong> products found
                </p>
                <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
                  <option value="featured">Featured</option>
                  <option value="priceLow">Price: low to high</option>
                  <option value="priceHigh">Price: high to low</option>
                  <option value="rating">Highest rated</option>
                </select>
              </div>

              <div className="product-grid">
                {filteredProducts.map((product, index) => (
                  <ProductCard
                    product={product}
                    key={product.id}
                    index={index}
                    wished={wishlist.has(product.id)}
                    onWishlist={() => toggleWishlist(product.id)}
                    onAdd={() => addToCart(product)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <FeatureSection />
      </main>

      <CartDrawer
        cartLines={cartLines}
        delivery={delivery}
        discount={discount}
        promo={promo}
        setPromo={setPromo}
        subtotal={subtotal}
        total={total}
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onQuantityChange={updateQuantity}
      />
    </div>
  );
}

function Header({
  itemCount,
  onCartOpen,
}: {
  itemCount: number;
  onCartOpen: () => void;
}) {
  return (
    <header className="site-header">
      <a href="#" className="brand" aria-label="The StudyBox home">
        <span>SB</span>
        The StudyBox
      </a>
      <a className="header-search" href="#catalog" aria-label="Jump to product search">
        <span>Search notebooks, pens, planners...</span>
      </a>
      <nav aria-label="Primary navigation">
        <a href="#catalog">Categories</a>
        <a href="#experience">Offers</a>
        <a href="#support">Help</a>
      </nav>
      <button className="cart-button" type="button" onClick={onCartOpen}>
        Cart
        <span>{itemCount}</span>
      </button>
    </header>
  );
}

function CategoryRail({
  activeCategory,
  onCategoryChange,
}: {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}) {
  return (
    <section className="category-rail" aria-label="Popular stationery categories">
      {categoryTiles.map(([categoryName, shortName, detail]) => (
        <button
          className={activeCategory === categoryName ? "is-active" : ""}
          type="button"
          key={categoryName}
          onClick={() => {
            onCategoryChange(categoryName);
            document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <span>{shortName}</span>
          <strong>{categoryName}</strong>
          <small>{detail}</small>
        </button>
      ))}
    </section>
  );
}

function DealBanner() {
  return (
    <section className="deal-banner" aria-label="StudyBox offers">
      <div>
        <span>StudyBox Super Saver</span>
        <strong>Extra 10% off on study essentials</strong>
        <p>Use code STUDY10 on notebooks, writing kits, planners, and art supplies.</p>
      </div>
      <a href="#catalog">Shop offers</a>
    </section>
  );
}

function TrustBar() {
  const benefits = ["Free delivery above 999", "Student-friendly bundles", "Secure checkout", "Fast campus delivery"];

  return (
    <section className="trust-bar" aria-label="Stationery store benefits">
      {benefits.map((benefit) => (
        <span key={benefit}>{benefit}</span>
      ))}
    </section>
  );
}

function ProductCard({
  product,
  index,
  wished,
  onWishlist,
  onAdd,
}: {
  product: Product;
  index: number;
  wished: boolean;
  onWishlist: () => void;
  onAdd: () => void;
}) {
  const discount = getDiscount(product);

  return (
    <article
      className={`product-card tone-${product.tone}`}
      style={{ "--delay": `${index * 70}ms` } as CSSProperties}
      data-reveal
    >
      <div className="product-media">
        <img src={product.image} alt={product.name} loading="lazy" />
        <span>{product.badge}</span>
        <button
          className={`wishlist-button ${wished ? "is-wished" : ""}`}
          type="button"
          onClick={onWishlist}
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        >
          {wished ? "Saved" : "Save"}
        </button>
      </div>
      <div className="product-content">
        <div className="product-meta">
          <span>{product.category}</span>
          <span className="rating-chip">{product.rating} ★</span>
        </div>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="spec-row">
          {product.specs.map((spec) => (
            <span key={spec}>{spec}</span>
          ))}
        </div>
        <div className="price-row">
          <div>
            <strong>{formatPrice.format(product.price)}</strong>
            <s>{formatPrice.format(product.compareAt)}</s>
            <em>{discount}% off</em>
          </div>
          <button
            type="button"
            onClick={onAdd}
            disabled={!product.stock}
            aria-label={product.stock ? `Add ${product.name} to cart` : `${product.name} is sold out`}
          >
            {product.stock ? "Add to cart" : "Sold out"}
          </button>
        </div>
        <div className="commerce-row">
          {dealBadges.map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>
      </div>
    </article>
  );
}

function FeatureSection() {
  return (
    <section className="feature-section" id="experience">
      <div className="section-heading" data-reveal>
        <span>Store experience</span>
        <div>
          <h2>Built like a product team would ship it.</h2>
          <p>Each interaction supports a stationery buying journey instead of decorating around it.</p>
        </div>
      </div>

      <div className="feature-grid">
        {[
          ["Smart discovery", "Find notebooks, pens, art supplies, planners, and study kits faster."],
          ["Saved desk cart", "Cart and wishlist stay saved in the browser through localStorage."],
          ["Checkout logic", "Student discounts, delivery rules, totals, and quantity control are wired."],
          ["Modern motion", "Scroll reveals, card lift, floating order flow, and reduced-motion support."],
        ].map(([title, body]) => (
          <article key={title} data-reveal>
            <span>{title.slice(0, 2).toUpperCase()}</span>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </div>

      <div className="support-band" id="support" data-reveal>
        <div>
          <span>Support desk</span>
          <strong>Need help building a study kit?</strong>
          <p>Notebook bundles, exam kits, art supply combos, return support, and stock alerts can plug into this flow.</p>
        </div>
        <a href="mailto:asingh29240@gmail.com">Contact stationery team</a>
      </div>
    </section>
  );
}

function CartDrawer({
  cartLines,
  delivery,
  discount,
  promo,
  setPromo,
  subtotal,
  total,
  isOpen,
  onClose,
  onQuantityChange,
}: {
  cartLines: { product: Product; quantity: number }[];
  delivery: number;
  discount: number;
  promo: string;
  setPromo: (value: string) => void;
  subtotal: number;
  total: number;
  isOpen: boolean;
  onClose: () => void;
  onQuantityChange: (productId: number, nextQuantity: number) => void;
}) {
  return (
    <div className={`drawer-shell ${isOpen ? "is-open" : ""}`} aria-hidden={!isOpen}>
      <button className="drawer-backdrop" type="button" onClick={onClose} aria-label="Close cart" />
      <aside className="cart-drawer" aria-label="Shopping cart">
        <div className="drawer-header">
          <div>
            <span>Checkout</span>
            <h2>Your cart</h2>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {cartLines.length ? (
          <div className="cart-list">
            {cartLines.map(({ product, quantity }) => (
              <article className="cart-line" key={product.id}>
                <img src={product.image} alt={product.name} />
                <div>
                  <strong>{product.name}</strong>
                  <span>{formatPrice.format(product.price)}</span>
                  <div className="quantity-control">
                    <button type="button" onClick={() => onQuantityChange(product.id, quantity - 1)}>
                      -
                    </button>
                    <span>{quantity}</span>
                    <button
                      type="button"
                      onClick={() => onQuantityChange(product.id, Math.min(quantity + 1, product.stock))}
                    >
                      +
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-cart">
            <strong>Your cart is empty.</strong>
            <p>Add stationery from the catalog and it will appear here.</p>
          </div>
        )}

        <div className="promo-box">
          <label htmlFor="promo">Promo code</label>
          <div>
            <input
              id="promo"
              value={promo}
              onChange={(event) => setPromo(event.target.value)}
              placeholder="STUDY10"
            />
            <span>{promo.trim().toUpperCase() === "STUDY10" ? "Applied" : "Try STUDY10"}</span>
          </div>
        </div>

        <div className="summary-box">
          <p>
            <span>Subtotal</span>
            <strong>{formatPrice.format(subtotal)}</strong>
          </p>
          <p>
            <span>Discount</span>
            <strong>- {formatPrice.format(discount)}</strong>
          </p>
          <p>
            <span>Delivery</span>
            <strong>{delivery ? formatPrice.format(delivery) : "Free"}</strong>
          </p>
          <p className="summary-total">
            <span>Total</span>
            <strong>{formatPrice.format(total)}</strong>
          </p>
        </div>

        <button className="checkout-button" type="button" disabled={!cartLines.length}>
          Continue to checkout
        </button>
      </aside>
    </div>
  );
}

export default App;
