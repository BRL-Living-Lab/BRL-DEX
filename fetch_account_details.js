const { web3Provider, oceanConfig } = require("./config");
const Web3 = require("web3");
const web3 = new Web3(web3Provider);

const accounts =  web3.eth.getAccounts();
const publisherAccount = accounts[0];
const consumerAccount = accounts[1];

const balancaePublisher = web3.eth.getBalance(publisherAccount);
const balanceCon = web3.eth.getBalance(consumerAccount); 

const gasPrice =  web3.eth.getGasPrice();

console.log(`publisher balane : ${balancaePublisher}`);
console.log(`consumer balance : ${balanceCon}`);
console.log(`gas price : ${gasPrice} `);