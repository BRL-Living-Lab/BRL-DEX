// To get the number of tokens and NFT in the factory
const { NftFactory } = require('@oceanprotocol/lib');
const Web3 = require('web3');
const { SHA256 } = require('crypto-js');
const { web3Provider, oceanConfig } = require('./config');

const web3 = new Web3(web3Provider);

const getInfo = async () => {

    const Factory = new NftFactory(oceanConfig.erc721FactoryAddress, web3);
  
    const accounts = await web3.eth.getAccounts();
    const publisherAccount = accounts[0];
  
    const numOfToken = await Factory.getCurrentTokenCount();
    const numOfNFTToken = await Factory.getCurrentNFTCount();
    const chainId = oceanConfig.chainId;
    console.log( `number of token count from this factory: ${numOfToken}`)
    console.log( `number of NFT token: ${numOfNFTToken}`)
    console.log( `chainId: ${chainId}`)

    
    return;
  };
getInfo()
.then(() => {
  process.exit(1);

})
.catch((err) => {
  console.error(err);
  process.exit(1);
});