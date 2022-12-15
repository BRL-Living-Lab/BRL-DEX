// Import dependencies
const { NftFactory, Datatoken } = require('@oceanprotocol/lib');
const Web3 = require('web3');
const { web3Provider, oceanConfig } = require('./config');

// Create a web3 instance
const web3 = new Web3(web3Provider);

// Define a function createFRE()
const createFRE = async () => {
  const Factory = new NftFactory(oceanConfig.erc721FactoryAddress, web3);

  // Get accounts from web3 instance
  const accounts = await web3.eth.getAccounts();
  const publisherAccount = accounts[0];

  // data NFT parameters: name, symbol, templateIndex, etc.
  const nftParams = {
    name: '72120Bundle',
    symbol: '72Bundle',
    templateIndex: 1,
    tokenURI: 'https://example.com',
    transferable: true,
    owner: publisherAccount
  };
  
  // datatoken parameters: name, symbol, templateIndex, etc.
  const erc20Params = {
    name: "Sample datatoken",
    symbol: "SDT",
    templateIndex: 1,
    cap: '100000',
    feeAmount: '0',
    // paymentCollector is the address
    paymentCollector: '0x0000000000000000000000000000000000000000',
    feeToken: '0x0000000000000000000000000000000000000000',
    minter: publisherAccount,
    mpFeeAddress: '0x0000000000000000000000000000000000000000'
  };

  const fixedPriceParams = {
    fixedRateAddress: oceanConfig.fixedRateExchangeAddress,
    baseTokenAddress: oceanConfig.oceanTokenAddress,
    owner: publisherAccount,
    marketFeeCollector: publisherAccount,
    baseTokenDecimals: 18,
    datatokenDecimals: 18,
    fixedRate: '100',
    marketFee: '0',
    // Optional parameters
    // allowedConsumer: publisherAccount,  //  only account that consume the exhchange
    withMint: false // add FixedPriced contract as minter if withMint == true
  }

  // Create data NFT and a datatoken with Fixed Rate exchange
  const result = await Factory.createNftWithDatatokenWithFixedRate(
    publisherAccount,
    nftParams,
    erc20Params,
    fixedPriceParams
  );

  // Get the data NFT address and datatoken address from the result
  const erc721Address = result.events.NFTCreated.returnValues[0];
  const datatokenAddress = result.events.TokenCreated.returnValues[0];

  return {
    erc721Address, //data nft address
    datatokenAddress
  };
};

// Call the createFRE() function 
createFRE()
  .then(({ erc721Address, datatokenAddress }) => {
    console.log(`DataNft address ${erc721Address}`);
    console.log(`Datatoken address ${datatokenAddress}`);
    process.exit(1);

  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });