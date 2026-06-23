import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  productId: string;
  name: string;
  category: string;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema(
  {
    productId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { timestamps: false }
);

// Main pagination index – covers default newest‑first ordering
ProductSchema.index({ updatedAt: -1, _id: -1 });
// Category + pagination index – optimises filtered listings
ProductSchema.index({ category: 1, updatedAt: -1, _id: -1 });

export default mongoose.model<IProduct>('Product', ProductSchema);
