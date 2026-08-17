import { products } from "./products";

const HERO_IMAGE = products[0].image;

export type LinkTarget = string;
export type Padding = "none" | "sm" | "md" | "lg";
export type Theme = "light" | "dark" | "matte" | "glass";

/* ------------- Design Tokens (per-template visual style) ------------- */
export type FontHeading =
  | "serif" | "sans"
  // Serifs
  | "playfair" | "lora" | "cormorant" | "cinzel"
  // Sans-serifs
  | "poppins" | "raleway" | "josefin" | "oswald" | "montserrat" | "nunito"
  // Fashion / condensed display
  | "bebas" | "barlow" | "righteous" | "lobster"
  // Scripts / calligraphy
  | "dancing" | "greatvibes" | "pacifico" | "satisfy" | "sacramento"
  // Display
  | "abril";
export type FontBody = "inherit" | "sans" | "poppins" | "raleway";

export type DesignTokens = {
  fontHeading: FontHeading;
  fontBody?: FontBody;
  cardRadius: "none" | "sm" | "md" | "lg" | "full";
  buttonShape: "pill" | "rounded" | "square";
  productImageRatio: "square" | "portrait";
  headingCase?: "normal" | "uppercase";
};
export const defaultDesignTokens: DesignTokens = {
  fontHeading: "serif",
  cardRadius: "md",
  buttonShape: "pill",
  productImageRatio: "portrait",
};
export type Align9 =
  | "top-left" | "top-center" | "top-right"
  | "middle-left" | "middle-center" | "middle-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

export type SectionAnimation = "none" | "fadeIn" | "slideUp" | "slideLeft" | "slideRight" | "zoomIn";

export type SectionBase = {
  id: string;
  /** When false the section is hidden in the live store (still editable in the editor) */
  visible?: boolean;
  /** Scroll-triggered entrance animation */
  animation?: SectionAnimation;
  /** Enable parallax depth effect — content shifts at slower speed than scroll */
  parallax?: boolean;
  /** Override the global heading font for this section only */
  headingFont?: FontHeading;
  padding?: Padding;
  background?: "default" | "muted" | "primary";
  bgColor?: string;
  textColor?: string;
  headingColor?: string;
  accentColor?: string;
  fontSize?: "sm" | "md" | "lg" | "xl";
  borderTop?: boolean;
  borderBottom?: boolean;
  borderColor?: string;
  bgImage?: string;
  bgOpacity?: number;
  variant?: string;
  /** Corner rounding in px (0 = sharp, 9999 = full pill) */
  borderRadius?: number;
  /** Box shadow preset */
  shadow?: "sm" | "md" | "lg" | "xl";
  /** Section opacity 10â€“100 (default 100) */
  sectionOpacity?: number;
  /** Custom padding overrides in px â€” override the padding preset */
  paddingTopPx?: number;
  paddingBottomPx?: number;
  paddingXPx?: number;
  /** Whole-section text alignment */
  textAlign?: "left" | "center" | "right";
  /** Heading typography overrides */
  headingWeight?: "300" | "400" | "500" | "600" | "700" | "800" | "900";
  headingLetterSpacing?: "tight" | "normal" | "wide" | "wider";
  /** Body text overrides */
  bodySize?: "xs" | "sm" | "base" | "lg" | "xl";
  bodyLineHeight?: "tight" | "normal" | "relaxed" | "loose";
  /** Independent left/right padding (override paddingXPx per side) */
  paddingLeftPx?: number;
  paddingRightPx?: number;
  /** Section vertical margins â€” space above/below the section */
  marginTopPx?: number;
  marginBottomPx?: number;
  /** Section minimum height in px */
  minHeight?: number;
  /** CSS gradient string, e.g. "linear-gradient(135deg,#667eea,#764ba2)" */
  bgGradient?: string;
  /** Raw CSS escape hatch â€” any valid CSS property:value pairs */
  customCss?: string;
  /** Per-element CSS overrides â€” applied to specific parts inside the section */
  elStyles?: {
    heading?: Record<string, string | number>;
    body?: Record<string, string | number>;
    button?: Record<string, string | number>;
    image?: Record<string, string | number>;
    card?: Record<string, string | number>;
    eyebrow?: Record<string, string | number>;
    subheading?: Record<string, string | number>;
    price?: Record<string, string | number>;
    productCard?: Record<string, string | number>;
    productTitle?: Record<string, string | number>;
  };
  /** Raw CSS escape hatch per element â€” merged after elStyles */
  elCustomCss?: {
    heading?: string;
    body?: string;
    button?: string;
    image?: string;
    card?: string;
    eyebrow?: string;
    subheading?: string;
    price?: string;
    productCard?: string;
    productTitle?: string;
  };
  /** Per-element icon decorations â€” shown on buttons/headings */
  elIcons?: {
    button?: { name: string; lib?: "ionicon" | "feather" | "material"; pos: "left" | "right"; size?: number };
    heading?: { name: string; lib?: "ionicon" | "feather" | "material"; pos: "left" | "right"; size?: number };
  };
};

export type AnnouncementSection = SectionBase & { type: "announcement"; text: string; link?: LinkTarget };

/** A single slide used by the hero "carousel" variant */
export type HeroSlide = {
  eyebrow?: string;
  heading?: string;
  body?: string;
  image?: string;
  ctaLabel?: string;
  ctaLink?: LinkTarget;
};

export type HeroSection = SectionBase & {
  type: "hero";
  eyebrow?: string;
  heading: string;
  body?: string;
  /** Slides used only when variant === "carousel". If empty the single hero fields are used. */
  slides?: HeroSlide[];
  /** Show prev/next arrows on the carousel hero (default false) */
  showCarouselArrows?: boolean;
  image?: string;            // optional â€” not required for text-only variant
  ctaLabel?: string;
  ctaLink?: LinkTarget;
  ctaLabel2?: string;        // second CTA button
  ctaLink2?: LinkTarget;
  ctaStyle?: "solid" | "outline" | "ghost";
  ctaStyle2?: "solid" | "outline" | "ghost";
  align: Align9;
  height?: "sm" | "md" | "lg" | "full";
  overlayOpacity?: number;   // 0â€“100, default 40
  overlayColor?: string;     // hex, default "#000000"
  textBg?: string;           // panel bg for split / stacked / text-only
  imageBoxed?: boolean;      // boxed variants: show image in a card box (default true)
};
export type CartBtnStyle = "plus" | "cart" | "text" | "plus-text" | "cart-text";
export type ProductCardVariant = "classic" | "minimal" | "overlay" | "horizontal" | "bordered" | "floating" | "editorial" | "chip" | "compact";
export type FeaturedProductsSection = SectionBase & {
  type: "featured-products"; heading: string; subheading?: string; productSlugs: string[]; columns: 2 | 3 | 4;
  productLink?: string;
  sourceMode?: "manual" | "inventory";
  /** Add-to-cart button appearance */
  cartBtnStyle?: CartBtnStyle;
  cartBtnBg?: string;
  cartBtnColor?: string;
  cartBtnLabel?: string;
  cartBtnLayout?: "below" | "right";
  /** Card layout style */
  cardVariant?: ProductCardVariant;
};
export type ImageTextSection = SectionBase & {
  type: "image-text"; heading: string; body: string; image: string;
  imageSide: "left" | "right"; ctaLabel?: string; ctaLink?: LinkTarget;
};
export type RichTextSection = SectionBase & { type: "rich-text"; heading?: string; body: string; align: "left" | "center" | "right" };
export type GallerySection = SectionBase & {
  type: "gallery"; heading?: string; images: string[]; columns?: 2 | 3 | 4;
  /** Layout variant: grid (default), masonry, featured (1 big + rest small), minimal (edge-to-edge) */
  variant?: "grid" | "masonry" | "featured" | "minimal";
};
export type CollectionListSection = SectionBase & {
  type: "collection-list"; heading: string; items: { label: string; image: string; link: LinkTarget }[];
  useLiveCategories?: boolean;
};
export type NewsletterSection = SectionBase & {
  type: "newsletter"; heading: string; body?: string; buttonLabel: string;
  webhookUrl?: string;
  successMessage?: string;
};
export type CtaBannerSection = SectionBase & {
  type: "cta-banner"; heading: string; body?: string; ctaLabel: string; ctaLink: LinkTarget; image?: string;
};
export type TextColumnsSection = SectionBase & {
  type: "text-columns"; heading?: string;
  columns: { icon?: string; title: string; body: string }[];
};
export type TestimonialsSection = SectionBase & {
  type: "testimonials"; heading?: string;
  items: { quote: string; author: string; role?: string; avatar?: string }[];
};
export type LogoBarSection = SectionBase & { type: "logo-bar"; heading?: string; logos: { src: string; alt: string }[] };
export type FaqSection = SectionBase & { type: "faq"; heading: string; items: { question: string; answer: string }[] };
export type VideoSection = SectionBase & { type: "video"; heading?: string; url: string };
export type SpacerSection = SectionBase & { type: "spacer"; size: "sm" | "md" | "lg" | "xl" };
export type RelatedProductsSection = SectionBase & {
  type: "related-products"; heading: string; sourceSlug: string; limit: number;
  /** When true, match from live inventory instead of demo catalog */
  useInventory?: boolean;
};
export type SearchBarStyle = "pill" | "sharp" | "underline";
export type SearchIconName = "search" | "sparkles" | "sliders" | "none";
export type FilterChipStyle = "pill" | "tag" | "square";

