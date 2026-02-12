import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      sui_object_id,
      name,
      price_per_unit,
      stock,
      farmer_address,
      image_url,
      image_cid,
      description,
      category,
      fulfillment_time,
    } = body;

    // Validasi required fields
    if (
      !sui_object_id ||
      !name ||
      price_per_unit === undefined ||
      stock === undefined ||
      !farmer_address ||
      !image_url ||
      !description ||
      !category
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Simpan atau update product di database
    const product = await prisma.product.upsert({
      where: { sui_object_id },
      update: {
        name,
        price_per_unit: BigInt(price_per_unit),
        stock: BigInt(stock),
        farmer_address,
        fulfillment_time: BigInt(fulfillment_time || 24),
        image_url,
        image_cid,
        description,
        category,
      },
      create: {
        sui_object_id,
        name,
        price_per_unit: BigInt(price_per_unit),
        stock: BigInt(stock),
        farmer_address,
        fulfillment_time: BigInt(fulfillment_time || 24),
        image_url,
        image_cid,
        description,
        category,
      },
    });

    // Convert BigInt to string untuk JSON response
    const productResponse = {
      ...product,
      price_per_unit: product.price_per_unit.toString(),
      stock: product.stock.toString(),
      fulfillment_time: (product.fulfillment_time || BigInt(24)).toString(),
    };

    return NextResponse.json({
      success: true,
      product: productResponse,
    });
  } catch (error) {
    console.error("Product sync error:", error);
    return NextResponse.json(
      {
        error: "Failed to sync product to database",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
