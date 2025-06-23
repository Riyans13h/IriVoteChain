// Global error handler
function showError(message) {
    console.error(message);
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

let web3;
let votingContract;
const contractAddress = "0xdD06B0deE29471b3656Dc4F281F59b1d3Ae03A0C"; // Replace with your address

async function initWeb3() {
    try {
        if (typeof window.ethereum === 'undefined') {
            throw new Error("MetaMask not detected! Please install MetaMask.");
        }
        
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        web3 = new Web3(window.ethereum);
        
        // Get accounts
        const accounts = await web3.eth.getAccounts();
        return accounts[0];
    } catch (error) {
        showError(`Web3 initialization failed: ${error.message}`);
        console.error("Web3 init error:", error);
        return null;
    }
}

async function initContract() {
    try {
        // Load contract ABI
        const response = await fetch('js/Voting.json');
        if (!response.ok) {
            throw new Error(`Failed to load contract ABI: ${response.status}`);
        }
        
        const contractJson = await response.json();
        votingContract = new web3.eth.Contract(contractJson.abi, contractAddress);
        return votingContract;
    } catch (error) {
        showError(`Contract initialization failed: ${error.message}`);
        console.error("Contract init error:", error);
        return null;
    }
}

// Handle network changes
window.ethereum.on('chainChanged', (chainId) => {
    const networkSpan = document.getElementById('network-info');
    if (networkSpan) {
        networkSpan.textContent = getNetworkName(chainId);
    }
});

// Handle account changes
window.ethereum.on('accountsChanged', (accounts) => {
    const addressSpan = document.getElementById('voter-address') || 
                        document.getElementById('admin-address');
    if (addressSpan && accounts.length > 0) {
        addressSpan.textContent = 
            `${accounts[0].substring(0,6)}...${accounts[0].substring(38)}`;
    }
});

function getNetworkName(chainId) {
    const networks = {
        '0x1': 'Ethereum Mainnet',
        '0x3': 'Ropsten Testnet',
        '0x4': 'Rinkeby Testnet',
        '0x5': 'Goerli Testnet',
        '0x2a': 'Kovan Testnet',
        '0x539': 'Localhost'
    };
    return networks[chainId] || `Unknown (${chainId})`;
}

// Expose functions globally
window.initWeb3 = initWeb3;
window.initContract = initContract;
window.votingContract = () => votingContract;
window.web3Instance = () => web3;
window.showError = showError;