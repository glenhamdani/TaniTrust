-- CreateTable
CREATE TABLE "Product" (
    "sui_object_id" VARCHAR(66) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "price_per_unit" BIGINT NOT NULL,
    "stock" BIGINT NOT NULL,
    "farmer_address" VARCHAR(66) NOT NULL,
    "image_url" TEXT NOT NULL,
    "image_cid" TEXT,
    "description" TEXT NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("sui_object_id")
);

-- CreateIndex
CREATE INDEX "Product_farmer_address_idx" ON "Product"("farmer_address");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt" DESC);
