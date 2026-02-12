import { NextRequest, NextResponse } from "next/server";
import { pinata, checkPinataConfig } from "@/lib/pinata";

export async function POST(request: NextRequest) {
  console.log("📥 Received upload request");
  try {
    checkPinataConfig();

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validasi tipe file (hanya gambar)
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 }
      );
    }

    // Validasi ukuran file (max 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    // Upload ke Pinata menggunakan new API
    const upload = await pinata.upload.file(file);

    // Generate URL dari gateway
    const imageUrl = `https://gateway.pinata.cloud/ipfs/${upload.IpfsHash}`;

    return NextResponse.json({
      success: true,
      cid: upload.IpfsHash,
      url: imageUrl,
      size: file.size,
      name: file.name,
    });
  } catch (error) {
    console.error("IPFS upload error:", error);
    return NextResponse.json(
      {
        error: "Failed to upload to IPFS",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