export type SearchSection = SectionBase & {
  type: "search";
  heading?: string;
  placeholder?: string;
  showFilters: boolean;
  /** Shape of the search input bar */
  barStyle?: SearchBarStyle;
  /** Custom background for the bar (hex). Defaults to accent + opacity */
  barBg?: string;
  /** Custom border colour for the bar */
  barBorderColor?: string;
  /** Custom text/placeholder colour inside the bar */
  barTextColor?: string;
  /** Icon shown on the left of the bar */
  searchIcon?: SearchIconName;
  /** Shape of the filter category chips */
  filterChipStyle?: FilterChipStyle;
  /** Active chip background colour */
  filterActiveBg?: string;
  /** Active chip text colour */
  filterActiveColor?: string;
};
export type ProductDetailSection = SectionBase & {
  type: "product-detail";
  productSlug: string;
  extraImages: string[];
  layout?: "stacked" | "split" | "hero";
  imageRatio?: "square" | "portrait" | "landscape";
  showQty?: boolean;
  showDescription?: boolean;
  addToCartLabel?: string;
  showShareBtn?: boolean;
};
export type CheckoutFormSection = SectionBase & {
  type: "checkout-form";
  heading?: string;
};
export type ContactFormSection = SectionBase & {
  type: "contact-form";
  heading?: string;
  subheading?: string;
};
export type ShopGridSection = SectionBase & {
  type: "shop-grid";
  heading?: string;
  showFilters?: boolean;
  showSearch?: boolean;
  searchPlaceholder?: string;
  filterStyle?: "pills" | "sidebar" | "dropdown";
  columns?: 2 | 3 | 4;
  pageSize?: number;
  cartBtnStyle?: CartBtnStyle;
  cartBtnBg?: string;
  cartBtnColor?: string;
  cartBtnLabel?: string;
  cartBtnLayout?: "below" | "right";
  cardVariant?: ProductCardVariant;
  /** "inventory" = live vendor products; "manual" = template default demo products */
  sourceMode?: "manual" | "inventory";
  /** Search bar appearance */
  barStyle?: SearchBarStyle;
  barBg?: string;
  barBorderColor?: string;
  barTextColor?: string;
  searchIcon?: SearchIconName;
  /** Filter chip appearance */
  filterChipStyle?: FilterChipStyle;
  filterActiveBg?: string;
  filterActiveColor?: string;
};

export type PricingPlan = {
  name: string;
  price: string;
  period?: string;
  description?: string;
  features: string[];
  ctaLabel: string;
  ctaLink: string;
  /** Full Paystack payment page URL (e.g. https://paystack.com/pay/plan-name) */
  paystackLink?: string;
  highlighted?: boolean;
};
export type PricingPlansSection = SectionBase & {
  type: "pricing-plans";
  heading?: string;
  subheading?: string;
  plans: PricingPlan[];
};

export type CountdownSection = SectionBase & {
  type: "countdown";
  heading?: string;
  body?: string;
  targetDate: string;
  ctaLabel?: string;
  ctaLink?: string;
};

export type StatsSection = SectionBase & {
  type: "stats";
  heading?: string;
  items: Array<{ value: string; label: string; description?: string }>;
};

export type TeamSection = SectionBase & {
  type: "team";
  heading?: string;
  subheading?: string;
  members: Array<{ name: string; role: string; bio?: string; avatar?: string; }>;
};

export type ColumnItem = {
  heading?: string;
  body?: string;
  imageUri?: string;
  ctaLabel?: string;
  ctaHref?: string;
  iconName?: string;
  iconBg?: string;
};
/** Free N-column layout â€” each column holds image, heading, body, optional button */
export type ColumnsSection = SectionBase & {
  type: "columns";
  heading?: string;
  subheading?: string;
  count: 2 | 3 | 4;
  items: ColumnItem[];
  gap?: "sm" | "md" | "lg";
  verticalAlign?: "top" | "center" | "bottom";
  /** Aspect ratio for column images (default 1) */
  imgAspectRatio?: number;
  /** Stack columns vertically on small screens (default true) */
  stackOnMobile?: boolean;
};

/** Auth page sections */
export type AuthLoginSection = SectionBase & {
  type: "auth-login";
  heading?: string;
  subheading?: string;
  image?: string;
  imageSide?: "left" | "right" | "background";
  showHeader?: boolean;
  showFooter?: boolean;
  /** Link to the signup page */
  signupLink?: string;
};

export type AuthSignupSection = SectionBase & {
  type: "auth-signup";
  heading?: string;
  subheading?: string;
  image?: string;
  imageSide?: "left" | "right" | "background";
  showHeader?: boolean;
  showFooter?: boolean;
  /** Link to the login page */
  loginLink?: string;
};

/** Buyer dashboard sections */
export type BuyerOrdersSection = SectionBase & {
  type: "buyer-orders";
  heading?: string;
  subheading?: string;
  /** API base URL â€” resolved from the store's API server at runtime */
  apiBase?: string;
};

export type BuyerReferralsSection = SectionBase & {
  type: "buyer-referrals";
  heading?: string;
  subheading?: string;
  /** Reward per successful referral in the store's currency */
  rewardLabel?: string;
  apiBase?: string;
};

/** About us page/section â€” multiple layout variants */
export type AboutSection = SectionBase & {
  type: "about";
  heading?: string;
  subheading?: string;
  body?: string;
  image?: string;
  image2?: string;
  ctaLabel?: string;
  ctaLink?: LinkTarget;
  team?: { name: string; role: string; image?: string; bio?: string }[];
};

/** Contact info + optional inline form â€” multiple layout variants */
export type ContactSection = SectionBase & {
  type: "contact";
  heading?: string;
  subheading?: string;
  email?: string;
  phone?: string;
  address?: string;
  hours?: string;
  showForm?: boolean;
};

/** Video hero — full-width cinematic background video with overlay text */
export type VideoHeroSection = SectionBase & {
  type: "video-hero";
  heading?: string;
  subheading?: string;
  videoUrl?: string;
  posterImage?: string;
  ctaLabel?: string;
  ctaLink?: LinkTarget;
  overlayOpacity?: number;
  height?: "sm" | "md" | "lg" | "full";
  align?: "left" | "center" | "right";
};

/** Social feed — Instagram-style tile grid */
export type SocialFeedSection = SectionBase & {
  type: "social-feed";
  heading?: string;
  handle?: string;
  posts?: Array<{ imageUri: string; caption?: string; link?: string }>;
  columns?: 2 | 3 | 4 | 5 | 6;
  showHandle?: boolean;
};

/** Map + location block */
export type MapLocationSection = SectionBase & {
  type: "map-location";
  heading?: string;
  address?: string;
  phone?: string;
  email?: string;
  hours?: string;
  mapEmbedUrl?: string;
  latitude?: number;
  longitude?: number;
  ctaLabel?: string;
  ctaLink?: LinkTarget;
};

/** Size guide — measurement table */
export type SizeGuideSection = SectionBase & {
  type: "size-guide";
  heading?: string;
  subheading?: string;
  unit?: "cm" | "inches";
  categories?: string[];
  rows: Array<{ size: string; [key: string]: string }>;
  columns: string[];
  note?: string;
};

