export const CONSTANTS = {
    NETWORK: 'testnet',
    // ⚠️ IMPORTANT: This must be the Package ID where 'marketplace' module is deployed.
    // If you deployed marketplace separately from token, use the Marketplace Package ID here.
    PACKAGE_ID: '0x0a9e26ba0f2084e14e1c383704ee0f9460cb5772999e1c986f2fdd86079436c0',
    // Shared Object for Minting TATO
    TREASURY_CAP: '0x921ddac4d21d3d4f0db83dabf0c72eba0ff4b13af03151506116130f84f12e5e',
    // TATO Token Type
    COIN_TYPE: '0x0a9e26ba0f2084e14e1c383704ee0f9460cb5772999e1c986f2fdd86079436c0::tani_token::TANI_TOKEN',
    CLOCK_OBJECT: '0x6', // Sui system clock
    // Marketplace Logic
    MARKETPLACE_MODULE: 'marketplace', // Must match 'module tanitrust::marketplace'
    TOKEN_MODULE: 'tani_token'
};
