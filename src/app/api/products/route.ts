import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Product } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const farmer_address = searchParams.get("farmer_address");
    const category = searchParams.get("category");
    const sort = searchParams.get("sort") || "latest"; // latest, oldest, price_asc, price_desc
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: {
      farmer_address?: string;
      category?: string;
    } = {};
    
    if (farmer_address) {
      where.farmer_address = farmer_address;
    }
    
    if (category) {
      where.category = category;
    }

    // Build orderBy clause
    let orderBy:
      | { createdAt: "desc" | "asc" }
      | { price_per_unit: "desc" | "asc" } = { createdAt: "desc" };
    
    switch (sort) {
      case "latest":
        orderBy = { createdAt: "desc" };
        break;
      case "oldest":
        orderBy = { createdAt: "asc" };
        break;
      case "price_asc":
        orderBy = { price_per_unit: "asc" };
        break;
      case "price_desc":
        orderBy = { price_per_unit: "desc" };
        break;
      default:
        orderBy = { createdAt: "desc" };
    }

    // Fetch products
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.product.count({ where }),
    ]);

    // Convert BigInt to string untuk JSON response
    const productsResponse = products.map((product) => ({
      ...product,
      price_per_unit: product.price_per_unit.toString(),
      stock: product.stock.toString(),
    }));

    return NextResponse.json({
      success: true,
      products: productsResponse,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Get products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