/** Portfolio / work showcase */
export type PortfolioSection = SectionBase & {
  type: "portfolio";
  heading?: string;
  subheading?: string;
  columns?: 2 | 3 | 4;
  items: Array<{
    title: string;
    category?: string;
    image?: string;
    description?: string;
    link?: string;
    tags?: string[];
  }>;
};

/** Customer reviews / testimonials sourced from your real reviews or manually added */
export type ReviewsSection = SectionBase & {
  type: "reviews";
  heading?: string;
  subheading?: string;
  /** When true, fetches top-rated reviews from the vendor's real reviews — no manual data needed */
  useRealReviews?: boolean;
  /** Only show reviews at or above this star rating (default 4) */
  minRating?: number;
  /** Max reviews to display (default 4) */
  maxItems?: number;
  testimonials?: Array<{
    name: string;
    rating: number;
    text: string;
    productName?: string;
    date?: string;
    avatar?: string;
  }>;
};

/** Lookbook / outfit gallery — great for fashion, beauty, lifestyle */
export type LookbookSection = SectionBase & {
  type: "lookbook";
  heading?: string;
  subheading?: string;
  items: Array<{
    image: string;
    title?: string;
    description?: string;
    link?: string;
    tags?: string[];
  }>;
};

/** Brand story timeline with milestones */
export type TimelineSection = SectionBase & {
  type: "timeline";
  heading?: string;
  subheading?: string;
  milestones: Array<{
    year: string;
    title: string;
    description?: string;
    image?: string;
  }>;
};

/** Before / after comparison — great for beauty, fashion, home decor */
export type BeforeAfterSection = SectionBase & {
  type: "before-after";
  heading?: string;
  subheading?: string;
  pairs: Array<{
    beforeImage: string;
    afterImage: string;
    label?: string;
    description?: string;
  }>;
};

/** Product bundle deal — show 2-3 products as a package with a bundle price */
export type BundleOfferSection = SectionBase & {
  type: "bundle-offer";
  heading?: string;
  subheading?: string;
  bundleLabel?: string;
  ctaLabel?: string;
  ctaLink?: string;
  productSlugs: string[];
  bundlePrice?: string;
  originalPrice?: string;
  savingsLabel?: string;
};

export type WhatsAppCtaSection = SectionBase & {
  type: "whatsapp-cta";
  heading?: string;
  subheading?: string;
  phone?: string;
  buttonLabel?: string;
  prefilledMessage?: string;
};

export type TrustBadgesSection = SectionBase & {
  type: "trust-badges";
  heading?: string;
  badges?: Array<{ icon: string; label: string; description?: string }>;
};

export type PaymentMethodsSection = SectionBase & {
  type: "payment-methods";
  heading?: string;
  methods?: Array<{ id: string; label: string; enabled: boolean }>;
};

// ─── Custom Section (free block canvas from shop editor) ─────────────────────

export type BlockAction =
  | { type: "navigate"; href: string }
  | { type: "open-cart" }
  | { type: "open-search" }
  | { type: "scroll-top" }
  | { type: "whatsapp"; number: string; message?: string }
  | { type: "none" };

export type BlockAnimation = "none" | "fadeIn" | "slideUp" | "slideLeft" | "slideRight" | "zoomIn" | "bounce" | "pulse";

export type BlockStyles = {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  color?: string;
  backgroundColor?: string;
  textAlign?: "left" | "center" | "right";
  letterSpacing?: string;
  lineHeight?: string;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  fontStyle?: "normal" | "italic";
  padding?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  paddingRight?: string;
  margin?: string;
  marginTop?: string;
  marginBottom?: string;
  width?: string;
  maxWidth?: string;
  height?: string;
  borderRadius?: string;
  border?: string;
  boxShadow?: string;
  opacity?: string | number;
  objectFit?: "cover" | "contain" | "fill";
  alignSelf?: string;
  cursor?: string;
  gap?: string;
  [key: string]: any;
};

export type TextBlock = { id: string; type: "text"; tag?: "h1"|"h2"|"h3"|"h4"|"p"|"span"|"label"; content?: string; animation?: BlockAnimation; styles?: BlockStyles };
export type ButtonBlock = { id: string; type: "button"; label?: string; action?: BlockAction; iconName?: string; iconPos?: "left" | "right"; animation?: BlockAnimation; styles?: BlockStyles };
export type IconBlock = { id: string; type: "icon"; name?: string; size?: number; color?: string; action?: BlockAction; animation?: BlockAnimation; styles?: BlockStyles };
export type ImageBlock = { id: string; type: "image"; src?: string; alt?: string; animation?: BlockAnimation; styles?: BlockStyles };
export type SpacerBlock = { id: string; type: "spacer"; height?: number; styles?: BlockStyles };
export type DividerBlock = { id: string; type: "divider"; color?: string; thickness?: number; marginY?: number; lineStyle?: "solid" | "dashed" | "dotted" };
export type BadgeBlock = { id: string; type: "badge"; text?: string; bgColor?: string; color?: string; size?: "sm" | "md" | "lg"; animation?: BlockAnimation; styles?: BlockStyles };

export type FormField = {
  id: string;
  label: string;
  placeholder?: string;
  fieldType: "text" | "email" | "phone" | "textarea" | "select" | "checkbox" | "file";
  required?: boolean;
  options?: string[];
};
export type FormBlock = {
  id: string;
  type: "form";
  fields: FormField[];
  submitLabel?: string;
  submitAction?: { type: "email"; to: string } | { type: "webhook"; url: string } | { type: "whatsapp"; number: string };
  successMessage?: string;
  animation?: BlockAnimation;
  styles?: BlockStyles;
};
export type RowBlock = {
  id: string;
  type: "row";
  cols: CustomBlock[][];
  colCount: 2 | 3 | 4;
  gap?: "none" | "sm" | "md" | "lg";
  verticalAlign?: "top" | "center" | "bottom";
  stackOnMobile?: boolean;
};
export type VideoBlock = {
  id: string;
  type: "video";
  url?: string;
  caption?: string;
  ratio?: "16:9" | "9:16" | "4:3" | "1:1";
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  animation?: BlockAnimation;
  styles?: BlockStyles;
};
export type AccordionItem = { id: string; title: string; body: string };
export type AccordionBlock = {
  id: string;
  type: "accordion";
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultOpen?: string;
  animation?: BlockAnimation;
  styles?: BlockStyles;
};
export type CountdownBlock = {
  id: string;
  type: "countdown";
  targetDate: string;
  label?: string;
  expiredText?: string;
  showLabels?: boolean;
  animation?: BlockAnimation;
  styles?: BlockStyles;
};
export type SlideshowSlide = { src?: string; alt?: string; caption?: string; link?: string };
export type SlideshowBlock = {
  id: string;
  type: "slideshow";
  slides: SlideshowSlide[];
  autoplay?: boolean;
  autoplayDelay?: number;
  showDots?: boolean;
  showArrows?: boolean;
  ratio?: "16:9" | "4:3" | "1:1" | "3:2";
  animation?: BlockAnimation;
  styles?: BlockStyles;
};
export type ProductEmbedBlock = {
  id: string;
  type: "product-embed";
  productSlug?: string;
  showDescription?: boolean;
  variant?: ProductCardVariant;
  animation?: BlockAnimation;
  styles?: BlockStyles;
};
export type ListBlock = {
  id: string;
  type: "list";
  items: string[];
  ordered?: boolean;
  iconName?: string;
  animation?: BlockAnimation;
  styles?: BlockStyles;
};
export type CardBlock = {
  id: string;
  type: "card";
  title?: string;
  body?: string;
  image?: string;
  imageAlt?: string;
  ctaLabel?: string;
  ctaAction?: BlockAction;
  bordered?: boolean;
  shadow?: "none" | "sm" | "md" | "lg";
  radius?: "none" | "sm" | "md" | "lg";
  imageHeight?: number;
  animation?: BlockAnimation;
  styles?: BlockStyles;
};
export type GroupBlock = { id: string; type: "group"; label?: string; children: CustomBlock[]; direction?: "column"|"row"|"row-wrap"; gap?: "none"|"sm"|"md"|"lg"; align?: "start"|"center"|"end"|"stretch"; animation?: BlockAnimation; styles?: BlockStyles };
export type LayoutBoxBlock = { id: string; type: "layout-box"; label?: string; children: CustomBlock[]; layout?: "flex"|"grid"; columns?: number; gap?: "none"|"sm"|"md"|"lg"; direction?: "column"|"row"|"row-wrap"; colTemplate?: string; animation?: BlockAnimation; styles?: BlockStyles };
export type CustomBlock =
  | TextBlock | ButtonBlock | IconBlock | ImageBlock | SpacerBlock | DividerBlock | FormBlock
  | RowBlock | VideoBlock | AccordionBlock | CountdownBlock | SlideshowBlock | ProductEmbedBlock
  | BadgeBlock | ListBlock | CardBlock | GroupBlock | LayoutBoxBlock
  | { id: string; type: string; [key: string]: any };

