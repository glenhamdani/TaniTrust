export const CONSTANTS = {
    NETWORK: process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet',
    // ⚠️ IMPORTANT: This must be the Package ID where 'marketplace' module is deployed.
    // If you deployed marketplace separately from token, use the Marketplace Package ID here.
    PACKAGE_ID: process.env.NEXT_PUBLIC_PACKAGE_ID || '0x6272050be22ceec12d8684b5d2a72184f7da10149734cac1796945e1bd76e8d1',
    TREASURY_CAP: process.env.NEXT_PUBLIC_TREASURY_CAP || '0xbf62fde77a9243d28832fd2e5356e1b531a30b4c581a44515476851523bae90b',
    get COIN_TYPE() {
        return `${this.PACKAGE_ID}::tani_token::TANI_TOKEN`;
    },
    CLOCK_OBJECT: '0x6', // Sui system clock
    MARKETPLACE_MODULE: 'marketplace', // Must match 'module tanitrust::marketplace'
    TOKEN_MODULE: 'tani_token'
};
