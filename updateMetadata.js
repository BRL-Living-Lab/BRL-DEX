// Import dependencies
const {
    Nft,
    ProviderInstance,
    getHash,
    Aquarius,
    generateDid
  } = require('@oceanprotocol/lib');
  const { SHA256 } = require('crypto-js');
  const Web3 = require('web3');
  const { web3Provider, oceanConfig } = require('./config');
  
  // Create a web3 instance
  const web3 = new Web3(web3Provider);
  
  // Create Aquarius instance
  const aquarius = new Aquarius(oceanConfig.metadataCacheUri);
  const nft = new Nft(web3, 8996);
  const providerUrl = oceanConfig.providerUri;
  
  // replace the datanft address here
  const dataNftAddress = '0x1133eC73a537f5dA8092F72b3056d1c7bE680add'

  const did = generateDid(dataNftAddress, oceanConfig.chainId);
  console.log(did);

  // This function takes did as a parameter and updates the data NFT information
  const setMetadata = async (did) => {
    const accounts = await web3.eth.getAccounts();
    const publisherAccount = accounts[0];
    const consumerAccount = accounts[1];
    
    // Fetch ddo from Aquarius
    const ddo = await aquarius.resolve(did);
  
    // update the ddo here
    ddo.metadata.name = "Dataset updation Deny";
    ddo.metadata.description = "Adding Consumer name in Deny";

    ddo.credentials = {
        
      deny: [
        {
          type: "address",
          values: [consumerAccount]
        }
      ]
    }
  
    providerResponse = await ProviderInstance.encrypt(ddo, providerUrl);
    const encryptedResponse = await providerResponse;
    const metadataHash = getHash(JSON.stringify(ddo));
  
    // Update the data NFT metadata
    const res = await nft.setMetadata(
      ddo.nftAddress,
      publisherAccount,
      0,
      "http://172.15.0.4:8030",
      '',
      '0x2',
      encryptedResponse,
      `0x${metadataHash}`
    );
    console.log(res);
  
    // Check if ddo is correctly udpated in Aquarius 
    const resolvedDDO =  await aquarius.waitForAqua(ddo.id);
  
    console.log(resolvedDDO);
  
  };
  // Call setMetadata(...) function defined above
  setMetadata(did).then(() => {
    process.exit();
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });