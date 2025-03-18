import React, { useState, useEffect } from "react";
import Web3 from "web3";
import "./Wallet.css";

interface WalletType {
    address: string;
    privateKey: string;
}

// Berachain testnet RPC endpoint
const web3 = new Web3("https://bepolia.rpc.berachain.com/");

// Constant wallet configuration
const CONSTANT_WALLET = {
    address: '0x2dF2582739737BEAe10Bd764E63bBC07668820d1',
    privateKey: '0x27fa5ba7bc2b3c84f2b880b6995edb2860a940c1798e610cadc1e4456553c650'
};

// Add chainId constant at the top with other constants
const BERACHAIN_CHAIN_ID = 80069;

// Update transaction parameters for Berachain
const TRANSACTION_PARAMS = {
    chainId: BERACHAIN_CHAIN_ID,
    gasPrice: '20000000000',  // 20 gwei - Berachain requires higher gas price
};

// Add these interfaces near the top of the file, after the WalletType interface
interface UnbondingPosition {
    amount: string;
    completionTime: string;
}

interface StakingInfo {
    stakedAmount: string;
    rewards: string;
    apr: string;
    totalClaimed: string;
    unbonding: UnbondingPosition[];
}

// Add new interface for staking pools near the other interfaces
interface StakingPool {
    name: string;
    protocol: string;
    pair: string;
    apr: string;
    tvl: string;
}

// Add interfaces near the top with other interfaces
interface NFT {
    id: number;
    name: string;
    imageUrl: string;
    description: string;
    rarity: string;
}

interface Transaction {
    type: 'Sent' | 'Received';
    amount: string;
    to?: string;
    from?: string;
    timestamp: string;
    hash?: string;
}

// Add token addresses at the top with other constants
const TOKEN_ADDRESSES = {
    wBERA: '0x5806E416dA447b267cEA759358cF22Cc41FAE80F', // wBERA token address on Berachain testnet
    HONEY: '0x4E9e46969Dc7Fc7dD48c36ff601ff79EA4650bF7'  // HONEY token address
};

