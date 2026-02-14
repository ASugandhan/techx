"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/lib/contract";

export default function Home() {
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("Wallet not connected");
  const [loading, setLoading] = useState(false);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Install MetaMask");
      return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    setAccount(await signer.getAddress());
    setStatus("✅ Wallet connected");
  };

  const mintProof = async () => {
    try {
      setLoading(true);
      setStatus("⏳ Minting Proof of Life...");

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      const challengeHash = ethers.utils.id(
        JSON.stringify({ timestamp: Date.now() })
      );

      const tx = await contract.mintProof(challengeHash);
      await tx.wait();

      setStatus("🎉 Proof of Life Minted");
      setLoading(false);
    } catch (e) {
      setStatus("❌ Transaction failed");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-gray-900 p-8 rounded-xl space-y-6 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center">🔐 The Vault</h1>

        {!account ? (
          <button
            onClick={connectWallet}
            className="w-full py-3 bg-green-600 rounded"
          >
            Connect MetaMask
          </button>
        ) : (
          <>
            <p className="text-xs break-all text-gray-400 text-center">
              {account}
            </p>
            <button
              onClick={mintProof}
              disabled={loading}
              className="w-full py-3 bg-purple-600 rounded disabled:bg-gray-600"
            >
              {loading ? "Minting..." : "Mint Proof of Life"}
            </button>
          </>
        )}

        <p className="text-center">{status}</p>
      </div>
    </main>
  );
}
