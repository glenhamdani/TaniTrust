"use client";

import { useState } from "react";
import { useProductUpload } from "@/hooks/useProductUpload";
import { PRODUCT_CATEGORIES } from "@/types/product";
import Image from "next/image";
import styles from "./ProductUploadForm.module.css";

interface ProductUploadFormProps {
  onSuccess?: (id: string) => void;
  onError?: (error: string) => void;
}

export function ProductUploadForm({ onSuccess, onError }: ProductUploadFormProps) {
  const { uploadProduct, isUploading, uploadProgress } = useProductUpload();
  const [formData, setFormData] = useState({
    name: "",
    price_per_unit: "",
    stock: "",
    fulfillment_time: "1",
    description: "",
    category: "Vegetables",
    image: null as File | null,
  });
  const [imagePreview, setImagePreview] = useState<string>("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!formData.image) {
        throw new Error("Please select an image");
      }

      const priceInMist = Math.floor(parseFloat(formData.price_per_unit) * 100_000_000);

      const result = await uploadProduct({
        name: formData.name,
        price_per_unit: priceInMist,
        stock: parseInt(formData.stock),
        fulfillment_time: parseInt(formData.fulfillment_time),
        description: formData.description,
        category: formData.category,
        image: formData.image,
      });

      if (onSuccess) onSuccess(result.productId);

      // Reset form
      setFormData({
        name: "",
        price_per_unit: "",
        stock: "",
        fulfillment_time: "1",
        description: "",
        category: "Vegetables",
        image: null,
      });
      setImagePreview("");
      // Reset file input manually if needed via ref
      (document.getElementById('image') as HTMLInputElement).value = '';

    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      if (onError) onError(msg);
      else console.error(msg); // Fallback if no onError handler
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label htmlFor="image">Product Image *</label>
        <input
          type="file"
          id="image"
          accept="image/*"
          onChange={handleImageChange}
          required
          disabled={isUploading}
        />
        {imagePreview && (
          <div style={{ position: "relative", width: "100%", height: "200px", marginTop: "10px" }}>
            <Image
              src={imagePreview}
              alt="Preview"
              fill
              style={{ objectFit: "contain" }}
              className={styles.preview}
            />
          </div>
        )}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="name">Product Name *</label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          disabled={isUploading}
          placeholder="e.g. Fresh Tomatoes"
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="category">Category *</label>
        <select
          id="category"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          required
          disabled={isUploading}
        >
          {PRODUCT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="price">Price per Unit (TATO) *</label>
          <input
            type="number"
            id="price"
            value={formData.price_per_unit}
            onChange={(e) =>
              setFormData({ ...formData, price_per_unit: e.target.value })
            }
            required
            disabled={isUploading}
            min="1"
            placeholder="1000"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="stock">Stock (kg) *</label>
          <input
            type="number"
            id="stock"
            value={formData.stock}
            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
            required
            disabled={isUploading}
            min="1"
            placeholder="100"
          />
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="fulfillment_time">Fulfillment Time (Hours) *</label>
        <input
          type="number"
          id="fulfillment_time"
          value={formData.fulfillment_time}
          onChange={(e) =>
            setFormData({ ...formData, fulfillment_time: e.target.value })
          }
          required
          disabled={isUploading}
          min="1"
          placeholder="1"
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="description">Description *</label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          required
          disabled={isUploading}
          rows={4}
          placeholder="Describe your product..."
        />
      </div>

      {
        uploadProgress && (
          <div className={styles.progress}>{uploadProgress}</div>
        )
      }

      <button type="submit" disabled={isUploading} className={styles.submitBtn}>
        {isUploading ? "Uploading..." : "Upload Product"}
      </button>
    </form>
  );
}
