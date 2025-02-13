import React, { useState } from 'react';
import Web3 from 'web3';
import { Web3Account } from 'web3-eth-accounts';
import './App.css';

const web3 = new Web3(process.env.REACT_APP_RPC_URL);

function App() {
  const [wallet, setWallet] = useState<Web3Account | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState<Uint8Array | string | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const createWallet = () => {
    const newWallet = web3.eth.accounts.create();
    setWallet(newWallet);
    setBalance(null);
    setTxHash(null);
  };

  const getBalance = async () => {
    if (!wallet) return;
    const balanceWei = await web3.eth.getBalance(wallet.address);
    setBalance(web3.utils.fromWei(balanceWei, 'ether'));
  };

  const sendTransaction = async () => {
    if (!wallet || !recipient || !amount) return;

    try {
      const value = web3.utils.toWei(amount, 'ether');
      const gasPrice = await web3.eth.getGasPrice();
      const tx = {
        from: wallet.address,
        to: recipient,
        value,
        gas: 21000,
        gasPrice,
      };

      const signedTx = await web3.eth.accounts.signTransaction(
        tx,
        wallet.privateKey
      );
      const sentTx = await web3.eth.sendSignedTransaction(
        signedTx.rawTransaction
      );

      setTxHash(sentTx.transactionHash);
      getBalance();
    } catch (error) {
      console.error('Transaction Failed:', error);
    }
  };

  const copyPrivateKey = async () => {
    if (wallet) {
      try {
        await navigator.clipboard.writeText(wallet.privateKey);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('복사 실패:', err);
      }
    }
  };

  return (
    <div className="App">
      <h2>🦊 블록체인 지갑</h2>

      {!wallet ? (
        <button onClick={createWallet}>새 지갑 생성</button>
      ) : (
        <div>
          <div className="wallet-info">
            <p className="address-private-section">
              <strong>주소:</strong> {wallet.address}
            </p>
            <div className="private-key-section address-private-section">
              <strong>프라이빗 키:</strong>
              <button onClick={copyPrivateKey} className="copy-btn">
                복사
              </button>
              {copySuccess && <span className="copy-success">✔ 복사됨!</span>}
            </div>
          </div>

          <button onClick={getBalance}>잔액 조회</button>
          {balance !== null && (
            <p>
              <strong>잔액:</strong> {balance} KAIA
            </p>
          )}

          <h3>💸 송금</h3>
          <div className="send-transaction">
            <input
              type="text"
              placeholder="받는 주소"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            <input
              type="text"
              placeholder="보낼 금액 (KAIA)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <button onClick={sendTransaction}>송금</button>

          {txHash && (
            <p>
              ✅ <strong>트랜잭션 해시:</strong>{' '}
              <a
                href={`https://kairos.kaiascan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {txHash}
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