export type BlockType = CustomBlock["type"];

export function createDefaultBlock(type: BlockType): CustomBlock {
  const id = uid();
  switch (type) {
    case "text":      return { id, type, tag: "p", content: "Your text here" };
    case "button":    return { id, type, label: "Click me", action: { type: "none" } };
    case "icon":      return { id, type, name: "star", size: 32 };
    case "image":     return { id, type, src: "", alt: "", styles: { width: "100%", borderRadius: "8px" } };
    case "spacer":    return { id, type, height: 32 };
    case "divider":   return { id, type, color: "currentColor", thickness: 1, marginY: 8 };
    case "badge":     return { id, type, text: "New", bgColor: "#4f46e5", color: "#ffffff", size: "md" };
    case "list":      return { id, type, items: ["First item", "Second item", "Third item"], ordered: false };
    case "card":      return { id, type, title: "Card Title", body: "Add a description here.", bordered: true, shadow: "sm", radius: "md" };
    case "form":      return { id, type, fields: [{ id: uid(), label: "Name", fieldType: "text", required: true }], submitLabel: "Submit" };
    case "row":       return { id, type, cols: [[], []], colCount: 2, gap: "md", stackOnMobile: true };
    case "video":     return { id, type, url: "", ratio: "16:9", controls: true };
    case "accordion": return { id, type, items: [{ id: uid(), title: "Question?", body: "Answer goes here." }] };
    case "countdown": return { id, type, targetDate: new Date(Date.now() + 7 * 86400000).toISOString(), label: "Sale ends in", showLabels: true };
    case "slideshow": return { id, type, slides: [{ src: "", alt: "Slide 1" }], autoplay: true, autoplayDelay: 3000, showDots: true, showArrows: true, ratio: "16:9" };
    case "product-embed": return { id, type, productSlug: "", variant: "classic", showDescription: false };
    case "group": return { id, type, label: "Group", children: [], direction: "column", gap: "md", align: "start" };
    case "layout-box": return { id, type, label: "Layout Box", children: [], layout: "grid", columns: 2, gap: "md", align: "start" };
  }
  return { id, type } as CustomBlock;
}

export type CustomSection = SectionBase & {
  type: "custom";
  label?: string;
  blocks: CustomBlock[];
  gap?: "none" | "sm" | "md" | "lg";
  align?: "start" | "center" | "end" | "stretch";
  /** Block stack direction (default column) — matches the web renderer */
  direction?: "column" | "row" | "row-wrap";
  /** Responsive horizontal padding of the section (web renderer reads these) */
  paddingX?: "none" | "sm" | "md" | "lg";
  /** Responsive vertical padding of the section (web renderer reads these) */
  paddingY?: "none" | "sm" | "md" | "lg";
  elStyles?: Record<string, Record<string, any>>;
};

export type Section =
  | AnnouncementSection | HeroSection | FeaturedProductsSection | ImageTextSection | RichTextSection
  | GallerySection | CollectionListSection | NewsletterSection | CtaBannerSection | TextColumnsSection
  | TestimonialsSection | LogoBarSection | FaqSection | VideoSection | SpacerSection
  | RelatedProductsSection | SearchSection | ProductDetailSection | CheckoutFormSection | ContactFormSection
  | ShopGridSection | PricingPlansSection | CountdownSection | StatsSection | TeamSection | ColumnsSection
  | AuthLoginSection | AuthSignupSection | BuyerOrdersSection | BuyerReferralsSection
  | AboutSection | ContactSection
  | VideoHeroSection | SocialFeedSection | MapLocationSection | SizeGuideSection | PortfolioSection
  | ReviewsSection
  | LookbookSection | TimelineSection | BeforeAfterSection | BundleOfferSection
  | WhatsAppCtaSection | TrustBadgesSection | PaymentMethodsSection
  | CustomSection;

export type SectionType = Section["type"];

export const SECTION_LABELS: Record<SectionType, string> = {
  custom: "Custom section",
  announcement: "Announcement bar",
  hero: "Hero banner",
  columns: "Columns (free layout)",
  "featured-products": "Featured products",
  "image-text": "Image with text",
  "rich-text": "Rich text",
  gallery: "Gallery",
  "collection-list": "Collection list",
  newsletter: "Newsletter",
  "cta-banner": "CTA banner",
  "text-columns": "Text columns / Features",
  testimonials: "Testimonials",
  "logo-bar": "Logo bar",
  faq: "FAQ",
  video: "Video",
  spacer: "Spacer",
  "related-products": "Related products",
  search: "Search with filters",
  "product-detail": "Product detail (with gallery & cart)",
  "checkout-form": "Checkout form",
  "contact-form": "Contact form",
  "shop-grid": "Shop grid (products + filters)",
  "pricing-plans": "Pricing / Plans",
  countdown: "Countdown timer",
  stats: "Stats / Social proof",
  team: "Team members",
  "auth-login": "Login page",
  "auth-signup": "Sign up page",
  "buyer-orders": "Buyer order tracker",
  "buyer-referrals": "Buyer referrals dashboard",
  about: "About us",
  contact: "Contact info",
  "video-hero": "Video hero",
  "social-feed": "Social feed",
  "map-location": "Map & location",
  "size-guide": "Size guide",
  portfolio: "Portfolio",
  reviews: "Customer reviews",
  lookbook: "Lookbook",
  timeline: "Brand timeline",
  "before-after": "Before & after",
  "bundle-offer": "Bundle offer",
  "whatsapp-cta": "WhatsApp chat",
  "trust-badges": "Trust badges",
  "payment-methods": "Payment methods",
};

/** Variant options per section type. Empty means single variant. */
export const SECTION_VARIANTS: Partial<Record<SectionType, string[]>> = {
  hero: ["overlay", "split-right", "split-left", "stacked", "text-only", "fullscreen", "boxed-right", "boxed-left", "glass", "diagonal", "duo", "bold", "reveal", "carousel"],
  "featured-products": ["grid", "list", "carousel"],
  testimonials: ["cards", "quotes", "grid"],
  "cta-banner": ["centered", "split"],
  "image-text": ["side-by-side", "stacked", "offset"],
  "rich-text": ["paragraph", "quote", "card", "article"],
  columns: ["plain", "cards", "feature", "numbered", "image-side"],
  "text-columns": ["cards", "minimal", "icons"],
  "collection-list": ["grid", "scroller"],
  stats: ["badges", "minimal", "centered"],
  "pricing-plans": ["cards", "table"],
  countdown: ["banner", "box"],
  team: ["cards", "minimal"],
  gallery: ["grid", "masonry", "featured", "minimal"],
  "shop-grid": ["grid", "list", "compact", "editorial"],
  about: ["story", "split", "team", "magazine"],
  contact: ["simple", "split", "cards", "full"],
  "video-hero": ["overlay", "split", "minimal"],
  "social-feed": ["grid", "masonry", "scroller"],
  "map-location": ["simple", "split", "card"],
  "size-guide": ["table", "cards", "accordion"],
  portfolio: ["grid", "masonry", "editorial", "minimal"],
  reviews: ["grid", "list", "carousel", "masonry"],
  lookbook: ["grid", "editorial", "masonry", "scroller"],
  timeline: ["vertical", "horizontal", "minimal"],
  "before-after": ["slider", "side-by-side", "grid"],
  "bundle-offer": ["cards", "compact", "featured"],
  "whatsapp-cta": ["card", "banner", "minimal"],
  "trust-badges": ["row", "grid", "minimal"],
  "payment-methods": ["row", "grid"],
};

export const uid = () => Math.random().toString(36).slice(2, 10);

/* ------------- Navbar + Footer ------------- */

