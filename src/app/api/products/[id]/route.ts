import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  id: string;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await params; // Await params in Next.js 16

    if (!id) {
        return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    console.log(`🗑️ Soft deleting product from DB: ${id}`);

    // Soft delete: Mark as deleted instead of removing from database
    const deletedProduct = await prisma.product.update({
      where: { sui_object_id: id },
      data: {
        is_deleted: true,
        deleted_at: new Date()
      }
    });

    console.log("✅ Product soft deleted from DB:", deletedProduct);

    return NextResponse.json({
        success: true,
        message: "Product deleted successfully (soft delete)",
        deletedId: deletedProduct.sui_object_id
    });

  } catch (error) {
    console.error("❌ Database deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete product from database", details: String(error) },
      { status: 500 }
    );
  }
}
