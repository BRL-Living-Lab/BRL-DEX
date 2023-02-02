// Import dependencies
const {
    Nft,
    ProviderInstance,
    getHash,
    Aquarius,
    generateDid,
    downloadFile,  
    NftFactory, 
    calculateEstimatedGas, 
    sendTx, 
    ZERO_ADDRESS,
    Datatoken,
    sleep
  } = require('@oceanprotocol/lib');
  const { SHA256 } = require('crypto-js');
  const Web3 = require('web3');
  const { web3Provider, oceanConfig } = require('./config');
  
  // Create a web3 instance
  const web3 = new Web3(web3Provider);
  const datatoken = new Datatoken(web3);
  
  // Create Aquarius instance
  const aquarius = new Aquarius(oceanConfig.metadataCacheUri);
  const nft = new Nft(web3, 8996);
  const providerUrl = oceanConfig.providerUri;
  
  // replace the datanft address here
  const dataNftAddress = '0x1133eC73a537f5dA8092F72b3056d1c7bE680add';
  const datatokenAddress =  '0x3517C6eAED27FBE0792a76311e44B71757a378A7';

  const did = generateDid(dataNftAddress, oceanConfig.chainId);
  console.log(did);

  // This function takes did as a parameter and updates the data NFT information
  const downloadAssetDeny = async () => {
    const accounts = await web3.eth.getAccounts();
    const publisherAccount = accounts[0];
    const consumerAccount = accounts[1];
    
    // Fetch ddo from Aquarius
    const ddo = await aquarius.resolve(did);
  
    // update the ddo here
    ddo.metadata.name = "Dataset updated with Deny";
    ddo.metadata.description = "Consumer added in deny list";

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
    
    await sleep(5000);
    // Check if ddo is correctly udpated in Aquarius 
    const resolvedDDO =  await aquarius.waitForAqua(ddo.id);
  
    console.log(resolvedDDO);

    // Get current datatoken balance of receiver
  let receiverBalance = await datatoken.balance(
    datatokenAddress,
    consumerAccount
  );
  console.log(`Receiver balance before mint for data nft ${datatokenAddress}: ${receiverBalance}`);


  // initialize provider

 
  const initializeData = await ProviderInstance.initialize(
    resolvedDDO.id,
    resolvedDDO.services[0].id,
    0,
    consumerAccount,
    providerUrl
  );

  if (initializeData.error)
    throw (initializeData.error);


 

  const providerFees = {
    providerFeeAddress: initializeData.providerFee.providerFeeAddress,
    providerFeeToken: initializeData.providerFee.providerFeeToken,
    providerFeeAmount: initializeData.providerFee.providerFeeAmount,
    v: initializeData.providerFee.v,
    r: initializeData.providerFee.r,
    s: initializeData.providerFee.s,
    providerData: initializeData.providerFee.providerData,
    validUntil: initializeData.providerFee.validUntil,
  };

  // make the payment
  const txid = await datatoken.startOrder(
    datatokenAddress,
    consumerAccount,
    consumerAccount,
    0,
    providerFees
  );

  // get the url
  const downloadURL = await ProviderInstance.getDownloadUrl(
    ddo.id,
    consumerAccount,
    ddo.services[0].id,
    0,
    txid.transactionHash,
    providerUrl,
    web3
  );

  
  const d_file = await downloadFile(downloadURL);
  

  receiverBalance = await datatoken.balance(
    datatokenAddress,
    consumerAccount
  );
  console.log(`Receiver balance after downloading file ${datatokenAddress}: ${receiverBalance}`);


  return {
    downloadURL
    
  };
  
  };
  // Call setMetadata(...) function defined above
downloadAssetDeny().then((downloadURL) => {
    process.exit();
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });