import type { SectionType } from "@/lib/storefront";

export const ALL_SECTION_TYPES: SectionType[] = [
  "hero", "columns", "image-text", "rich-text", "spacer",
  "featured-products", "shop-grid", "product-detail", "related-products", "search",
  "gallery", "collection-list", "video",
  "newsletter", "cta-banner", "text-columns", "testimonials",
  "faq", "logo-bar", "pricing-plans", "countdown", "stats", "team",
  "about", "contact", "contact-form", "checkout-form", "announcement",
  "auth-login", "auth-signup", "buyer-orders", "buyer-referrals",
];

export const SELF_PADDED_TYPES = new Set<SectionType>([
  "announcement", "hero", "spacer", "newsletter", "cta-banner", "product-detail",
  "checkout-form", "contact-form", "shop-grid", "custom",
]);

export type StyleTarget =
  | "section"
  | "heading"
  | "body"
  | "button"
  | "image"
  | "card"
  | "eyebrow"
  | "subheading"
  | "price"
  | "productCard"
  | "productTitle";

export const DEFAULT_ELEMENT_TARGETS: { id: StyleTarget; label: string }[] = [
  { id: "heading", label: "Heading" },
  { id: "body", label: "Body" },
  { id: "button", label: "Button" },
  { id: "image", label: "Image" },
  { id: "card", label: "Card" },
];

export const SECTION_ELEMENT_TARGETS: Partial<Record<SectionType, { id: StyleTarget; label: string }[]>> = {
  hero: [
    { id: "eyebrow", label: "Eyebrow" },
    { id: "heading", label: "Heading" },
    { id: "body", label: "Body" },
    { id: "button", label: "CTA" },
    { id: "image", label: "Image" },
  ],
  "featured-products": [
    { id: "heading", label: "Title" },
    { id: "subheading", label: "Subtitle" },
    { id: "productCard", label: "Card" },
    { id: "productTitle", label: "Prod. title" },
    { id: "price", label: "Price" },
    { id: "button", label: "Add to cart" },
    { id: "image", label: "Image" },
  ],
  "shop-grid": [
    { id: "productCard", label: "Card" },
    { id: "productTitle", label: "Prod. title" },
    { id: "price", label: "Price" },
    { id: "button", label: "Add to cart" },
    { id: "image", label: "Image" },
  ],
  "related-products": [
    { id: "heading", label: "Title" },
    { id: "productCard", label: "Card" },
    { id: "productTitle", label: "Prod. title" },
    { id: "price", label: "Price" },
  ],
  search: [
    { id: "heading", label: "Title" },
    { id: "productCard", label: "Card" },
    { id: "productTitle", label: "Prod. title" },
    { id: "price", label: "Price" },
  ],
  "image-text": [
    { id: "heading", label: "Heading" },
    { id: "body", label: "Body" },
    { id: "button", label: "CTA" },
    { id: "image", label: "Image" },
  ],
  "cta-banner": [
    { id: "heading", label: "Heading" },
    { id: "body", label: "Body" },
    { id: "button", label: "Button" },
    { id: "image", label: "Image" },
  ],
  newsletter: [
    { id: "heading", label: "Heading" },
    { id: "body", label: "Body" },
    { id: "button", label: "Button" },
  ],
  "rich-text": [
    { id: "heading", label: "Heading" },
    { id: "body", label: "Body" },
  ],
  gallery: [
    { id: "heading", label: "Heading" },
    { id: "image", label: "Images" },
  ],
  testimonials: [
    { id: "heading", label: "Title" },
    { id: "card", label: "Card" },
    { id: "body", label: "Quote" },
  ],
  "text-columns": [
    { id: "heading", label: "Section title" },
    { id: "card", label: "Column" },
    { id: "body", label: "Body" },
  ],
  "collection-list": [
    { id: "heading", label: "Title" },
    { id: "card", label: "Item" },
    { id: "image", label: "Image" },
  ],
  faq: [
    { id: "heading", label: "Heading" },
    { id: "body", label: "Answer" },
  ],
  columns: [
    { id: "heading", label: "Section title" },
    { id: "card", label: "Column card" },
    { id: "image", label: "Images" },
    { id: "body", label: "Body text" },
    { id: "button", label: "Buttons" },
  ],
  "logo-bar": [{ id: "heading", label: "Heading" }, { id: "image", label: "Logos" }],
  video: [{ id: "heading", label: "Heading" }],
  about: [
    { id: "heading", label: "Heading" },
    { id: "subheading", label: "Subheading" },
    { id: "body", label: "Body" },
    { id: "button", label: "CTA" },
    { id: "image", label: "Image" },
  ],
  contact: [
    { id: "heading", label: "Heading" },
    { id: "body", label: "Info text" },
    { id: "button", label: "Send button" },
  ],
  "product-detail": [
    { id: "heading", label: "Title" },
    { id: "price", label: "Price" },
    { id: "body", label: "Tagline" },
    { id: "button", label: "Cart btn" },
    { id: "image", label: "Images" },
  ],
  "video-hero": [
    { id: "heading", label: "Heading" },
    { id: "body", label: "Subheading" },
    { id: "button", label: "CTA button" },
  ],
  "social-feed": [
    { id: "heading", label: "Heading" },
    { id: "card", label: "Post card" },
  ],
  "map-location": [
    { id: "heading", label: "Heading" },
    { id: "body", label: "Info text" },
    { id: "button", label: "CTA button" },
    { id: "card", label: "Info card" },
  ],
  "size-guide": [
    { id: "heading", label: "Heading" },
    { id: "body", label: "Cell text" },
    { id: "card", label: "Card / row" },
  ],
  portfolio: [
    { id: "heading", label: "Heading" },
    { id: "card", label: "Project card" },
    { id: "image", label: "Image" },
    { id: "button", label: "CTA button" },
  ],
  reviews: [
    { id: "heading", label: "Title" },
    { id: "card", label: "Review card" },
    { id: "body", label: "Review text" },
  ],
  lookbook: [
    { id: "heading", label: "Title" },
    { id: "card", label: "Look card" },
    { id: "image", label: "Image" },
    { id: "button", label: "Shop button" },
  ],
  timeline: [
    { id: "heading", label: "Title" },
    { id: "card", label: "Milestone card" },
    { id: "body", label: "Description" },
  ],
  "before-after": [
    { id: "heading", label: "Title" },
    { id: "card", label: "Pair card" },
    { id: "body", label: "Description" },
  ],
  "bundle-offer": [
    { id: "heading", label: "Title" },
    { id: "body", label: "Subheading" },
    { id: "card", label: "Bundle card" },
    { id: "button", label: "CTA button" },
    { id: "price", label: "Price" },
  ],
  "whatsapp-cta": [
    { id: "heading", label: "Heading" },
    { id: "body", label: "Subheading" },
    { id: "button", label: "Chat button" },
    { id: "card", label: "Card wrapper" },
  ],
  "trust-badges": [
    { id: "heading", label: "Heading" },
    { id: "card", label: "Badge card" },
    { id: "body", label: "Description" },
  ],
  "payment-methods": [
    { id: "heading", label: "Label" },
    { id: "card", label: "Method pill" },
  ],
  // Custom sections are block-based — most styling happens per-block (tap a block ›
  // Style tab). These targets only cover a quick global override for every text/
  // button block in the section at once, so only list the ones that actually apply.
  custom: [
    { id: "heading", label: "Headings" },
    { id: "body", label: "Body text" },
    { id: "button", label: "Buttons" },
  ],
};

export const GRADIENT_PRESETS = [
  { label: "None", v: "" },
  { label: "Sunset", v: "linear-gradient(135deg,#f093fb,#f5576c)" },
  { label: "Ocean", v: "linear-gradient(135deg,#4facfe,#00f2fe)" },
  { label: "Forest", v: "linear-gradient(135deg,#43e97b,#38f9d7)" },
  { label: "Dusk", v: "linear-gradient(135deg,#667eea,#764ba2)" },
  { label: "Ember", v: "linear-gradient(135deg,#f77062,#fe5196)" },
  { label: "Slate", v: "linear-gradient(135deg,#0f2027,#203a43,#2c5364)" },
  { label: "Gold", v: "linear-gradient(135deg,#f6d365,#fda085)" },
] as const;

export const SHADOW_PRESETS = [
  { v: undefined as string | undefined, label: "None" },
  { v: "sm", label: "SM" },
  { v: "md", label: "MD" },
  { v: "lg", label: "LG" },
  { v: "xl", label: "XL" },
];

export const RADIUS_PRESETS = [0, 4, 8, 16, 24, 9999] as const;
