module.exports = {
  /**
   * Networks define how you connect to your ethereum client
   */
  networks: {
    development: {
      host: "127.0.0.1",   // Localhost
      port: 8545,          // Ganache port
      network_id: "*",     // Match any network id
    },
  },

  /**
   * Configure Solidity compiler
   */
  compilers: {
    solc: {
      version: "0.8.21",  // Solidity version
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
};