export type NavLinkAction = "navigate" | "whatsapp" | "scroll-top" | "open-cart" | "open-search";
export type NavLink = {
  label: string;
  href: LinkTarget;
  /** Render as a styled button instead of a text link */
  isButton?: boolean;
  /** Button visual style (only used when isButton = true) */
  btnStyle?: "solid" | "outline" | "ghost";
  /** Custom background colour override for button links */
  btnBg?: string;
  /** Custom text/icon colour override for button links */
  btnColor?: string;
  /** When true the button also appears in the mobile sidebar. Default true. */
  showInSidebar?: boolean;
  /** Optional icon name (Feather / Bootstrap icon) shown before the label */
  icon?: string;
  /** Special action this link triggers (default: navigate to href) */
  action?: NavLinkAction;
};
export type NavbarLogoMode = "text" | "logo" | "both";
export type SidebarAnimation = "slide" | "fade" | "spring" | "bounce" | "none";
export type SidebarListStyle = "plain" | "chevron" | "arrow" | "dot" | "numbered";
export type NavbarLayout = "logo-left" | "logo-center" | "logo-right";
export type NavbarStyle = "default" | "transparent" | "filled" | "minimal" | "bordered";
export type NavbarSearchStyle = "dropdown" | "expand" | "slide" | "overlay" | "drawer" | "bar-top";
export type NavbarConfig = {
  brand: string;
  logoImage?: string;
  logoMode?: NavbarLogoMode;
  logoHeight?: number;
  links: NavLink[];
  showSearch: boolean;
  showCart: boolean;
  showThemeToggle: boolean;
  sticky: boolean;
  sidebarAnimation?: SidebarAnimation;
  listStyle?: SidebarListStyle;
  /** Overall navbar layout â€” controls logo position */
  layout?: NavbarLayout;
  /** Show live cart item count badge on the cart icon */
  showCartCount?: boolean;
  /** Background colour of the cart count badge */
  cartBadgeColor?: string;
  /** Visual style variant */
  navbarStyle?: NavbarStyle;
  /** Custom background colour (overrides navbarStyle bg) */
  navbarBg?: string;
  /** Show a profile/account icon that links to the buyer login page */
  showProfileIcon?: boolean;
  /** Path to the buyer login page (default "/login") */
  profileLink?: string;
  /** How the search UI opens when the magnifying glass is tapped */
  searchStyle?: NavbarSearchStyle;
  /** Ionicon name for the cart button (default: "bag-outline") */
  cartIcon?: string;
  /** Ionicon name for the search button (default: "search-outline") */
  searchIcon?: string;
  /** Ionicon name for the hamburger menu button (default: "menu-outline") */
  menuIcon?: string;
  /** Ionicon name for the profile button (default: "person-circle-outline") */
  profileIcon?: string;
  /** Custom font for the brand name text (e.g. Playfair Display for a luxury look) */
  brandFont?: FontHeading;
  /** Custom font size for the brand name (default: 22) */
  brandFontSize?: number;
  /** Standalone CTA buttons shown in navbar and optionally sidebar — NOT navlinks. Up to 3. */
  ctaButtons?: Array<{
    label: string;
    href: string;
    style: "solid" | "outline" | "ghost";
    btnBg?: string;
    btnColor?: string;
    /**
     * When true: button appears in mobile SIDEBAR only (not in the navbar itself on mobile).
     * On tablet/desktop (>=768px) it always shows in the navbar regardless of this flag.
     * Default: false (shows in navbar, NOT in sidebar).
     */
    showInSidebar?: boolean;
    /** Where to place the button in the navbar. "left" = before the logo; "right" = after icons (default). */
    navPosition?: "left" | "right";
  }>;
};
export type FooterColumn = { title: string; links: NavLink[] };
export type FooterSocialPlatform = "instagram" | "twitter" | "facebook" | "tiktok" | "youtube" | "whatsapp" | "linkedin" | "pinterest" | "snapchat";
export type FooterConfig = {
  brand: string;
  tagline: string;
  columns: FooterColumn[];
  showSocial: boolean;
  /** Social media links shown in the footer */
  socialLinks?: Array<{ platform: FooterSocialPlatform; url: string }>;
  /** Text alignment across the entire footer */
  textAlign?: "left" | "center" | "right";
  /** Optional logo image URI — shows instead of/alongside brand text */
  logoImage?: string;
  /** Logo display mode: text-only, logo-only, or both side by side */
  logoMode?: "text" | "logo" | "both";
  /** Height of the logo in px (default 32) */
  logoHeight?: number;
  /** Optional CTA buttons in the footer (e.g. "Shop Now", "Contact Us") */
  ctaButtons?: Array<{
    label: string;
    href: string;
    style: "solid" | "outline" | "ghost";
    btnBg?: string;
    btnColor?: string;
  }>;
};

