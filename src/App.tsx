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

const Wallet = () => {
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [stakingInfo, setStakingInfo] = useState<any | null>(null);
  const [selectedTab, setSelectedTab] = useState("assets");
  const [selectedAsset, setSelectedAsset] = useState<'tokens' | 'nfts'>('tokens');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [tokenBalances, setTokenBalances] = useState<{ [tokenAddress: string]: string }>({});
  const [networkId, setNetworkId] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const createWallet = () => {
    // Use the constant wallet instead of creating a new one
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
    const mockTransactions = [
      { type: "Sent", amount: "0.1 ETH", to: "0x1234...abcd" },
      { type: "Received", amount: "0.5 ETH", from: "0xabcd...5678" },
    ];
    setTransactions(mockTransactions);
  };

  const sendTransaction = async () => {
    if (!wallet || !recipient || !amount) return;
    try {
      const value = web3.utils.toWei(amount, 'ether');

      const gasPrice = await web3.eth.getGasPrice();

      // Fetch the nonce for the account to prevent transaction replay
      const nonce = await web3.eth.getTransactionCount(wallet.address, 'pending');

      const tx = {
        from: wallet.address,
        to: recipient,
        value: value,
        gas: 21000,
        gasPrice: gasPrice,  // Use fetched gas price
        nonce: nonce         // Use fetched nonce
      };

      const signedTx = await web3.eth.accounts.signTransaction(
        tx,
        wallet.privateKey
      );

      const sentTx = await web3.eth.sendSignedTransaction(
        signedTx.rawTransaction!
      );

      // Corrected code:
      const transactionHash = typeof sentTx.transactionHash === 'string'
        ? sentTx.transactionHash
        : web3.utils.bytesToHex(sentTx.transactionHash);

      setTxHash(transactionHash);
      getBalance();
    } catch (error: any) {
      console.error('Transaction Failed:', error.message);
      // Handle different types of errors
      if (error.message.includes("Known transaction")) {
        console.warn("Transaction might be already mined or submitted.");
      }
      // Consider more specific error handling, like insufficient funds or invalid address.
    }
  };

  const copyPrivateKey = async () => {
    if (wallet) {
      try {
        await navigator.clipboard.writeText(wallet.privateKey);
      } catch (err) {
        console.error("Copy failed:", err);
      }
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
    const bitcoinImageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/1200px-Bitcoin.svg.png"; // Default Bitcoin image
    const dummyAssets = [
      { id: 1, name: 'Token A', amount: 100, address: '0xYourTokenAAddress' }, // Replace
      { id: 2, name: 'Bitcoin NFT', imageUrl: bitcoinImageUrl, address: '0xYourNFTAddress' }, // Replace
      { id: 3, name: 'Token B', amount: 250, address: '0xYourTokenBAddress' }, // Replace
      { id: 4, name: 'Another Bitcoin NFT', imageUrl: bitcoinImageUrl, address: '0xYourAnotherNFTAddress' },  //Replace
    ];
    setAssets(dummyAssets);
  };

  const fetchStakingInfo = async () => {
    const dummyStakingInfo = { stakedAmount: 500, rewards: 50 };
    setStakingInfo(dummyStakingInfo);
  };

  // Function to fetch token balance using contract address
  const getTokenBalance = async (tokenAddress: string) => {
    if (!wallet) return '0';

    // Standard ERC-20 ABI
    const tokenABI = [
      {
        "constant": true,
        "inputs": [{ "name": "_owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "balance", "type": "uint256" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [{ "name": "", "type": "uint8" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      }
    ];

    try {
      const contract = new web3.eth.Contract(tokenABI as any, tokenAddress);
      const balanceWei = await contract.methods.balanceOf(wallet.address).call();
      const decimals = await contract.methods.decimals().call();

      // Use BigInt for calculations to handle large numbers correctly
      const balance = Number(balanceWei) / (10 ** Number(decimals)); // Adjust for decimals
      return balance.toString();
    } catch (error) {
      console.error(`Error fetching balance for token ${tokenAddress}:`, error);
      return '0';
    }
  };

  // Fetch network ID on component mount
  useEffect(() => {
    const getNetworkId = async () => {
      try {
        const id = await web3.eth.net.getId();
        setNetworkId(Number(id)); // Convert id to number
        console.log("Connected to network:", id);
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

  // Effect to fetch token balances when assets are loaded
  useEffect(() => {
    const loadTokenBalances = async () => {
      if (wallet && assets) {
        const tokenBalancesPromises = assets.filter(asset => !asset.imageUrl && asset.address)
          .map(async (asset) => {
            const balance = await getTokenBalance(asset.address);
            return { [asset.address]: balance };
          });

        const balances = await Promise.all(tokenBalancesPromises);
        const balancesObject = Object.assign({}, ...balances); // Merge balances
        setTokenBalances(balancesObject);
      }
    };
    loadTokenBalances();

    const intervalId = setInterval(() => {
      loadTokenBalances();
    }, 10000); // 10 seconds

    // Cleanup the interval on component unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [assets, wallet]);

  // Set up real-time balance updates
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (wallet) {
      // Initial balance fetch
      getBalance();

      // Set up polling every 30 seconds
      intervalId = setInterval(() => {
        getBalance();
      }, 30000);
    }

    // Cleanup interval on unmount or when wallet changes
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
                              {tokenBalances[asset.address] || '0'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedAsset === 'nfts' && (
                    <div className="nft-grid">
                      {assets.filter(asset => asset.imageUrl).map(asset => (
                        <div key={asset.id} className="nft-card">
                          <img src={asset.imageUrl} alt={asset.name} />
                          <div className="nft-info">
                            <h4>{asset.name}</h4>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="staking-section">
                {stakingInfo && (
                  <div className="staking-cards">
                    <div className="staking-card">
                      <h3>Staked Amount</h3>
                      <p className="staked-amount">{stakingInfo.stakedAmount} BERA</p>
                    </div>
                    <div className="staking-card">
                      <h3>Rewards</h3>
                      <p className="rewards">{stakingInfo.rewards} BERA</p>
                    </div>
                  </div>
                )}
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
                />
                <input
                  type="text"
                  placeholder="Amount (BERA)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input-field"
                />
              </div>
              <button onClick={sendTransaction} className="send-btn">
                Send Transaction
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
                      <p className="transaction-amount">{tx.amount} BERA</p>
                      <p className="transaction-address">
                        {tx.type === 'Sent' ? `To: ${tx.to}` : `From: ${tx.from}`}
                      </p>
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
