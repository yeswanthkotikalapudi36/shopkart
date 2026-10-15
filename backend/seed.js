require("dotenv").config();
const { connectDB, disconnectDB } = require("./utils/db");
const Product = require("./models/product.model");

const sampleProducts = [
  {
    name: "Mechanical Keyboard RGB",
    description: "Premium tenkeyless mechanical gaming keyboard with hot-swappable tactile switches, per-key RGB backlighting, and aluminum frame.",
    price: 3499,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=800&q=80",
    stock: 15,
  },
  {
    name: "Noise-Cancelling Wireless Headphones",
    description: "Over-ear Bluetooth headphones with hybrid active noise cancellation, 40-hour battery life, and crystal-clear voice microphones.",
    price: 4999,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
    stock: 22,
  },
  {
    name: "Ergonomic Vertical Mouse",
    description: "Wireless rechargeable ergonomic mouse designed for neutral hand posture, reducing forearm strain during long work hours.",
    price: 1899,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80",
    stock: 30,
  },
  {
    name: "Ultra-HD 4K Webcam",
    description: "Professional streaming webcam with dual stereo noise-reducing microphones, HDR auto-light correction, and privacy shutter.",
    price: 3999,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=800&q=80",
    stock: 8,
  },
  {
    name: "Classic Denim Jacket",
    description: "Timeless trucker-style denim jacket crafted from 100% durable cotton with brass hardware and deep utility pockets.",
    price: 2499,
    category: "Fashion",
    image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=800&q=80",
    stock: 18,
  },
  {
    name: "Minimalist Leather Sneaker",
    description: "Low-profile sneakers made with full-grain Italian leather, cushioned memory foam insoles, and durable vulcanized rubber soles.",
    price: 3299,
    category: "Fashion",
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80",
    stock: 12,
  },
  {
    name: "Canvas Travel Backpack",
    description: "Water-resistant vintage canvas backpack with padded laptop sleeve for up to 16-inch laptops, leather accents, and brass buckles.",
    price: 2199,
    category: "Fashion",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
    stock: 25,
  },
  {
    name: "Designing Data-Intensive Applications",
    description: "The definitive guide to data system architecture, distributed consistency, replication, partitioning, and batch/stream processing.",
    price: 1499,
    category: "Books",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
    stock: 40,
  },
  {
    name: "Clean Code Handbook",
    description: "A handbook of agile software craftsmanship teaching principles, patterns, and practical guidelines for writing readable code.",
    price: 1199,
    category: "Books",
    image: "https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&w=800&q=80",
    stock: 35,
  },
  {
    name: "Ceramic Pour-Over Coffee Dripper",
    description: "Artisan-crafted ceramic pour-over cone with spiral interior ribs for optimal extraction and rich, clean artisanal coffee brews.",
    price: 1299,
    category: "Home",
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80",
    stock: 20,
  },
  {
    name: "Smart Ambient Desk Lamp",
    description: "Touch-controlled LED desk lamp with customizable color temperature, stepless dimming, and integrated wireless charging base.",
    price: 2799,
    category: "Home",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80",
    stock: 14,
  },
  {
    name: "Stainless Steel Insulated Tumbler",
    description: "Double-wall vacuum insulated 750ml tumbler that keeps beverages cold for 24 hours or steaming hot for 12 hours.",
    price: 899,
    category: "Home",
    image: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80",
    stock: 50,
  },
];

async function seed() {
  try {
    await connectDB();
    console.log("[Seed] Clearing existing products...");
    await Product.deleteMany({});
    
    console.log("[Seed] Inserting sample catalog...");
    const created = await Product.insertMany(sampleProducts);
    console.log(`[Seed] Successfully inserted ${created.length} products!`);
  } catch (err) {
    console.error("[Seed] Error seeding products:", err);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

if (require.main === module) {
  seed();
}

module.exports = { sampleProducts };