export const defaultNavbar: NavbarConfig = {
  brand: "ATELIER",
  logoMode: "text",
  logoHeight: 28,
  links: [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  showSearch: true,
  showCart: true,
  showThemeToggle: true,
  sticky: true,
};

export const defaultFooter: FooterConfig = {
  brand: "Atelier",
  tagline: "Considered objects, made to last.",
  columns: [
    { title: "Shop", links: [{ label: "All products", href: "/shop" }, { label: "New arrivals", href: "/shop" }] },
    { title: "Company", links: [{ label: "About", href: "/about" }, { label: "Journal", href: "/" }] },
    { title: "Help", links: [{ label: "Contact", href: "/" }, { label: "Shipping", href: "/" }] },
  ],
  showSocial: true,
};

/* ------------- Payment Config ------------- */

export type PaymentProvider = "none" | "flutterwave" | "paystack" | "both";
export type PaymentConfig = {
  provider: PaymentProvider;
  currency?: string;
};
export const defaultPaymentConfig: PaymentConfig = { provider: "none", currency: "USD" };

/* ------------- Pages ------------- */

export type Page = {
  id: string;
  name: string;
  slug: string;
  sections: Section[];
  hideNavbar?: boolean;
  hideFooter?: boolean;
  /** @deprecated kept for backward-compat only â€” use getPageUrl(slug) instead */
  path?: string;
};

/**
 * Returns the live URL for a page.
 * Slugs are now stored as the full URL path (e.g. "/about", "/product/:slug").
 * This function normalises legacy bare-word slugs on the way out.
 */
export function getPageUrl(slug: string): string {
  if (!slug || slug === "/") return "/";
  if (slug.startsWith("/")) return slug;
  // Legacy bare-word slugs â†’ canonical paths
  const legacy: Record<string, string> = {
    shop: "/shop", product: "/product/:slug", checkout: "/checkout",
    about: "/about", search: "/search", contact: "/contact",
  };
  return legacy[slug] ?? `/${slug}`;
}

export const defaultHomeSections = (): Section[] => [
  { id: uid(), type: "announcement", text: "Free shipping on orders over $150 â€” worldwide", link: "/shop" },
  {
    id: uid(), type: "hero", eyebrow: "New Â· Autumn collection",
    heading: "Considered objects for everyday life",
    body: "A small, slow shop of pieces designed in our studio and made by people we know.",
    image: HERO_IMAGE, ctaLabel: "Shop the collection", ctaLink: "/shop", align: "bottom-left", height: "lg",
    variant: "overlay",
  },
  {
    id: uid(), type: "collection-list", heading: "Shop by category",
    items: [
      { label: "Home", image: products[0].image, link: "/shop" },
      { label: "Accessories", image: products[1].image, link: "/shop" },
      { label: "Apparel", image: products[3].image, link: "/shop" },
      { label: "Tech", image: products[5].image, link: "/shop" },
    ],
  },
  {
    id: uid(), type: "featured-products", heading: "Featured products",
    subheading: "A few favorites from the studio",
    productSlugs: products.slice(0, 4).map((p) => p.slug), columns: 4, variant: "grid",
  },
  {
    id: uid(), type: "image-text", heading: "Designed to be lived with",
    body: "Every piece is something we wanted ourselves and couldn't find done well.",
    image: products[1].image, imageSide: "right", ctaLabel: "Our story", ctaLink: "/about",
  },
  { id: uid(), type: "newsletter", heading: "Join the list", body: "New arrivals, studio notes, and the occasional discount.", buttonLabel: "Subscribe" },
];

export const defaultShopSections = (): Section[] => [
  {
    id: uid(), type: "shop-grid",
    heading: "All Products",
    showFilters: true,
    columns: 2,
  },
];

export const defaultProductSections = (): Section[] => [
  {
    id: uid(), type: "product-detail",
    productSlug: products[0].slug,
    extraImages: [],
    padding: "md",
  },
  {
    id: uid(), type: "related-products",
    heading: "You may also like",
    sourceSlug: products[0].slug,
    limit: 4,
    useInventory: true,
    padding: "md",
  },
];

export const defaultCheckoutSections = (): Section[] => [
  { id: uid(), type: "checkout-form", heading: "Checkout" },
];

export const defaultAboutSections = (): Section[] => [
  {
    id: uid(), type: "about", variant: "story",
    heading: "Our story",
    body: "We started with a single idea: make things worth keeping. Every piece is designed in-house and crafted by makers we trust. From the materials we source to the people who shape them â€” quality and care run through everything we do.",
    image: products[1].image,
    ctaLabel: "Shop now", ctaLink: "/shop",
  } as Section,
  {
    id: uid(), type: "text-columns", heading: "Why shop with us",
    columns: [
      { title: "Quality first", body: "Every item is hand-picked and quality checked before it reaches you." },
      { title: "Fast delivery", body: "We ship within 24 hours to all states across Nigeria." },
      { title: "Easy returns", body: "Not happy? We'll make it right â€” no questions asked." },
    ],
  } as Section,
];

export const defaultContactSections = (): Section[] => [
  {
    id: uid(), type: "contact", variant: "split",
    heading: "Get in touch",
    subheading: "We'd love to hear from you. Reach us any time.",
    email: "hello@yourbrand.com",
    phone: "+234 800 000 0000",
    address: "Lagos, Nigeria",
    hours: "Mon â€“ Fri, 9am â€“ 6pm",
    showForm: true,
  } as Section,
];

export const defaultPages = (): Page[] => [
  { id: uid(), name: "Home", slug: "/", sections: defaultHomeSections() },
  { id: uid(), name: "Shop", slug: "/shop", sections: defaultShopSections() },
  { id: uid(), name: "Product", slug: "/product/:slug", sections: defaultProductSections() },
  { id: uid(), name: "Checkout", slug: "/checkout", sections: defaultCheckoutSections() },
  { id: uid(), name: "About", slug: "/about", sections: defaultAboutSections() },
  { id: uid(), name: "Contact", slug: "/contact", sections: defaultContactSections() },
];

export function createDefaultSection(type: SectionType): Section {
  const id = uid();
  switch (type) {
    case "announcement": return { id, type, text: "Free shipping on orders over $150", link: "/shop" };
    case "hero": return {
      id, type, heading: "New heading", body: "Short supporting copy goes here.",
      image: HERO_IMAGE, ctaLabel: "Shop now", ctaLink: "/shop", align: "bottom-left", height: "md", variant: "overlay",
      slides: [
        { heading: "New heading", body: "Short supporting copy goes here.", eyebrow: "New · Collection", image: HERO_IMAGE, ctaLabel: "Shop now", ctaLink: "/shop" },
        { heading: "Second slide", body: "A different message for the next banner.", eyebrow: "Coming soon", image: HERO_IMAGE, ctaLabel: "Explore", ctaLink: "/shop" },
      ],
    };
    case "featured-products": return { id, type, heading: "Featured products", productSlugs: products.slice(0, 3).map((p) => p.slug), columns: 3, variant: "grid" };
    case "image-text": return { id, type, heading: "Tell your story", body: "Pair text with a great image.", image: products[0].image, imageSide: "right", ctaLabel: "Learn more", ctaLink: "/about", variant: "side-by-side" };
    case "rich-text": return { id, type, heading: "About us", body: "Write whatever you'd like here.", align: "center" };
    case "gallery": return { id, type, heading: "Gallery", images: [products[0].image, products[1].image, products[2].image], columns: 3 };
    case "collection-list": return { id, type, heading: "Shop by category", items: [
      { label: "Home", image: products[0].image, link: "/shop?category=Home" },
      { label: "Accessories", image: products[1].image, link: "/shop?category=Accessories" },
      { label: "Apparel", image: products[3].image, link: "/shop?category=Apparel" },
    ] };
    case "newsletter": return { id, type, heading: "Stay in touch", body: "Subscribe for updates.", buttonLabel: "Subscribe" };
    case "cta-banner": return { id, type, heading: "Ready to get started?", body: "Join thousands of happy customers.", ctaLabel: "Shop now", ctaLink: "/shop", background: "primary", variant: "centered" };
    case "text-columns": return { id, type, heading: "Why choose us", columns: [
      { title: "Made to last", body: "Materials chosen to improve with age." },
      { title: "Fair pricing", body: "Direct from our workshop to your door." },
      { title: "Free shipping", body: "On all orders over $150." },
    ] };
    case "testimonials": return { id, type, heading: "What customers say", variant: "cards", items: [
      { quote: "Beautifully made and arrived quickly. I'm in love.", author: "Sara K.", role: "Verified buyer" },
      { quote: "The quality is unreal for the price.", author: "Marcus T.", role: "Verified buyer" },
    ] };
    case "logo-bar": return { id, type, heading: "As featured in", logos: [
      { src: products[0].image, alt: "Press 1" }, { src: products[1].image, alt: "Press 2" },
      { src: products[2].image, alt: "Press 3" }, { src: products[3].image, alt: "Press 4" },
    ] };
    case "faq": return { id, type, heading: "Frequently asked", items: [
      { question: "How long does shipping take?", answer: "Most orders ship within 2 business days." },
      { question: "What is your return policy?", answer: "Free returns within 30 days." },
    ] };
    case "video": return { id, type, heading: "Watch", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" };
    case "spacer": return { id, type, size: "md" };
    case "related-products": return { id, type, heading: "You may also like", sourceSlug: products[0].slug, limit: 4 };
    case "search": return { id, type, heading: "Search products", placeholder: "Searchâ€¦", showFilters: true };
    case "product-detail": return { id, type, productSlug: products[0].slug, extraImages: [] };
    case "checkout-form": return { id, type, heading: "Checkout" };
    case "contact-form": return { id, type, heading: "Get in touch", subheading: "Fill in the form below and we'll get back to you shortly." };
    case "shop-grid": return { id, type, heading: "All products", showFilters: true, columns: 3 };
    case "pricing-plans": return {
      id, type, heading: "Simple, transparent pricing", subheading: "Choose the plan that works for you", variant: "cards",
      plans: [
        { name: "Starter", price: "Free", description: "For individuals just getting started", features: ["5 products", "Basic analytics", "WhatsApp support"], ctaLabel: "Get started", ctaLink: "/shop" },
        { name: "Growth", price: "â‚¦5,000", period: "/month", description: "For growing businesses", features: ["Unlimited products", "Advanced analytics", "Priority support", "Custom domain"], ctaLabel: "Start free trial", ctaLink: "/shop", highlighted: true },
        { name: "Enterprise", price: "â‚¦15,000", period: "/month", description: "For large teams", features: ["Everything in Growth", "API access", "Dedicated account manager", "SLA guarantee"], ctaLabel: "Contact us", ctaLink: "/shop" },
      ],
    };
    case "countdown": return { id, type, heading: "Sale ends soon!", body: "Don't miss our biggest sale of the year.", targetDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), ctaLabel: "Shop now", ctaLink: "/shop", variant: "banner" };
    case "stats": return {
      id, type, heading: "Trusted by thousands", variant: "centered",
      items: [
        { value: "50,000+", label: "Happy customers" },
        { value: "4.9â˜…", label: "Average rating" },
        { value: "â‚¦2B+", label: "Sales processed" },
        { value: "99.9%", label: "Uptime" },
      ],
    };
    case "team": return {
      id, type, heading: "Meet the team", variant: "cards",
      members: [
        { name: "Amara Okafor", role: "Founder & CEO", bio: "10+ years in e-commerce and retail." },
        { name: "Tunde Adeyemi", role: "Head of Operations", bio: "Logistics and fulfilment expert." },
        { name: "Chisom Eze", role: "Customer Success", bio: "Here to help you grow your business." },
      ],
    };
    case "columns": return {
      id, type, heading: "", count: 2,
      gap: "md",
      verticalAlign: "top",
      imgAspectRatio: 1,
      items: [
        { heading: "Column one", body: "Add your text here.", imageUri: "", ctaLabel: "", ctaHref: "" },
        { heading: "Column two", body: "Add your text here.", imageUri: "", ctaLabel: "", ctaHref: "" },
      ],
    };
    case "auth-login": return {
      id, type,
      heading: "Welcome back",
      subheading: "Sign in to track your orders and referrals.",
      imageSide: "right",
      signupLink: "/signup",
    };
    case "auth-signup": return {
      id, type,
      heading: "Create your account",
      subheading: "Join thousands of happy customers.",
      imageSide: "right",
      loginLink: "/login",
    };
    case "buyer-orders": return {
      id, type,
      heading: "My Orders",
      subheading: "Track and manage all your purchases.",
    };
    case "buyer-referrals": return {
      id, type,
      heading: "Refer & Earn",
      subheading: "Share your code and earn rewards for every friend who orders.",
      rewardLabel: "â‚¦500",
    };
    case "about": return {
      id, type, variant: "story",
      heading: "Our story",
      body: "We started with a single idea: make things worth keeping. Every piece is designed in-house and crafted by makers we trust.",
      image: products[1].image,
      ctaLabel: "Shop now", ctaLink: "/shop",
    };
    case "contact": return {
      id, type, variant: "split",
      heading: "Get in touch",
      subheading: "We'd love to hear from you. Reach us any time.",
      email: "hello@yourbrand.com",
      phone: "+234 800 000 0000",
      address: "123 Main Street, Lagos, Nigeria",
      hours: "Mon â€“ Fri, 9am â€“ 6pm",
      showForm: true,
    };
    case "custom": return { id, type, label: "Custom section", blocks: [], gap: "md", align: "start" };
    case "video-hero": return {
      id, type, heading: "Bold Headline Here", subheading: "Your brand story in one scene.",
      ctaLabel: "Shop now", ctaLink: "/shop", overlayOpacity: 0.45, height: "lg", align: "center", variant: "overlay",
    };
    case "social-feed": return {
      id, type, heading: "Follow us", handle: "@yourstore",
      posts: [], columns: 3, showHandle: true, variant: "grid",
    };
    case "map-location": return {
      id, type, heading: "Find us", address: "123 Main Street, Lagos, Nigeria",
      phone: "+234 800 000 0000", email: "hello@yourstore.com",
      hours: "Mon – Sat: 9 AM – 6 PM", variant: "simple",
    };
    case "size-guide": return {
      id, type, heading: "Size guide", unit: "cm",
      columns: ["Size", "Chest (cm)", "Waist (cm)", "Hip (cm)"],
      rows: [
        { size: "XS", "Chest (cm)": "80–84", "Waist (cm)": "60–64", "Hip (cm)": "86–90" },
        { size: "S",  "Chest (cm)": "84–88", "Waist (cm)": "64–68", "Hip (cm)": "90–94" },
        { size: "M",  "Chest (cm)": "88–92", "Waist (cm)": "68–72", "Hip (cm)": "94–98" },
        { size: "L",  "Chest (cm)": "92–96", "Waist (cm)": "72–76", "Hip (cm)": "98–102" },
        { size: "XL", "Chest (cm)": "96–100","Waist (cm)": "76–80", "Hip (cm)": "102–106" },
      ],
      note: "Measurements are in centimetres. For best fit, measure over your natural shape.", variant: "table",
    };
    case "portfolio": return {
      id, type, heading: "Our work", columns: 3,
      items: [
        { title: "Project one", category: "Branding", image: "" },
        { title: "Project two", category: "Web design", image: "" },
        { title: "Project three", category: "Photography", image: "" },
      ], variant: "grid",
    };
    case "lookbook": return {
      id, type, heading: "Shop the look", subheading: "Curated styles and outfits",
      items: [
        { image: "", title: "The Classic Look", description: "Timeless elegance for any occasion" },
        { image: "", title: "The Bold Statement", description: "Stand out with confidence" },
        { image: "", title: "The Weekend Edit", description: "Relaxed and effortlessly cool" },
      ], variant: "grid",
    };
    case "timeline": return {
      id, type, heading: "Our story", subheading: "How we got here",
      milestones: [
        { year: "2018", title: "Founded", description: "Started with a small workshop and a big dream" },
        { year: "2020", title: "First 1,000 customers", description: "Word spread and the community grew" },
        { year: "2023", title: "Went national", description: "Now delivering across all 36 states" },
      ], variant: "vertical",
    };
    case "before-after": return {
      id, type, heading: "See the difference", subheading: "Real results from real customers",
      pairs: [
        { beforeImage: "", afterImage: "", label: "Skin transformation", description: "6 weeks using our products" },
        { beforeImage: "", afterImage: "", label: "Home makeover", description: "Before and after the renovation" },
      ], variant: "side-by-side",
    };
    case "bundle-offer": return {
      id, type, heading: "Bundle & save", subheading: "Get more for less — curated sets",
      bundleLabel: "Complete set", ctaLabel: "Shop bundle", ctaLink: "/shop",
      productSlugs: [], bundlePrice: "₦12,000", originalPrice: "₦18,000",
      savingsLabel: "Save 33%", variant: "cards",
    };
    case "reviews": return {
      id, type, heading: "What our customers say", useRealReviews: false, minRating: 4,
      testimonials: [
        { name: "Adaeze N.", rating: 5, text: "Amazing quality! Exactly as described. Will definitely order again." },
        { name: "Tunde B.", rating: 5, text: "Fast delivery and beautiful packaging. My wife loves it!" },
        { name: "Chisom O.", rating: 4, text: "Very good product. Fits perfectly. Highly recommend." },
        { name: "Funmi A.", rating: 5, text: "Outstanding quality and superb customer service." },
      ], variant: "grid",
    };
    case "whatsapp-cta": return {
      id, type, heading: "Chat with us on WhatsApp",
      subheading: "We reply within minutes — ask us anything!",
      phone: "+2348000000000",
      buttonLabel: "Chat on WhatsApp",
      prefilledMessage: "Hi! I'd like to know more about your products.",
      variant: "card",
    };
    case "trust-badges": return {
      id, type, heading: "",
      badges: [
        { icon: "shield", label: "Secure payment", description: "Your payment is 100% protected" },
        { icon: "truck", label: "Fast delivery", description: "Orders shipped within 24 hours" },
        { icon: "refresh-ccw", label: "Easy returns", description: "7-day hassle-free return policy" },
        { icon: "award", label: "100% authentic", description: "All products are genuine and quality-checked" },
      ], variant: "row",
    };
    case "payment-methods": return {
      id, type, heading: "We accept",
      methods: [
        { id: "paystack", label: "Paystack", enabled: true },
        { id: "flutterwave", label: "Flutterwave", enabled: true },
        { id: "bank-transfer", label: "Bank Transfer", enabled: true },
        { id: "ussd", label: "USSD", enabled: true },
        { id: "opay", label: "OPay", enabled: false },
        { id: "palmpay", label: "PalmPay", enabled: false },
      ], variant: "row",
    };
  }
}

/* ------------- Templates ------------- */

export type ReferralSettings = {
  /** Whether the buyer referral program is active on this store */
  enabled: boolean;
  /** Human-readable reward description shown to buyers, e.g. "â‚¦500 off your next order" */
  rewardLabel?: string;
};

export type Template = {
  id: string;
  /** Backend template row id (set once the store is published). */
  serverId?: string;
  name: string;
  thumbnail?: string;
  pages: Page[];
  navbar: NavbarConfig;
  footer: FooterConfig;
  theme: Theme;
  paymentConfig?: PaymentConfig;
  designTokens?: DesignTokens;
  /** Store-level referral program settings */
  referrals?: ReferralSettings;
  /** Kiosk: publish state */
  launched?: boolean;
  launchUrl?: string;
  whatsappLink?: string;
};

/** Blank canvas â€” home page has zero sections, letting the vendor build from scratch */
export const createEmptyTemplate = (name: string): Template => ({
  id: uid(), name,
  pages: [
    { id: uid(), name: "Home", slug: "/", sections: [] },
    { id: uid(), name: "Shop", slug: "/shop", sections: defaultShopSections() },
    { id: uid(), name: "Product", slug: "/product/:slug", sections: defaultProductSections() },
    { id: uid(), name: "Checkout", slug: "/checkout", sections: defaultCheckoutSections() },
  ],
  navbar: { ...defaultNavbar, brand: name },
  footer: { brand: name, tagline: "", columns: [], showSocial: false },
  theme: "light",
  paymentConfig: { ...defaultPaymentConfig },
  designTokens: { ...defaultDesignTokens },
});

export const createBlankTemplate = (name = "Untitled template"): Template => ({
  id: uid(), name,
  thumbnail: ATELIER_THUMB,
  pages: defaultPages(),
  navbar: { ...defaultNavbar },
  footer: { ...defaultFooter, columns: defaultFooter.columns.map((c) => ({ ...c, links: [...c.links] })) },
  theme: "light",
  paymentConfig: { ...defaultPaymentConfig },
  designTokens: { ...defaultDesignTokens },
});

export const ATELIER_THUMB =`data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 200'><rect width='320' height='200' fill='%23f8f6f2'/><rect y='0' width='320' height='88' fill='%232c2c2c'/><text x='160' y='40' font-size='18' fill='white' text-anchor='middle' font-family='Georgia,serif'>ATELIER</text><text x='160' y='60' font-size='7' fill='%23aaa' text-anchor='middle' font-family='sans-serif'>Considered objects for everyday life</text><rect x='16' y='100' width='86' height='64' rx='3' fill='%23e5e1d8'/><rect x='117' y='100' width='86' height='64' rx='3' fill='%23e5e1d8'/><rect x='218' y='100' width='86' height='64' rx='3' fill='%23e5e1d8'/><rect x='16' y='170' width='55' height='4' rx='2' fill='%23ccc'/><rect x='117' y='170' width='55' height='4' rx='2' fill='%23ccc'/><rect x='218' y='170' width='55' height='4' rx='2' fill='%23ccc'/></svg>`;

/* ------------- Template Presets registry ------------- */

export type PresetKey = "blank" | "atelier";

export type TemplatePreset = {
  key: PresetKey;
  label: string;
  description: string;
  create: (name: string) => Template;
  thumbnail: string;
};

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  { key: "blank",   label: "Blank canvas",  description: "Start from scratch â€” empty home page", create: createEmptyTemplate, thumbnail: ATELIER_THUMB },
  { key: "atelier", label: "Atelier",        description: "Classic editorial fashion store",       create: createBlankTemplate, thumbnail: ATELIER_THUMB },
];

/* ------------- Persistence (types only; provider in context.tsx) ------------- */

/** A vendor-saved custom section stored in the shared library (across templates). */
export type SavedSection = {
  id: string;
  name: string;
  section: CustomSection;
  updatedAt?: string;
};

export type Persisted = {
  templates: Template[];
  activeTemplateId: string;
  theme: Theme;
  /** Shared library of vendor-saved custom sections (available on every template). */
  savedSections?: SavedSection[];
  _mv?: number;
};

export const STOREFRONT_STORAGE_KEY = "kiosk.storefront.v3";
export const CURRENT_MV = 10;

export function makeInitial(): Persisted {
  const t1 = createBlankTemplate("Atelier");
  return { templates: [t1], activeTemplateId: t1.id, theme: "light", savedSections: [], _mv: CURRENT_MV };
}

export function migratePersistedState(obj: Persisted): Persisted {
  let templates = obj.templates;
  const mv = obj._mv ?? 0;

  // Remove all preset templates that were added in older versions — only keep vendor-created ones
  const LEGACY_PRESETS = ["Bloom Market", "Maison", "Luma", "Nobis", "Verde", "Studio", "Strike", "Folio", "Revue"];
  templates = templates.filter((t) => !LEGACY_PRESETS.includes(t.name));
  // Ensure at least one template exists
  if (templates.length === 0) {
    templates = [createBlankTemplate("Atelier")];
  }
  if (mv < 3) {
    templates = templates.map((t: Template) => ({
      ...t,
      designTokens: t.designTokens ?? { ...defaultDesignTokens },
      pages: t.pages.map((p) => {
        const { system: _s, path: _p, ...rest } = p as Page & { system?: unknown; path?: unknown };
        void _s;
        void _p;
        return rest as Page;
      }),
    }));
  }
  if (mv < 4) {
    const toPath = (slug: string): string => {
      if (!slug || slug === "/") return "/";
      if (slug.startsWith("/")) return slug;
      const known: Record<string, string> = {
        shop: "/shop", product: "/product/:slug", checkout: "/checkout",
        about: "/about", search: "/search", contact: "/contact",
      };
      return known[slug] ?? `/${slug}`;
    };
    templates = templates.map((t: Template) => ({
      ...t,
      pages: t.pages.map((p) => ({ ...p, slug: toPath(p.slug) })),
    }));
  }
  if (mv < 6) {
    templates = templates.map((t: Template) => ({
      ...t,
      pages: t.pages.map((p) => ({
        ...p,
        slug: p.slug.startsWith("/p/") ? p.slug.slice(2) : p.slug,
      })),
    }));
  }
  if (mv < 7) {
    // Populate empty sub-pages with default sections for any template missing them
    templates = templates.map((t: Template) => ({
      ...t,
      pages: t.pages.map((p) => {
        if (p.sections.length > 0) return p;
        if (p.slug === "/shop") return { ...p, sections: defaultShopSections() };
        if (p.slug === "/product/:slug") return { ...p, sections: defaultProductSections() };
        if (p.slug === "/checkout") return { ...p, sections: defaultCheckoutSections() };
        return p;
      }),
    }));
  }
  if (mv < 8) {
    // Populate empty About and Contact pages with content + ensure Contact nav link
    templates = templates.map((t: Template) => ({
      ...t,
      navbar: t.navbar.links.some((l) => l.href === "/contact")
        ? t.navbar
        : { ...t.navbar, links: [...t.navbar.links, { label: "Contact", href: "/contact" }] },
      pages: t.pages.map((p) => {
        if (p.sections.length > 0) return p;
        if (p.slug === "/about") return { ...p, sections: defaultAboutSections() };
        if (p.slug === "/contact") return { ...p, sections: defaultContactSections() };
        return p;
      }),
    }));
  }
  if (mv < 9) {
    // Ensure all templates have all 6 core pages â€” add any missing ones
    const REQUIRED_PAGES: Array<{ slug: string; name: string; make: () => Section[] }> = [
      { slug: "/shop",           name: "Shop",     make: defaultShopSections },
      { slug: "/product/:slug",  name: "Product",  make: defaultProductSections },
      { slug: "/checkout",       name: "Checkout", make: defaultCheckoutSections },
      { slug: "/about",          name: "About",    make: defaultAboutSections },
      { slug: "/contact",        name: "Contact",  make: defaultContactSections },
    ];
    templates = templates.map((t: Template) => {
      let pages = t.pages;
      let navbar = t.navbar;
      for (const req of REQUIRED_PAGES) {
        if (!pages.some((p) => p.slug === req.slug)) {
          pages = [...pages, { id: uid(), name: req.name, slug: req.slug, sections: req.make() }];
          // Add nav link only for About/Contact (Shop already in nav, Product/Checkout are hidden dynamic pages)
          if ((req.slug === "/about" || req.slug === "/contact") && !navbar.links.some((l) => l.href === req.slug)) {
            navbar = { ...navbar, links: [...navbar.links, { label: req.name, href: req.slug }] };
          }
        }
      }
      return { ...t, pages, navbar };
    });
  }
  if (mv < 10) {
    // Re-ensure About and Contact pages exist for users who had mv=9 before this migration
    templates = templates.map((t: Template) => {
      let pages = t.pages;
      let navbar = t.navbar;
      if (!pages.some((p) => p.slug === "/about")) {
        pages = [...pages, { id: uid(), name: "About", slug: "/about", sections: defaultAboutSections() }];
        if (!navbar.links.some((l) => l.href === "/about")) {
          navbar = { ...navbar, links: [...navbar.links, { label: "About", href: "/about" }] };
        }
      }
      if (!pages.some((p) => p.slug === "/contact")) {
        pages = [...pages, { id: uid(), name: "Contact", slug: "/contact", sections: defaultContactSections() }];
        if (!navbar.links.some((l) => l.href === "/contact")) {
          navbar = { ...navbar, links: [...navbar.links, { label: "Contact", href: "/contact" }] };
        }
      }
      return { ...t, pages, navbar };
    });
  }
  templates = templates.map((t: Template) => {
    if (!t.thumbnail) return { ...t, thumbnail: ATELIER_THUMB };
    return t;
  });
  return { ...obj, templates, savedSections: obj.savedSections ?? [], _mv: CURRENT_MV };
}
