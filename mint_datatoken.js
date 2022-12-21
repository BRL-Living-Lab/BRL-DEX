// Import dependencies
const { NftFactory, Datatoken } = require('@oceanprotocol/lib');
const Web3 = require('web3');
const { web3Provider, oceanConfig } = require('./config');

// Create a web3 instance
const web3 = new Web3(web3Provider);

// Change this
const datatokenAddress = "0x0db114153c812a9720a3D21aDaF304e992C0277c"
const receiverAddress = "0x02354A1F160A3fd7ac8b02ee91F04104440B28E7"

// Create a function which will take `datatokenAddress` and `receiverAddress` as parameters 
const mintDatatoken = async (datatokenAddress, receiverAddress) => {
  const accounts = await web3.eth.getAccounts();
  const publisherAccount = accounts[0];

  // Create datatoken instance
  const datatoken = new Datatoken(web3);

  // Get current datatoken balance of receiver
  let receiverBalance = await datatoken.balance(
    datatokenAddress,
    receiverAddress
  );
  console.log(`Receiver balance before mint: ${receiverBalance}`);

  // Mint datatoken
  await datatoken.mint(
    datatokenAddress,
    publisherAccount,
    '4', // number of datatokens sent to the receiver
    receiverAddress
  );

  // Get new datatoken balance of receiver
  receiverBalance = await datatoken.balance(
    datatokenAddress,
    receiverAddress
  );
  console.log(`Receiver balance after mint: ${receiverBalance}`);
};

// Call mintDatatoken(...) function defined above
mintDatatoken(datatokenAddress, receiverAddress)
  .then(() => {
    process.exit((err) => {
      console.error(err);
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });