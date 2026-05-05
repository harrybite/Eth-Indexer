import { env } from "./config/env.js";


// export const SUPPORTED_TOKENS = [
//     // {
//     //     address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",  // ETH
//     //     name: "USDT"
//     // },
//     // {
//     //     address: "0x55d398326f99059fF775485246999027B3197955", // BSC
//     //     name: "USDT"
//     // }, 
//     {
//         address: "0x8dC7Cc054eE5A769FFe9AfC33dc2d7F0c4f407c2", // BSC
//         name: "RUSD"
//     }, 
//     // {
//     //     address: "0x49561Eb00e1E2Ff7a3E2a7c9664cEAa2Ce365a10", // MAAL
//     //     name: "RUSD",
//     // } 
// ]

export const SUPPORTED_TOKENS = env.SUPPORTED_TOKENS;
console.log("Supported tokens from env:", SUPPORTED_TOKENS);

export const TOKEN_DECIMALS = env.TOKEN_DECIMALS;
console.log("Token decimals from env:", TOKEN_DECIMALS);

export const FEE = env.FEE; // 0.5 USDT or RUSD
console.log("Fee from env:", FEE);

export const MINIMUM_TRANSFER_AMOUNT = env.MINIMUM_TRANSFER_AMOUNT; // Minimum transfer amount to consider for balance updates, set to fee to avoid processing dust transfers that won't cover the fee
console.log("Minimum transfer amount from env:", MINIMUM_TRANSFER_AMOUNT);