import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },

    // store one or more image URLs (Cloudinary paths)
    images: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "At least one image is required",
      },
    },

    description: { type: String, required: true },

    sizes: [
      {
        size: String,
        stock: Number,
      }
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);