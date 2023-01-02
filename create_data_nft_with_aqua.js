// Import dependencies
const {
    NftFactory,
    generateDid,
    Aquarius,
    ProviderInstance,
    getHash,
    Nft,
    ZERO_ADDRESS,
} = require("@oceanprotocol/lib");
const Web3 = require("web3");

// Note: Make sure .env file and config.js are created and setup correctly
const { web3Provider, oceanConfig } = require("./config");

const web3 = new Web3(web3Provider);

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
    chainId: oceanConfig.chainId,
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

// Deinfe a function which will create a dataNFT using Ocean.js library
const createDataNFT = async () => {
    // Create a NFTFactory
    const Factory = new NftFactory(oceanConfig.erc721FactoryAddress, web3);

    console.log(oceanConfig.metadataCacheUri);
    aquarius = new Aquarius(oceanConfig.metadataCacheUri);

    const accounts = await web3.eth.getAccounts();
    const publisherAccount = accounts[0];

    // Define dataNFT parameters
    const nftParams = {
        name: "72120Bundle",
        symbol: "72Bundle",
        // Optional parameters
        templateIndex: 1,
        tokenURI: "https://example.com",
        transferable: true,
        owner: publisherAccount,
    };

    const datatokenParams = {
        templateIndex: 1,
        cap: "100000",
        feeAmount: "0",
        paymentCollector: ZERO_ADDRESS,
        feeToken: ZERO_ADDRESS,
        minter: publisherAccount,
        mpFeeAddress: ZERO_ADDRESS,
    };

    // Call a Factory.createNFT(...) which will create a new dataNFT
    // const erc721Address = await Factory.createNFT(publisherAccount, nftParams);
    const tx = await Factory.createNftWithDatatoken(publisherAccount, nftParams, datatokenParams);
    const erc721Address = tx.events.NFTCreated.returnValues[0];
    const datatokenAddress = tx.events.TokenCreated.returnValues[0];

    return {
        erc721Address,
        datatokenAddress,
    };
};

// Call the create createDataNFT() function
createDataNFT()
    .then(async ({ erc721Address, datatokenAddress }) => {
        console.log(`DataNft address ${erc721Address}`);
        did = generateDid(erc721Address, oceanConfig.chainId);
        console.log(did, oceanConfig.network);
        // const ddo = await aquarius.resolve(did);
        // console.log(ddo);

        assetUrl.nftAddress = erc721Address;
        let providerResponse = await ProviderInstance.encrypt(assetUrl, oceanConfig.providerUri);
        ddo.services[0].files = await providerResponse;
        ddo.services[0].datatokenAddress = datatokenAddress;
        // update ddo and set the right did
        ddo.nftAddress = erc721Address;
        const chain = await web3.eth.getChainId();
        ddo.id = did;

        providerResponse = await ProviderInstance.encrypt(ddo, oceanConfig.providerUri);
        const encryptedResponse = await providerResponse;

        console.log(encryptedResponse);
        const metadataHash = getHash(JSON.stringify(ddo));
        const nft = new Nft(web3);

        const accounts = await web3.eth.getAccounts();
        const publisherAccount = accounts[0];
        await nft.setMetadata(
            erc721Address,
            publisherAccount,
            0,
            "http://172.15.0.4:8030",
            "",
            "0x2",
            encryptedResponse,
            "0x" + metadataHash
        );

        const resolvedDDO = await aquarius.waitForAqua(ddo.id);
        console.log(resolvedDDO);
        process.exit();
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
