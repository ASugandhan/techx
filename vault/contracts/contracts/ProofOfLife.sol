// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract ProofOfLife {

    struct Proof {
        uint256 timestamp;
        bytes32 challengeHash;
        bool isActive;
    }

    mapping(address => Proof) public userProofs;

    uint256 public constant VALIDITY_PERIOD = 5 minutes;

    event ProofMinted(
        address indexed user,
        bytes32 challengeHash,
        uint256 timestamp,
        uint256 expiresAt
    );

    function mintProof(bytes32 _challengeHash) external {
        userProofs[msg.sender] = Proof(
            block.timestamp,
            _challengeHash,
            true
        );

        emit ProofMinted(
            msg.sender,
            _challengeHash,
            block.timestamp,
            block.timestamp + VALIDITY_PERIOD
        );
    }

    function verifyProof(address _user) external view returns (bool) {
        Proof memory proof = userProofs[_user];
        return proof.isActive &&
               block.timestamp <= proof.timestamp + VALIDITY_PERIOD;
    }
}
