const ProofOfLife = artifacts.require("ProofOfLife");

module.exports = function (deployer) {
  deployer.deploy(ProofOfLife);
};
