import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Order, Product, Dispute } from "@prisma/client";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const buyer = searchParams.get("buyer");
        const farmer = searchParams.get("farmer");

        const where: any = {};
        if (buyer) where.buyer = buyer;
        if (farmer) where.farmer = farmer;

        const orders = await prisma.order.findMany({
            where,
            include: {
                product: true,
                dispute: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const serializedOrders = orders.map((order) => ({
            sui_object_id: order.sui_object_id,
            product_id: order.product_id,
            buyer: order.buyer,
            farmer: order.farmer,
            quantity: order.quantity.toString(),
            total_price: order.total_price.toString(),
            deadline: order.deadline.toString(),
            status: Number(order.status),
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            dispute: order.dispute,
            product: order.product ? {
                sui_object_id: order.product.sui_object_id,
                name: order.product.name,
                image_url: order.product.image_url,
                price_per_unit: order.product.price_per_unit.toString(),
                stock: order.product.stock.toString(),
                category: order.product.category,
                description: order.product.description
            } : null
        }));

        return NextResponse.json({ success: true, orders: serializedOrders });
    } catch (error) {
        console.error("Fetch Orders Error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
