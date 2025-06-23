// config/contractConfig.js

import contractJson from './Voting.json'; // ABI file after compilation

// ✅ ABI extracted from Voting.json
export const contractABI = contractJson.abi;

// ✅ Replace this with your deployed contract address
export const contractAddress = "0xYourDeployedContractAddress";