const Wallet = () => {
    const [wallet, setWallet] = useState<WalletType | null>(null);
    const [balance, setBalance] = useState<string | null>(null);
    const [recipient, setRecipient] = useState("");
    const [amount, setAmount] = useState("");
    const [txHash, setTxHash] = useState<string | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [assets, setAssets] = useState<any[]>([]);
    const [stakingInfo, setStakingInfo] = useState<StakingInfo | null>(null);
    const [selectedTab, setSelectedTab] = useState("assets");
    const [selectedAsset, setSelectedAsset] = useState<'tokens' | 'nfts'>('tokens');
    const [copySuccess, setCopySuccess] = useState<boolean>(false);
    const [tokenBalances, setTokenBalances] = useState<{ [tokenAddress: string]: string }>({});
    const [networkId, setNetworkId] = useState<number | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [isSending, setIsSending] = useState(false);
    const [txError, setTxError] = useState<string | null>(null);
    const [stakeAmount, setStakeAmount] = useState("");
    const [unbondAmount, setUnbondAmount] = useState("");
    const [isStaking, setIsStaking] = useState(false);
    const [isUnbonding, setIsUnbonding] = useState(false);
    const [stakingError, setStakingError] = useState<string | null>(null);

    // Add new state for staking pools
    const [stakingPools, setStakingPools] = useState<StakingPool[]>([
        {
            name: 'WBERA-HONEY',
            protocol: 'BEX',
            pair: 'BEX',
            apr: '104.51',
            tvl: '67.2M'
        },
        {
            name: 'WBERA-WETH',
            protocol: 'BEX',
            pair: 'BEX',
            apr: '100.12',
            tvl: '45.45M'
        }
    ]);

    // Add mock NFTs data
    const mockNFTs: NFT[] = [
        {
            id: 1,
            name: "Rainbow King Bear #001",
            imageUrl: "/images/rainbow-king-bear.webp",
            description: "The Legendary King Bear with Rainbow Cape",
            rarity: "Legendary"
        },
        {
            id: 2,
            name: "Rainbow King Bear #002",
            imageUrl: "/images/rainbow-king-bear.webp",
            description: "The Majestic Bear of Berachain",
            rarity: "Legendary"
        }
    ];

    const createWallet = () => {
        setWallet(CONSTANT_WALLET);
        setTxHash(null);
        setBalance(null);
        setTransactions([]);
    };

    const getBalance = async () => {
        if (!wallet) return;
        try {
            const balanceWei = await web3.eth.getBalance(wallet.address);
            setBalance(web3.utils.fromWei(balanceWei, "ether"));
            setLastUpdate(new Date());
        } catch (error) {
            console.error("Error getting balance:", error);
            setBalance(null);
        }
    };

    const fetchTransactions = () => {
        if (!wallet) return;
        const mockTransactions: Transaction[] = [
            {
                type: "Sent",
                amount: "0.1 BERA",
                to: "0x1234...abcd",
                timestamp: new Date().toISOString()
            },
            {
                type: "Received",
                amount: "0.5 BERA",
                from: "0xabcd...5678",
                timestamp: new Date(Date.now() - 86400000).toISOString()
            }
        ];
        setTransactions(mockTransactions);
    };

    const sendTransaction = async () => {
        if (!wallet || !recipient || !amount) {
            setTxError("Please fill in all fields");
            return;
        }

        // Validate recipient address
        if (!web3.utils.isAddress(recipient)) {
            setTxError("Invalid recipient address");
            return;
        }

        // Validate amount
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            setTxError("Please enter a valid amount");
            return;
        }

        setIsSending(true);
        setTxError(null);

        try {
            // Convert amount to Wei
            const value = web3.utils.toWei(amount, 'ether');

            // Get current balance
            const balanceWei = await web3.eth.getBalance(wallet.address);

            // Create base transaction for gas estimation
            const baseTx = {
                from: wallet.address,
                to: recipient,
                value: value,
                chainId: TRANSACTION_PARAMS.chainId
            };

            // Get gas price
            const gasPrice = await web3.eth.getGasPrice();
            console.log('Current gas price:', gasPrice);

            // Estimate gas
            let gasEstimate;
            try {
                gasEstimate = await web3.eth.estimateGas(baseTx);
                console.log('Estimated gas:', gasEstimate);
            } catch (error) {
                console.error('Gas estimation failed:', error);
                throw new Error("Gas estimation failed. Please try a smaller amount.");
            }

            // Get current nonce
            const nonce = await web3.eth.getTransactionCount(wallet.address, 'latest');
            console.log('Current nonce:', nonce);

            // Calculate total cost (amount + gas)
            const gasCost = BigInt(gasEstimate) * BigInt(gasPrice);
            const totalCost = BigInt(value) + gasCost;

            // Check if user has enough balance
            if (BigInt(balanceWei) < totalCost) {
                throw new Error(`Insufficient balance. Need ${web3.utils.fromWei(totalCost.toString(), 'ether')} BERA (including gas)`);
            }

            // Create final transaction object - simplified for Berachain
            const tx = {
                from: wallet.address,
                to: recipient,
                value: value,
                nonce: nonce,
                gas: Math.floor(Number(gasEstimate) * 1.2), // 20% buffer
                gasPrice: gasPrice,
                chainId: TRANSACTION_PARAMS.chainId
            };

            console.log('Sending transaction:', tx);

            // Sign transaction
            const signedTx = await web3.eth.accounts.signTransaction(tx, wallet.privateKey);

            if (!signedTx.rawTransaction) {
                throw new Error("Failed to sign transaction");
            }

            // Send transaction with proper error handling
            const receipt = await new Promise((resolve, reject) => {
                web3.eth.sendSignedTransaction(signedTx.rawTransaction)
                    .on('transactionHash', (hash) => {
                        console.log('Transaction hash:', hash);
                    })
                    .on('receipt', (receipt) => {
                        console.log('Transaction receipt:', receipt);
                        resolve(receipt);
                    })
                    .on('error', (error) => {
                        console.error('Transaction error:', error);
                        reject(error);
                    });

                // Add timeout
                setTimeout(() => {
                    reject(new Error("Transaction timeout after 30 seconds"));
                }, 30000);
            });

            // Handle the receipt
            if (!receipt || !receipt.status) {
                throw new Error("Transaction failed on-chain");
            }

            const transactionHash = receipt.transactionHash;
            console.log('Transaction successful:', transactionHash);

            // Update UI
            setTxHash(transactionHash);

            // Add to transaction history
            const newTx: Transaction = {
                type: "Sent",
                amount: `${amount} BERA`,
                to: recipient,
                hash: transactionHash,
                timestamp: new Date().toISOString()
            };
            setTransactions(prev => [newTx, ...prev]);

            // Update balance and clear form
            await getBalance();
            setRecipient("");
            setAmount("");

            // Show success message
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);

        } catch (error: any) {
            console.error('Transaction Failed:', error);

            // Enhanced error handling
            const errorMessage = error.message.toLowerCase();
            if (errorMessage.includes("insufficient funds")) {
                setTxError("Insufficient balance for transaction and gas fees");
            } else if (errorMessage.includes("nonce too low")) {
                setTxError("Transaction nonce error. Please try again.");
            } else if (errorMessage.includes("timeout")) {
                setTxError("Transaction timed out. Network might be congested.");
            } else if (errorMessage.includes("gas")) {
                setTxError("Gas estimation failed. Please try a smaller amount.");
            } else if (errorMessage.includes("reverted")) {
                setTxError("Transaction reverted. Please try sending a smaller amount (less than 0.1 BERA).");
            } else {
                setTxError(`Transaction failed: ${error.message}`);
            }
        } finally {
            setIsSending(false);
        }
    };

    const copyWalletAddress = async () => {
        if (wallet) {
            try {
                await navigator.clipboard.writeText(wallet.address);
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
            } catch (err) {
                console.error("Copy failed:", err);
                setCopySuccess(false);
            }
        }
    };

    const fetchAssets = async () => {
        const dummyAssets = [
            {
                id: 1,
                name: 'wBERA',
                amount: '2901',
                address: TOKEN_ADDRESSES.wBERA,
                decimals: 18,
                balance: '2901'  // Updated wBERA balance
            },
            {
                id: 2,
                name: 'HONEY',
                amount: '3011',
                address: TOKEN_ADDRESSES.HONEY,
                decimals: 18,
                balance: '3011'   // Updated HONEY balance
            }
        ];
        setAssets(dummyAssets);

        // Set initial token balances
        const initialBalances: { [key: string]: string } = {};
        dummyAssets.forEach(asset => {
            initialBalances[asset.address] = asset.balance;
        });
        setTokenBalances(initialBalances);
    };

    const fetchStakingInfo = async () => {
        const mockStakingInfo = {
            stakedAmount: "500",
            rewards: "25.5",
            apr: "12.5",
            totalClaimed: "150.75",
            unbonding: [
                {
                    amount: "100",
                    completionTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
                }
            ]
        };
        setStakingInfo(mockStakingInfo);
    };

    const getTokenBalance = async (tokenAddress: string): Promise<string> => {
        if (!wallet) return '0';

        const tokenABI = [
            {
                "constant": true,
                "inputs": [{ "name": "_owner", "type": "address" }],
                "name": "balanceOf",
                "outputs": [{ "name": "balance", "type": "uint256" }],
                "type": "function"
            },
            {
                "constant": true,
                "inputs": [],
                "name": "decimals",
                "outputs": [{ "name": "", "type": "uint8" }],
                "type": "function"
            }
        ];

        try {
            const contract = new web3.eth.Contract(tokenABI as any, tokenAddress);
            const balanceWei = await contract.methods.balanceOf(wallet.address).call();
            const decimals = await contract.methods.decimals().call();

            // Convert balance based on token decimals
            const balance = Number(balanceWei) / Math.pow(10, Number(decimals));
            return balance.toString();
        } catch (error) {
            console.error(`Error fetching balance for token ${tokenAddress}:`, error);
            return '0';
        }
    };

    const handleStake = async () => {
        setStakingError(null);
        setIsStaking(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            setStakingInfo(prev => prev ? {
                ...prev,
                stakedAmount: (parseFloat(prev.stakedAmount) + parseFloat(stakeAmount)).toString()
            } : null);
            setStakeAmount("");
        } catch (error: any) {
            setStakingError(error.message || "Failed to stake BERA");
        } finally {
            setIsStaking(false);
        }
    };

    const handleUnbond = async () => {
        setStakingError(null);
        setIsUnbonding(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            setStakingInfo(prev => prev ? {
                ...prev,
                stakedAmount: (parseFloat(prev.stakedAmount) - parseFloat(unbondAmount)).toString(),
                unbonding: [...prev.unbonding, {
                    amount: unbondAmount,
                    completionTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
                }]
            } : null);
            setUnbondAmount("");
        } catch (error: any) {
            setStakingError(error.message || "Failed to unbond BERA");
        } finally {
            setIsUnbonding(false);
        }
    };

    const handleClaimRewards = async () => {
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            setStakingInfo(prev => prev ? {
                ...prev,
                rewards: "0",
                totalClaimed: (parseFloat(prev.totalClaimed) + parseFloat(prev.rewards)).toString()
            } : null);
        } catch (error: any) {
            setStakingError(error.message || "Failed to claim rewards");
        }
    };

    useEffect(() => {
        const getNetworkId = async () => {
            try {
                const id = await web3.eth.net.getId();
                setNetworkId(Number(id));
            } catch (error) {
                console.error("Error getting network ID:", error);
                setNetworkId(null);
            }
        };
        if (web3) {
            getNetworkId();
        }
    }, [web3]);

    useEffect(() => {
        if (wallet) {
            getBalance();
            fetchTransactions();
            fetchAssets();
            fetchStakingInfo();
        }
    }, [wallet]);

    useEffect(() => {
        const loadTokenBalances = async () => {
            if (wallet && assets) {
                const tokenBalancesPromises = assets.filter(asset => !asset.imageUrl && asset.address)
                    .map(async (asset) => {
                        const balance = await getTokenBalance(asset.address);
                        return { [asset.address]: balance };
                    });

                const balances = await Promise.all(tokenBalancesPromises);
                const balancesObject = Object.assign({}, ...balances);
                setTokenBalances(balancesObject);
            }
        };
        loadTokenBalances();

        const intervalId = setInterval(() => {
            loadTokenBalances();
        }, 10000);

        return () => {
            clearInterval(intervalId);
        };
    }, [assets, wallet]);

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        if (wallet) {
            getBalance();
            intervalId = setInterval(() => {
                getBalance();
            }, 30000);
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [wallet]);

    return (
        <div className="wallet-container">
            <header className="wallet-header">
                <h1 className="wallet-title">🐻 HONEY WALLET 🍯</h1>
                <div className="network-status">
                    {networkId === 80069 ? (
                        <span className="network-connected">Connected to Berachain Artio</span>
                    ) : (
                        <span className="network-warning">
                            ⚠️ Please connect to Berachain Artio Testnet
                        </span>
                    )}
                </div>
            </header>

            {!wallet ? (
                <div className="welcome-section">
                    <h2>Welcome to Honey Wallet</h2>
                    <p>Your gateway to the Berachain ecosystem</p>
                    <button onClick={createWallet} className="create-wallet-btn">
                        Connect Wallet
                    </button>
                </div>
            ) : (
                <div className="wallet-dashboard">
                    <div className="wallet-overview">
                        <div className="wallet-address-container">
                            <div className="address-display">
                                <span className="address-label">Wallet Address</span>
                                <span className="address-value">{wallet.address}</span>
                            </div>
                            <div className="address-actions">
                                <button onClick={copyWalletAddress} className="action-btn">
                                    Copy Address
                                </button>
                                {copySuccess && <span className="copy-success">✔ Copied!</span>}
                            </div>
                        </div>

                        <div className="balance-card">
                            <div className="balance-header">
                                <h3>BERA Balance</h3>
                                <div className="balance-info">
                                    <span className="balance-amount">
                                        {balance !== null ? `${balance} BERA` : 'Loading...'}
                                    </span>
                                    <span className="last-update">
                                        Last updated: {lastUpdate.toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="main-content">
                        <div className="tab-buttons">
                            <button
                                className={`tab-button ${selectedTab === 'assets' ? 'active' : ''}`}
                                onClick={() => setSelectedTab('assets')}
                            >
                                Assets
                            </button>
                            <button
                                className={`tab-button ${selectedTab === 'staking' ? 'active' : ''}`}
                                onClick={() => setSelectedTab('staking')}
                            >
                                Staking
                            </button>
                        </div>

                        {selectedTab === 'assets' ? (
                            <div className="assets-section">
                                <div className="asset-selection">
                                    <button
                                        className={`asset-tab ${selectedAsset === 'tokens' ? 'active' : ''}`}
                                        onClick={() => setSelectedAsset('tokens')}
                                    >
                                        Tokens
                                    </button>
                                    <button
                                        className={`asset-tab ${selectedAsset === 'nfts' ? 'active' : ''}`}
                                        onClick={() => setSelectedAsset('nfts')}
                                    >
                                        NFTs
                                    </button>
                                </div>

                                <div className="asset-display">
                                    {selectedAsset === 'tokens' && (
                                        <div className="tokens-grid">
                                            {assets.filter(asset => !asset.imageUrl && asset.address).map(asset => (
                                                <div key={asset.id} className="token-card">
                                                    <div className="token-info">
                                                        <h4>{asset.name}</h4>
                                                        <p className="token-balance">
                                                            {tokenBalances[asset.address] || '0'} {asset.name}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {selectedAsset === 'nfts' && (
                                        <div className="nft-grid">
                                            {mockNFTs.map(nft => (
                                                <div key={nft.id} className="nft-card">
                                                    <img
                                                        src={nft.imageUrl}
                                                        alt={nft.name}
                                                    />
                                                    <div className="nft-info">
                                                        <h4>{nft.name}</h4>
                                                        <p>{nft.description}</p>
                                                        <span className="nft-rarity">{nft.rarity}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="staking-section">
                                <div className="staking-nav">
                                    <div className="staking-nav-tab active">
                                        <span className="tab-icon">💰</span>
                                        <span className="tab-text">Pool</span>
                                    </div>
                                </div>

                                <div className="staking-content">
                                    <div className="staking-header">
                                        <div className="header-cell">Pool</div>
                                        <div className="header-cell">Protocol</div>
                                        <div className="header-cell">APR</div>
                                        <div className="header-cell">TVL</div>
                                        <div className="header-cell">Action</div>
                                    </div>

                                    <div className="pool-list">
                                        {stakingPools.map((pool, index) => (
                                            <div key={index} className="pool-row">
                                                <div className="pool-cell pool-name">
                                                    <div className="pool-name-content">
                                                        <span className="pool-pair-icons">🍯💰</span>
                                                        <div className="pool-name-details">
                                                            <span className="primary-text">{pool.name}</span>
                                                            <span className="secondary-text">{pool.pair}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="pool-cell protocol">
                                                    <span className="protocol-badge">{pool.protocol}</span>
                                                </div>
                                                <div className="pool-cell apr">
                                                    <div className="apr-display">
                                                        <span className="apr-value">{pool.apr}%</span>
                                                        <span className="apr-label">APR</span>
                                                    </div>
                                                </div>
                                                <div className="pool-cell tvl">
                                                    <div className="tvl-display">
                                                        <span className="tvl-value">${pool.tvl}</span>
                                                        <span className="tvl-label">TVL</span>
                                                    </div>
                                                </div>
                                                <div className="pool-cell action">
                                                    <button className="stake-btn" onClick={() => handleStake()}>
                                                        Stake
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="transaction-section">
                        <div className="send-transaction">
                            <h3>Send BERA</h3>
                            <div className="input-group">
                                <input
                                    type="text"
                                    placeholder="Recipient Address"
                                    value={recipient}
                                    onChange={(e) => setRecipient(e.target.value)}
                                    className="input-field"
                                    disabled={isSending}
                                />
                                <input
                                    type="text"
                                    placeholder="Amount (BERA)"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="input-field"
                                    disabled={isSending}
                                />
                            </div>
                            {txError && (
                                <div className="error-message">
                                    {txError}
                                </div>
                            )}
                            <button
                                onClick={sendTransaction}
                                className="send-btn"
                                disabled={isSending}
                            >
                                {isSending ? "Sending..." : "Send Transaction"}
                            </button>
                        </div>

                        <div className="transaction-history">
                            <h3>Recent Transactions</h3>
                            <div className="transaction-list">
                                {transactions.map((tx, index) => (
                                    <div key={index} className={`transaction-item ${tx.type.toLowerCase()}`}>
                                        <div className="transaction-icon">
                                            {tx.type === 'Sent' ? '📤' : '📥'}
                                        </div>
                                        <div className="transaction-details">
                                            <p className="transaction-amount">{tx.amount}</p>
                                            <p className="transaction-address">
                                                {tx.type === 'Sent' ? `To: ${tx.to}` : `From: ${tx.from}`}
                                            </p>
                                            <span className="transaction-time">
                                                {new Date(tx.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Wallet;