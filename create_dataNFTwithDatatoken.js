const { NftFactory } = require('@oceanprotocol/lib');
const Web3 = require('web3');

const { web3Provider, oceanConfig } = require('./config');

const web3 = new Web3(web3Provider);

const createDataNFTwithDatatoken = async () => {

    const Factory = new NftFactory(oceanConfig.erc721FactoryAddress, web3);
  
    const accounts = await web3.eth.getAccounts();
    const publisherAccount = accounts[0];
  
    console.log(`publisher account : ${publisherAccount}`);
  
    // Define dataNFT parameters
    const nftParams = {
      name: 'Data Asset with Datatoken',
      symbol: 'BRLData',
      templateIndex: 1,
      tokenURI: 'https://jsonkeeper.com/b/W72H',
      transferable: true,
      owner: publisherAccount
    };

    // Datatoken parameters
    const dtParams = {
        name: "Datatoken",
        symbol: "SDT",
        templateIndex: 2,
        cap: '4',
        feeAmount: '0',
        // paymentCollector is the address
        paymentCollector: '0x0000000000000000000000000000000000000000',
        feeToken: '0x0000000000000000000000000000000000000000',
        minter: publisherAccount,
        mpFeeAddress: '0x0000000000000000000000000000000000000000'
      };
  
    // Call a Factory.createNFT(...) which will create a new dataNFT
    const result = await Factory.createNftWithDatatoken(
      publisherAccount,
      nftParams,
      dtParams
    );
  
    const numOfToken = await Factory.getCurrentTokenCount();
    const numOfNFTToken = await Factory.getCurrentNFTCount();
    console.log( `number of token count from this factory: ${numOfToken}`)
    console.log( `number of NFT token: ${numOfNFTToken}`)

    const erc721Address = result.events.NFTCreated.returnValues[0];
    const datatokenAddress = result.events.TokenCreated.returnValues[0];
  
    return {
      erc721Address,
      datatokenAddress
    };
  };

  // Call the createFRE() function 
createDataNFTwithDatatoken()
.then(({ erc721Address, datatokenAddress }) => {
  console.log(`DataNft address ${erc721Address}`);
  console.log(`Datatoken address ${datatokenAddress}`);
  process.exit(1);

})
.catch((err) => {
  console.error(err);
  process.exit(1);
});