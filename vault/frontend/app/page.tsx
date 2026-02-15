"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/lib/contract";
import WebcamVerifier from "@/components/WebcamVerifier";

export default function Home() {
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("Ready");
  const [loading, setLoading] = useState(false);
  const [humanVerified, setHumanVerified] = useState(false);
  const [livenessScore, setLivenessScore] = useState<number | null>(null);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask");
      return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();

    const address = await signer.getAddress();
    setAccount(address);
    setStatus("✅ Wallet connected");
  };

  const handleVerified = (score: number) => {
    setHumanVerified(true);
    setLivenessScore(score);
    setStatus("✅ Human verified (valid for 5 minutes)");
  };

  const mintProof = async () => {
    try {
      if (!window.ethereum) {
        alert("MetaMask not found");
        return;
      }

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

        {!humanVerified && (
          <>
            <p className="text-center text-sm text-gray-300">
              Verify you are human
            </p>
            <WebcamVerifier onVerified={handleVerified} />
          </>
        )}

        {humanVerified && (
          <div className="bg-gray-800 p-4 rounded text-center">
            <p className="text-green-400 font-bold mb-1">
              Verification Complete
            </p>
            <p className="text-2xl font-bold">
              {livenessScore} / 100
            </p>
            <p className="text-xs text-gray-400">
              Liveness Score
            </p>
          </div>
        )}

        {humanVerified && !account && (
          <button
            onClick={connectWallet}
            className="w-full py-3 bg-green-600 rounded font-bold"
          >
            Get Portable Proof
          </button>
        )}

        {account && (
          <p className="text-xs break-all text-gray-400 text-center">
            {account}
          </p>
        )}

        {humanVerified && account && (
          <button
            onClick={mintProof}
            disabled={loading}
            className="w-full py-3 bg-purple-600 rounded font-bold disabled:bg-gray-600"
          >
            {loading ? "Minting..." : "Mint Proof of Life"}
          </button>
        )}

        <p className="text-center text-sm text-gray-300">
          {status}
        </p>
      </div>
    </main>
  );
}