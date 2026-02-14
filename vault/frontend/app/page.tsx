"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/lib/contract";
import WebcamVerifier from "@/components/WebcamVerifier";

export default function Home() {
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("Wallet not connected");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

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
        JSON.stringify({
          timestamp: Date.now(),
          verified: true,
        })
      );

      const tx = await contract.mintProof(challengeHash);
      await tx.wait();

      setStatus("🎉 Proof of Life Minted Successfully");
      setLoading(false);
    } catch (err) {
      console.error(err);
      setStatus("❌ Transaction failed");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-gray-900 p-8 rounded-xl space-y-6 w-full max-w-md">

        <h1 className="text-3xl font-bold text-center">🔐 The Vault</h1>

        {/* WALLET CONNECT */}
        {!account && (
          <button
            onClick={connectWallet}
            className="w-full py-3 bg-green-600 rounded"
          >
            Connect MetaMask
          </button>
        )}

        {/* ACCOUNT */}
        {account && (
          <p className="text-xs break-all text-gray-400 text-center">
            {account}
          </p>
        )}

        {/* WEBCAM FLOW */}
        {account && !verified && (
          <>
            <p className="text-center text-sm text-gray-300">
              Complete the liveness challenge
            </p>
            <WebcamVerifier onVerified={() => setVerified(true)} />
          </>
        )}

        {/* MINT BUTTON */}
        {account && verified && (
          <button
            onClick={mintProof}
            disabled={loading}
            className="w-full py-3 bg-purple-600 rounded font-bold disabled:bg-gray-600"
          >
            {loading ? "Minting..." : "Mint Proof of Life"}
          </button>
        )}

        {/* STATUS */}
        <p className="text-center text-sm">{status}</p>

      </div>
    </main>
  );
}
