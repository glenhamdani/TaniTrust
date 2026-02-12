import { PinataSDK } from "pinata-web3";

const jwt = process.env.PINATA_JWT;
const gateway = process.env.PINATA_GATEWAY;

if (!jwt) {
  console.warn("⚠️ PINATA_JWT is missing from environment variables. IPFS uploads will fail.");
}

// Initialize Pinata with JWT (safe fallback)
export const pinata = new PinataSDK({
  pinataJwt: jwt || "",
  pinataGateway: gateway || "gateway.pinata.cloud",
});

export const checkPinataConfig = () => {
  if (!jwt) {
    throw new Error("PINATA_JWT is missing from environment variables. Please add it to your .env file.");
  }
};

