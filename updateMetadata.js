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
  const dataNftAddress = '0xFa3E4b9d88B9005FDd78fC14b1f45bb280d6D66e'

  const did = generateDid(dataNftAddress, oceanConfig.chainId);
  console.log(did);

  // This function takes did as a parameter and updates the data NFT information
  const setMetadata = async (did) => {
    const accounts = await web3.eth.getAccounts();
    const publisherAccount = accounts[0];
    
    // Fetch ddo from Aquarius
    const ddo = await aquarius.resolve(did);
  
    // update the ddo here
    ddo.metadata.name = "Dataset updation name v2";
    ddo.metadata.description = "Description updating v2";
    ddo.metadata.tags = ["new tag1", "new tag2"];
  
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

    const s = nft.getNftPermissions('0x3C3F437B3338ab71887c1CEBe240B44e5a4f806f', publisherAccount);
  
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