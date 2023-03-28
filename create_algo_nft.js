const {
    NftFactory,
    generateDid,
    Aquarius,
    ProviderInstance,
    getHash,
    Nft,
    ZERO_ADDRESS,
    approveWei,
    calculateEstimatedGas,
    sendTx,
    transfer,
    Datatoken,
    sleep,
} = require("@oceanprotocol/lib");
const Web3 = require("web3");

// Note: Make sure .env file and config.js are created and setup correctly
const { web3Provider, oceanConfig } = require("./config");

const web3 = new Web3(web3Provider);

const aquarius = new Aquarius(oceanConfig.metadataCacheUri);
const datatoken = new Datatoken(web3);

const DATASET_ASSET_URL = {
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

const ALGORITHM_ASSET_URL = {
    datatokenAddress: "0x0",
    nftAddress: "0x0",
    files: [
        {
            type: "url",
            url: "https://raw.githubusercontent.com/oceanprotocol/test-algorithm/master/javascript/algo.js",
            method: "GET",
        },
    ],
};

const DATASET_DDO = {
    "@context": ["https://w3id.org/did/v1"],
    id: "",
    version: "4.1.0",
    chainId: 5,
    nftAddress: "0x0",
    metadata: {
        created: "2021-12-20T14:35:20Z",
        updated: "2021-12-20T14:35:20Z",
        type: "dataset",
        name: "dataset-name",
        description: "Ocean protocol test dataset description",
        author: "oceanprotocol-team",
        license: "https://market.oceanprotocol.com/terms",
        additionalInformation: {
            termsAndConditions: true,
        },
    },
    services: [
        {
            id: "notAnId",
            type: "compute",
            files: "",
            datatokenAddress: "0xa15024b732A8f2146423D14209eFd074e61964F3",
            serviceEndpoint: "https://v4.provider.goerli.oceanprotocol.com/",
            timeout: 3000,
            compute: {
                publisherTrustedAlgorithmPublishers: [],
                publisherTrustedAlgorithms: [],
                allowRawAlgorithm: true,
                allowNetworkAccess: true,
            },
        },
    ],
};

const ALGORITHM_DDO = {
    "@context": ["https://w3id.org/did/v1"],
    id: "",
    version: "4.1.0",
    chainId: 5,
    nftAddress: "0x0",
    metadata: {
        created: "2021-12-20T14:35:20Z",
        updated: "2021-12-20T14:35:20Z",
        type: "algorithm",
        name: "algorithm-name",
        description: "Ocean protocol test algorithm description",
        author: "oceanprotocol-team",
        license: "https://market.oceanprotocol.com/terms",
        additionalInformation: {
            termsAndConditions: true,
        },
        algorithm: {
            container: {
                entrypoint: "node $ALGO",
                image: "node",
                tag: "alpine:3.16",
                checksum: "sha256:d7c1c5566f2eb09a6f16044174f285f3e0d0073a58bfd2f188c71a6decb5fc15",
            },
        },
    },
    services: [
        {
            id: "notAnId",
            type: "access",
            files: "",
            datatokenAddress: "0xa15024b732A8f2146423D14209eFd074e61964F3",
            serviceEndpoint: "https://v4.provider.goerli.oceanprotocol.com/",
            timeout: 3000,
        },
    ],
};

const createAsset = async (name, symbol, owner, assetUrl, ddo, providerUrl) => {
    const nft = new Nft(web3);
    const Factory = new NftFactory(oceanConfig.nftFactoryAddress, web3);
    const chain = oceanConfig.chainId;
    ddo.chainId = chain;

    const nftParamsAsset = {
        name,
        symbol,
        templateIndex: 1,
        tokenURI: "aaa",
        transferable: true,
        owner,
    };
    const datatokenParams = {
        templateIndex: 1,
        cap: "100000",
        feeAmount: "0",
        paymentCollector: ZERO_ADDRESS,
        feeToken: ZERO_ADDRESS,
        minter: owner,
        mpFeeAddress: ZERO_ADDRESS,
    };

    const result = await Factory.createNftWithDatatoken(owner, nftParamsAsset, datatokenParams);

    // console.log(web3.eth.abi.decodeLog);

    // console.dir(result, { depth: null });

    const nftAddress = result.events.NFTCreated.returnValues[0];
    const datatokenAddressAsset = result.events.TokenCreated.returnValues[0];
    ddo.nftAddress = web3.utils.toChecksumAddress(nftAddress);
    console.log({ nftAddress });

    assetUrl.datatokenAddress = datatokenAddressAsset;
    assetUrl.nftAddress = ddo.nftAddress;
    let providerResponse = await ProviderInstance.encrypt(assetUrl, providerUrl);
    ddo.services[0].files = await providerResponse;
    ddo.services[0].datatokenAddress = datatokenAddressAsset;
    ddo.services[0].serviceEndpoint = providerUrl;

    ddo.nftAddress = web3.utils.toChecksumAddress(nftAddress);
    ddo.id = generateDid(nftAddress, chain);
    providerResponse = await ProviderInstance.encrypt(ddo, providerUrl);
    const encryptedResponse = await providerResponse;
    const validateResult = await aquarius.validate(ddo);

    // Next you can check if if the ddo is valid by checking if validateResult.valid returned true

    await nft.setMetadata(nftAddress, owner, 0, providerUrl, "", "0x2", encryptedResponse, validateResult.hash);
    return ddo.id;
};

async function handleOrder(order, datatokenAddress, payerAccount, consumerAccount, serviceIndex, consumeMarkerFee) {
    /* We do have 3 possible situations:
       - have validOrder and no providerFees -> then order is valid, providerFees are valid, just use it in startCompute
       - have validOrder and providerFees -> then order is valid but providerFees are not valid, we need to call reuseOrder and pay only providerFees
       - no validOrder -> we need to call startOrder, to pay 1 DT & providerFees
    */
    if (order.providerFee && order.providerFee.providerFeeAmount) {
        await approveWei(
            web3,
            oceanConfig,
            payerAccount,
            order.providerFee.providerFeeToken,
            datatokenAddress,
            order.providerFee.providerFeeAmount
        );
    }
    if (order.validOrder) {
        if (!order.providerFee) return order.validOrder;
        const tx = await datatoken.reuseOrder(datatokenAddress, payerAccount, order.validOrder, order.providerFee);
        return tx.transactionHash;
    }
    const tx = await datatoken.startOrder(
        datatokenAddress,
        payerAccount,
        consumerAccount,
        serviceIndex,
        order.providerFee,
        consumeMarkerFee
    );
    return tx.transactionHash;
}

const run = async () => {
    const accounts = await web3.eth.getAccounts();
    publisherAccount = accounts[0];
    consumerAccount = accounts[1];

    console.log("Accounts:");
    console.log({ publisherAccount, consumerAccount });
    console.log({ oceanConfig });

    // const minAbi = [
    //     {
    //         constant: false,
    //         inputs: [
    //             { name: "to", type: "address" },
    //             { name: "value", type: "uint256" },
    //         ],
    //         name: "mint",
    //         outputs: [{ name: "", type: "bool" }],
    //         payable: false,
    //         stateMutability: "nonpayable",
    //         type: "function",
    //     },
    // ];

    // const tokenContract = new web3.eth.Contract(minAbi, oceanConfig.oceanTokenAddress);

    // console.log({ tokenContract });

    // const estGas = await calculateEstimatedGas(
    //     publisherAccount,
    //     tokenContract.methods.mint,
    //     publisherAccount,
    //     web3.utils.toWei("1000")
    // );

    // console.log({ estGas });

    // await sendTx(
    //     publisherAccount,
    //     estGas,
    //     web3,
    //     1,
    //     tokenContract.methods.mint,
    //     publisherAccount,
    //     web3.utils.toWei("1000")
    // );

    // await transfer(web3, oceanConfig, publisherAccount, oceanConfig.oceanTokenAddress, consumerAccount, "100");

    console.log("Creating Data NFT and Token:");

    let datasetId;
    try {
        datasetId = await createAsset(
            "D1Min",
            "D1M",
            publisherAccount,
            DATASET_ASSET_URL,
            DATASET_DDO,
            oceanConfig.providerUri
        );
    } catch (error) {
        console.dir(error, { depth: null });
    }

    console.log(`Data NFT did: ${datasetId}`);

    console.log("Creating Algorithm NFT and Token:");
    algorithmId = await createAsset(
        "D1Min",
        "D1M",
        consumerAccount,
        ALGORITHM_ASSET_URL,
        ALGORITHM_DDO,
        oceanConfig.providerUri
    );

    console.log(`Algorithm NFT did: ${algorithmId}`);

    console.log(ALGORITHM_DDO, DATASET_DDO);
    resolvedDatasetDdo = await aquarius.waitForAqua(datasetId);
    resolvedAlgorithmDdo = await aquarius.waitForAqua(algorithmId);

    console.log("DDOs resolved");

    console.log({ resolvedDatasetDdo });
    console.log({ resolvedAlgorithmDdo });

    console.log("Minting Data tokens");
    const txr1 = await datatoken.mint(
        resolvedDatasetDdo.services[0].datatokenAddress,
        publisherAccount,
        "10",
        consumerAccount
    );
    console.log("Minted Data tokens");
    console.log({ txr1 });

    console.log("Minting Data tokens");
    const txr2 = await datatoken.mint(
        resolvedDatasetDdo.services[0].datatokenAddress,
        publisherAccount,
        "10",
        publisherAccount
    );
    console.log("Minted Data tokens");
    console.log({ txr2 });

    console.log("Minting Algorithm tokens");
    const txr3 = await datatoken.mint(
        resolvedAlgorithmDdo.services[0].datatokenAddress,
        consumerAccount,
        "10",
        consumerAccount
    );
    console.log("Minted Algorithm tokens");
    console.log({ txr3 });

    const txr4 = await datatoken.mint(
        resolvedAlgorithmDdo.services[0].datatokenAddress,
        consumerAccount,
        "10",
        publisherAccount
    );
    console.log("Minted Algorithm tokens");
    console.log({ txr4 });

    console.log([resolvedDatasetDdo.datatokens]);
    console.log(resolvedAlgorithmDdo.datatokens);

    const consumerTokenBalance = await datatoken.balance(resolvedDatasetDdo.datatokens[0].address, consumerAccount);
    console.log(consumerTokenBalance);

    console.log("Compute Environments:", oceanConfig.providerUri);
    computeEnvs = await ProviderInstance.getComputeEnvironments(oceanConfig.providerUri);
    console.log(computeEnvs);

    const computeEnv = computeEnvs.find((ce) => ce.priceMin === 0);
    console.log("Free compute environment = ", computeEnv);

    const paidComputeEnv = computeEnvs.find((ce) => ce.priceMin != 0);
    console.log("Paid compute environment = ", paidComputeEnv);

    const mytime = new Date();
    const computeMinutes = 5;
    mytime.setMinutes(mytime.getMinutes() + computeMinutes);
    const computeValidUntil = Math.floor(mytime.getTime() / 1000);

    const assets = [
        {
            documentId: resolvedDatasetDdo.id,
            serviceId: resolvedDatasetDdo.services[0].id,
        },
    ];
    const dtAddressArray = [resolvedDatasetDdo.services[0].datatokenAddress];
    const algo = {
        documentId: resolvedAlgorithmDdo.id,
        serviceId: resolvedAlgorithmDdo.services[0].id,
    };
    // const txr3 = await datatoken.transfer(
    //     resolvedDatasetDdo.datatokens[0].address,
    //     paidComputeEnv.consumerAddress,
    //     "1",
    //     consumerAccount
    // );
    // console.log({ txr3 });

    // const consumerTokenBalancePostTransfer = await datatoken.balance(
    //     resolvedDatasetDdo.datatokens[0].address,
    //     consumerAccount
    // );
    // console.log({ consumerTokenBalancePostTransfer });
    // const providerTokenBalance = await datatoken.balance(
    //     resolvedDatasetDdo.datatokens[0].address,
    //     paidComputeEnv.consumerAddress
    // );
    // console.log({ providerTokenBalance });

    const providerInitializeComputeResults = await ProviderInstance.initializeCompute(
        assets,
        algo,
        computeEnv.id,
        computeValidUntil,
        oceanConfig.providerUri,
        consumerAccount
    );

    console.dir(resolvedDatasetDdo, { depth: null });
    console.dir(resolvedAlgorithmDdo, { depth: null });

    console.log({ providerInitializeComputeResults });

    console.log(await datatoken.balance(resolvedDatasetDdo.datatokens[0].address, consumerAccount));
    console.log(await datatoken.balance(resolvedAlgorithmDdo.datatokens[0].address, consumerAccount));
    console.log(await datatoken.balance(resolvedDatasetDdo.datatokens[0].address, publisherAccount));
    console.log(await datatoken.balance(resolvedAlgorithmDdo.datatokens[0].address, publisherAccount));

    algo.transferTxId = await handleOrder(
        providerInitializeComputeResults.algorithm,
        resolvedAlgorithmDdo.services[0].datatokenAddress,
        consumerAccount,
        computeEnv.consumerAddress,
        0
    );
    console.log({ algo });

    for (let i = 0; i < providerInitializeComputeResults.datasets.length; i++) {
        assets[i].transferTxId = await handleOrder(
            providerInitializeComputeResults.datasets[i],
            dtAddressArray[i],
            consumerAccount,
            computeEnv.consumerAddress,
            0
        );
    }

    console.log({ assets });

    const computeJobs = await ProviderInstance.computeStart(
        oceanConfig.providerUri,
        web3,
        consumerAccount,
        computeEnv.id,
        assets[0],
        algo
    );

    computeJobId = computeJobs[0].jobId;

    console.log({ providerInitializeComputeResults });
    console.log({ computeJobId });
    console.log({ computeJobs });

    let jobStatus = await ProviderInstance.computeStatus(
        oceanConfig.providerUri,
        consumerAccount,
        computeJobId,
        DATASET_DDO.id
    );

    console.log("Current status of the compute job: ", jobStatus);

    await sleep(5000);

    jobStatus = await ProviderInstance.computeStatus(
        oceanConfig.providerUri,
        consumerAccount,
        computeJobId,
        DATASET_DDO.id
    );

    console.log("Current status of the compute job: ", jobStatus);
    console.log(jobStatus[0].results);

    const downloadURL = await ProviderInstance.getComputeResultUrl(
        oceanConfig.providerUri,
        web3,
        consumerAccount,
        computeJobId,
        0
    );

    console.log(`Compute results URL: ${downloadURL}`);

    console.log(await datatoken.balance(resolvedDatasetDdo.datatokens[0].address, consumerAccount));
    console.log(await datatoken.balance(resolvedAlgorithmDdo.datatokens[0].address, consumerAccount));
    console.log(await datatoken.balance(resolvedDatasetDdo.datatokens[0].address, publisherAccount));
    console.log(await datatoken.balance(resolvedAlgorithmDdo.datatokens[0].address, publisherAccount));
    /*
     */
};

run().then(() => {
    console.log("completed");
    process.exit();
});
