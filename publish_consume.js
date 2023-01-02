// Publish a dataset - NFT + Datatoken

const { NftFactory, ZERO_ADDRESS, ProviderInstance, Datatoken, getHash, Nft, Aquarius, generateDid } = require("@oceanprotocol/lib");
const Web3 = require("web3");
const { SHA256 } = require('crypto-js');

const { web3Provider, oceanConfig } = require("./config");

const web3 = new Web3(web3Provider);
const nft = new Nft(web3);
const datatoken = new Datatoken(web3);

const createDataNFTwithDatatoken = async () => {
  const aquariusUrl = 'http://localhost:5000';
  const Factory = new NftFactory(oceanConfig.erc721FactoryAddress, web3);
  const aquarius = new Aquarius(aquariusUrl);

  const accounts = await web3.eth.getAccounts();
  const publisherAccount = accounts[0];
  const consumerAccount = '0xe08A1dAe983BC701D05E492DB80e0144f8f4b909';
  
  

  const assetUrl = {
    datatokenAddress: "0x0",
    nftAddress: "0x0",
    files: [
      {
        type: "url",
        url: "https://raw.githubusercontent.com/oceanprotocol/testdatasets/main/shs_dataset_test.txt",
        method: "GET",
      },
    ],
  };

  const ddo = {
    "@context": ["https://w3id.org/did/v1"],
    id: "",
    version: "4.1.0",
    chainId: 4,
    nftAddress: "0x0",
    metadata: {
      created: "2021-12-20T14:35:20Z",
      updated: "2021-12-20T14:35:20Z",
      type: "dataset",
      name: "dataset-name",
      description: "Ocean protocol test dataset description",
      author: "oceanprotocol-team",
      license: "MIT",
    },
    services: [
      {
        id: "testFakeId",
        type: "access",
        files: "",
        datatokenAddress: "0x0",
        serviceEndpoint: "http://172.15.0.4:8030",
        timeout: 0,
      },
    ],
  };

  // Define dataNFT parameters
  const nftParams = {
    name: "Data Asset with Datatoken",
    symbol: "BRLData",
    templateIndex: 1,
    tokenURI: "https://jsonkeeper.com/b/W72H",
    transferable: true,
    owner: publisherAccount,
  };

  // Datatoken parameters
  const dtParams = {
    name: "Datatoken",
    symbol: "SDT",
    templateIndex: 2,
    cap: "10000",
    feeAmount: "0",
    // paymentCollector is the address
    paymentCollector: ZERO_ADDRESS,
    feeToken: ZERO_ADDRESS,
    minter: publisherAccount,
    mpFeeAddress: ZERO_ADDRESS,
  };

  // Call a Factory.createNFT(...) which will create a new dataNFT
  const result = await Factory.createNftWithDatatoken(
    publisherAccount,
    nftParams,
    dtParams
  );

  const numOfToken = await Factory.getCurrentTokenCount();
  const numOfNFTToken = await Factory.getCurrentNFTCount();
  console.log(`number of token count from this factory: ${numOfToken}`);
  console.log(`number of NFT token: ${numOfNFTToken}`);

  const nftAddress = result.events.NFTCreated.returnValues[0];
  const datatokenAddress = result.events.TokenCreated.returnValues[0];

  const providerUrl = 'http://localhost:8030';
  
  
  // create the files encrypted string
  assetUrl.datatokenAddress = datatokenAddress;
  assetUrl.nftAddress = nftAddress;
  let providerResponse = await ProviderInstance.encrypt(assetUrl, providerUrl);
  ddo.services[0].files = await providerResponse;
  ddo.services[0].datatokenAddress = datatokenAddress;
  // update ddo and set the right did
  ddo.nftAddress = nftAddress;
  const chain = await web3.eth.getChainId();
  // ddo.id =
  //   "did:op:" +
  //   SHA256(web3.utils.toChecksumAddress(nftAddress) + chain.toString(10));

  ddo.id = generateDid(nftAddress, chain);

  providerResponse = await ProviderInstance.encrypt(ddo, providerUrl);
  const encryptedResponse = await providerResponse;
  const metadataHash = getHash(JSON.stringify(ddo));

  await nft.setMetadata(
    nftAddress,
    publisherAccount,
    0,
    providerUrl,
    "",
    "0x2",
    encryptedResponse,
    "0x" + metadataHash
  );

  const resolvedDDO = await aquarius.waitForAqua(ddo.id);
//   assert(resolvedDDO, "Cannot fetch DDO from Aquarius");


  // mint 1 Datatoken and send it to the consumer

  // Get current datatoken balance of receiver
  let receiverBalance = await datatoken.balance(
    datatokenAddress,
    consumerAccount
  );
  console.log(`Receiver balance before mint for data nft ${datatokenAddress}: ${receiverBalance}`);

  await datatoken.mint(
    datatokenAddress,
    publisherAccount,
    "1",
    consumerAccount
  );

  // Get new datatoken balance of receiver
  receiverBalance = await datatoken.balance(
    datatokenAddress,
    consumerAccount
  );
  console.log(`Receiver balance after mint for data nft ${datatokenAddress}: ${receiverBalance}`);

  // initialize provider
  const initializeData = await ProviderInstance.initialize(
    resolvedDDO.id,
    resolvedDDO.services[0].id,
    0,
    consumerAccount,
    providerUrl
  );

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

  try {
    await downloadFile(downloadURL);
  } catch (e) {
    assert.fail("Download failed");
  }

  return {
    nftAddress,
    datatokenAddress,
  };
};

// Call the createFRE() function
createDataNFTwithDatatoken()
  .then(({ nftAddress, datatokenAddress }) => {
    console.log(`DataNft address ${nftAddress}`);
    console.log(`Datatoken address ${datatokenAddress}`);
    process.exit(1);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });