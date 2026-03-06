import express from "express";
import Product from "../models/product.js";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../cloudinary.js";

const router = express.Router();

// Cloudinary Storage Config
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    console.log("Uploading file:", file.originalname);
    cb(null, true);
  }
});

// CREATE PRODUCT (supports multiple images)
router.post("/", (req, res, next) => {
  // accept up to 10 files, adjust as needed
  upload.array("images", 10)(req, res, (err) => {
    if (err) {
      console.error("Multer/Cloudinary upload error:", err.message);
      return res.status(400).json({ message: `Upload failed: ${err.message}` });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log("=== Product Creation Request ===");
    if (req.files && req.files.length) {
      req.files.forEach((f, idx) => {
        console.log(`File ${idx + 1}: ${f.originalname} (${f.size} bytes, URL: ${f.path})`);
      });
    } else {
      console.log("No files uploaded");
    }
    console.log("Body:", JSON.stringify(req.body, null, 2));

    const { name, price, category, description, sizes } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "At least one image is required" });
    }

    // Parse sizes correctly: client may send JSON string of array of objects
    let parsedSizes = [];
    if (sizes) {
      try {
        const raw = JSON.parse(sizes);
        // If items are strings, convert to object with stock 0
        parsedSizes = raw.map((item) => {
          if (typeof item === "string") {
            return { size: item, stock: 0 };
          }
          // assume already {size, stock}
          return item;
        });
      } catch (e) {
        console.warn("Failed to parse sizes, ignoring", e);
      }
    }

    const product = new Product({
      name,
      price,
      category,
      description,
      images: req.files.map((f) => f.path), // store array of URLs
      sizes: parsedSizes,
    });

    await product.save();

    res.status(201).json(product);
  } catch (error) {
    console.error("Product creation error:", error.message);
    console.error("Full error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET ALL PRODUCTS
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    // ensure each product has an images array in the response for backward compatibility
    const transformed = products.map((p) => {
      const obj = p.toObject();
      if (!obj.images || obj.images.length === 0) {
        if (obj.image) {
          obj.images = [obj.image];
        } else {
          obj.images = [];
        }
      }
      return obj;
    });
    res.json(transformed);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET SINGLE PRODUCT
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    // ensure images array
    if (!product.images || product.images.length === 0) {
      if (product.image) {
        product.images = [product.image];
      } else {
        product.images = [];
      }
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE PRODUCT
router.put("/:id", (req, res, next) => {
  // optional: accept updated images
  upload.array("images", 10)(req, res, (err) => {
    if (err) {
      console.error("Multer/Cloudinary upload error:", err.message);
      return res.status(400).json({ message: `Upload failed: ${err.message}` });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { name, price, category, description, sizes } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (price) updateData.price = price;
    if (category) updateData.category = category;
    if (description) updateData.description = description;

    // if new images uploaded, replace them; else keep existing
    if (req.files && req.files.length > 0) {
      updateData.images = req.files.map((f) => f.path);
    }

    // parse sizes if provided
    if (sizes) {
      try {
        const raw = JSON.parse(sizes);
        updateData.sizes = raw.map((item) => {
          if (typeof item === "string") {
            return { size: item, stock: 0 };
          }
          return item;
        });
      } catch (e) {
        console.warn("Failed to parse sizes, ignoring", e);
      }
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("Product update error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

// DELETE PRODUCT
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ message: "Product deleted successfully", product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;