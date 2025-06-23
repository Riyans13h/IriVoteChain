document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Utility to get DOM element or throw an error
        const getElement = (id) => {
            const el = document.getElementById(id);
            if (!el) throw new Error(`Element #${id} not found`);
            return el;
        };

        // Elements
        const connectWalletBtn = getElement('admin-connect');
        const registerVoterBtn = getElement('register-voter');
        const addCandidateBtn = getElement('add-candidate');
        const startElectionBtn = getElement('start-election');
        const endElectionBtn = getElement('end-election');
        const walletAddressInput = getElement('voter-address');
        const irisFileInput = getElement('admin-iris-image');
        const candidateNameInput = getElement('candidate-name');
        const adminAddressSpan = getElement('admin-address');
        const adminControls = getElement('admin-controls');
        const electionResults = getElement('election-results');

        let adminAccount = null;

        // Event bindings
        connectWalletBtn.addEventListener('click', connectWallet);
        registerVoterBtn.addEventListener('click', registerVoter);
        addCandidateBtn.addEventListener('click', addCandidate);
        startElectionBtn.addEventListener('click', startElection);
        endElectionBtn.addEventListener('click', endElection);

        // Connect Wallet
        async function connectWallet() {
            try {
                adminControls.style.display = 'none';
                adminAddressSpan.textContent = "Not connected";

                adminAccount = await window.initWeb3();

                if (adminAccount) {
                    adminAddressSpan.textContent =
                        `${adminAccount.slice(0, 6)}...${adminAccount.slice(-4)}`;

                    await window.initContract();
                    await checkAdminStatus();
                }
            } catch (error) {
                window.showError(`Admin connection failed: ${error.message}`);
                console.error("Connect Wallet Error:", error);
            }
        }

        // Register Voter
        async function registerVoter() {
            if (!adminAccount) return window.showError("Please connect wallet first");

            const walletAddress = walletAddressInput.value.trim();
            if (!walletAddress) return window.showError("Please enter a wallet address");

            try {
                const web3 = window.web3Instance();
                if (!web3.utils.isAddress(walletAddress)) {
                    return window.showError("Invalid wallet address format");
                }
            } catch (error) {
                return window.showError(`Web3 address validation failed: ${error.message}`);
            }

            if (!irisFileInput.files || irisFileInput.files.length === 0) {
                return window.showError("Please select an iris image");
            }

            try {
                const formData = new FormData();
                formData.append('wallet_address', walletAddress);
                formData.append('iris_image', irisFileInput.files[0]);

                const response = await fetch('http://localhost:5000/register', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "Iris registration failed");
                }

                const contract = window.votingContract();
                if (!contract) throw new Error("Contract not initialized");

                await contract.methods.registerVoter(walletAddress).send({
                    from: adminAccount,
                    gas: 300000
                });

                alert("Voter registered successfully!");
                walletAddressInput.value = "";
                irisFileInput.value = "";
            } catch (error) {
                window.showError(`Registration failed: ${error.message}`);
                console.error("Register Voter Error:", error);
            }
        }

        // Add Candidate
        async function addCandidate() {
            if (!adminAccount) return window.showError("Please connect wallet first");

            const name = candidateNameInput.value.trim();
            if (!name) return window.showError("Please enter candidate name");

            try {
                const contract = window.votingContract();
                if (!contract) throw new Error("Contract not initialized");

                await contract.methods.addCandidate(name).send({
                    from: adminAccount,
                    gas: 300000
                });

                alert("Candidate added successfully!");
                candidateNameInput.value = "";
            } catch (error) {
                window.showError(`Failed to add candidate: ${error.message}`);
                console.error("Add Candidate Error:", error);
            }
        }

        // Start Election
        async function startElection() {
            if (!adminAccount) return window.showError("Please connect wallet first");
            if (!confirm("Start the election? This cannot be undone.")) return;

            try {
                const contract = window.votingContract();
                if (!contract) throw new Error("Contract not initialized");

                await contract.methods.startElection().send({
                    from: adminAccount,
                    gas: 300000
                });

                alert("Election started successfully!");
            } catch (error) {
                window.showError(`Failed to start election: ${error.message}`);
                console.error("Start Election Error:", error);
            }
        }

        // End Election
        async function endElection() {
            if (!adminAccount) return window.showError("Please connect wallet first");
            if (!confirm("End the election and show results?")) return;

            try {
                const contract = window.votingContract();
                if (!contract) throw new Error("Contract not initialized");

                await contract.methods.endElection().send({
                    from: adminAccount,
                    gas: 300000
                });

                const results = await contract.methods.getResults().call();
                displayResults(results);

                alert("Election ended successfully!");
            } catch (error) {
                window.showError(`Failed to end election: ${error.message}`);
                console.error("End Election Error:", error);
            }
        }

        // Display Results
        function displayResults(results) {
            if (!results || !Array.isArray(results[0]) || !Array.isArray(results[1])) {
                electionResults.innerHTML = "<p>No results available</p>";
                return;
            }

            let html = "<h3>Election Results</h3><table>";
            html += "<tr><th>Candidate</th><th>Votes</th></tr>";

            for (let i = 0; i < results[0].length; i++) {
                html += `<tr><td>${results[0][i]}</td><td>${results[1][i]}</td></tr>`;
            }

            html += "</table>";
            electionResults.innerHTML = html;
        }

        // Check if connected admin is contract admin
        async function checkAdminStatus() {
            try {
                const contract = window.votingContract();
                if (!contract) throw new Error("Contract not initialized");

                const contractAdmin = await contract.methods.admin().call();

                if (contractAdmin.toLowerCase() === adminAccount.toLowerCase()) {
                    adminControls.style.display = 'block';
                } else {
                    window.showError("Connected wallet is not the contract admin");
                }
            } catch (error) {
                window.showError(`Admin check failed: ${error.message}`);
                console.error("Admin Check Error:", error);
            }
        }

    } catch (error) {
        window.showError(`Admin page failed: ${error.message}`);
        console.error("DOM Load Error:", error);
    }
});
