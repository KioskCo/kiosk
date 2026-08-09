/** Demo catalog for storefront preview (mirrors shop/src/lib/products.ts). */
export type CatalogProduct = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  category: "Home" | "Apparel" | "Accessories" | "Tech";
  image: string;
};

const PLACEHOLDER = (label: string, color = "#e5e1d8") =>
  `https://placehold.co/600x800/${color.replace("#", "")}/666666?text=${encodeURIComponent(label)}`;

export const products: CatalogProduct[] = [
  {
    slug: "ceramic-pour-over",
    name: "Ceramic Pour-Over",
    tagline: "Slow ritual, perfect cup",
    description: "Hand-finished stoneware dripper for a balanced extraction.",
    price: 68,
    category: "Home",
    image: PLACEHOLDER("Pour-Over", "d4c4b0"),
  },
  {
    slug: "weekender-bag",
    name: "Weekender Carryall",
    tagline: "Full-grain leather",
    description: "Vegetable-tanned leather that develops a rich patina.",
    price: 420,
    category: "Accessories",
    image: PLACEHOLDER("Weekender", "c4a882"),
  },
  {
    slug: "studio-desk-lamp",
    name: "Studio Desk Lamp",
    tagline: "Architectural light",
    description: "Brushed steel, articulated arm, dimmable warm LED.",
    price: 245,
    category: "Home",
    image: PLACEHOLDER("Desk Lamp", "b8c4d4"),
  },
  {
    slug: "linen-blazer",
    name: "Linen Blazer",
    tagline: "Unstructured, all season",
    description: "Soft washed Belgian linen cut for movement.",
    price: 320,
    category: "Apparel",
    image: PLACEHOLDER("Blazer", "c8b8a8"),
  },
  {
    slug: "field-watch",
    name: "Field Watch No. 04",
    tagline: "Quiet timekeeping",
    description: "Swiss automatic in a 38mm brushed steel case.",
    price: 540,
    category: "Accessories",
    image: PLACEHOLDER("Watch", "a8a8a8"),
  },
  {
    slug: "wireless-headphones",
    name: "Wireless Headphones",
    tagline: "Studio sound",
    description: "40-hour battery with adaptive noise cancellation.",
    price: 380,
    category: "Tech",
    image: PLACEHOLDER("Headphones", "8898a8"),
  },
];

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);
export const formatPrice = (n: number) => `₦${n.toLocaleString("en-NG")}`;
