document.addEventListener('DOMContentLoaded', async () => {
    // Get DOM elements
    const getElement = id => document.getElementById(id) || console.error(`Element #${id} not found`);
    
    const connectBtn = getElement('voter-connect');
    const verifyBtn = getElement('verify-iris');
    const voteBtn = getElement('cast-vote');
    const irisInput = getElement('iris-image');
    const voterAddressSpan = getElement('voter-address');
    const networkSpan = getElement('network-info');
    const statusText = getElement('verification-status');
    const voteStatus = getElement('vote-status');
    const candidatesList = getElement('candidates-list');
    const votingSection = getElement('voting-section');
    const candidateSection = getElement('candidate-selection');
    
    let voterAccount = null;
    let selectedCandidateId = null;
    let isVerified = false;

    // Event listeners
    connectBtn.addEventListener('click', connectWallet);
    verifyBtn.addEventListener('click', verifyIdentity);
    voteBtn.addEventListener('click', castVote);

    async function connectWallet() {
        try {
            voterAccount = await window.initWeb3();
            if (voterAccount) {
                voterAddressSpan.textContent = 
                    `${voterAccount.substring(0,6)}...${voterAccount.substring(38)}`;
                
                // Get network
                const chainId = await ethereum.request({ method: 'eth_chainId' });
                networkSpan.textContent = getNetworkName(chainId);
                
                await window.initContract();
                votingSection.style.display = 'block';
                
                // Check if already voted
                await checkVotingStatus();
            }
        } catch (error) {
            showError(`Wallet connection failed: ${error.message}`);
        }
    }

    async function verifyIdentity() {
        if (!voterAccount) {
            return showError("Please connect wallet first");
        }
        
        if (!irisInput.files || irisInput.files.length === 0) {
            return showError("Please capture your iris image");
        }
        
        try {
            statusText.textContent = "Verifying...";
            statusText.style.color = "blue";
            
            const formData = new FormData();
            formData.append('wallet_address', voterAccount);
            formData.append('iris_image', irisInput.files[0]);
            
            const response = await fetch('http://localhost:5000/verify', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Verification failed");
            }
            
            const result = await response.json();
            if (!result.verified) {
                throw new Error("Iris verification failed");
            }
            
            statusText.textContent = "Verified successfully!";
            statusText.style.color = "green";
            isVerified = true;
            
            // Load candidates
            await loadCandidates();
            candidateSection.style.display = 'block';
            
        } catch (error) {
            statusText.textContent = "Verification failed";
            statusText.style.color = "red";
            showError(`Verification error: ${error.message}`);
        }
    }

    async function loadCandidates() {
        try {
            const contract = window.votingContract();
            const candidateCount = await contract.methods.getCandidateCount().call();
            candidatesList.innerHTML = "";
            
            for (let i = 0; i < candidateCount; i++) {
                const candidate = await contract.methods.getCandidate(i).call();
                const li = document.createElement('li');
                
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = 'candidate';
                radio.value = i;
                radio.id = `candidate-${i}`;
                radio.addEventListener('change', () => {
                    selectedCandidateId = i;
                    voteBtn.disabled = false;
                });
                
                const label = document.createElement('label');
                label.htmlFor = `candidate-${i}`;
               // label.textContent = `${candidate[0]} (Votes: ${candidate[1]})`;
              // label.textContent = `${candidate[0]}`;
                
                li.appendChild(radio);
                li.appendChild(label);
                candidatesList.appendChild(li);
            }
        } catch (error) {
            showError(`Failed to load candidates: ${error.message}`);
        }
    }

    async function castVote() {
        if (!isVerified) {
            return showError("Please verify your identity first");
        }
        
        if (selectedCandidateId === null) {
            return showError("Please select a candidate");
        }
        
        try {
            voteStatus.textContent = "Processing vote...";
            voteStatus.style.color = "blue";
            
            const contract = window.votingContract();
            await contract.methods.vote(selectedCandidateId).send({
                from: voterAccount,
                gas: 300000
            });
            
            voteStatus.textContent = "Vote cast successfully!";
            voteStatus.style.color = "green";
            voteBtn.disabled = true;
            
            // Update candidate list
            await loadCandidates();
            
            // Show success message
            showSuccess("Your vote has been recorded on the blockchain");
            
        } catch (error) {
            voteStatus.textContent = "Voting failed";
            voteStatus.style.color = "red";
            showError(`Voting error: ${error.message}`);
        }
    }

    async function checkVotingStatus() {
        try {
            const contract = window.votingContract();
            const hasVoted = await contract.methods.hasVoted(voterAccount).call();
            
            if (hasVoted) {
                voteStatus.textContent = "You have already voted";
                voteStatus.style.color = "orange";
                candidateSection.style.display = 'block';
                voteBtn.disabled = true;
                await loadCandidates();
            }
        } catch (error) {
            console.log("Voting status check:", error.message);
        }
    }

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

    function showError(message) {
        const errorDiv = getElement('error-message');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => errorDiv.style.display = 'none', 5000);
    }

    function showSuccess(message) {
        const successDiv = getElement('success-message');
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => successDiv.style.display = 'none', 5000);
    }
});