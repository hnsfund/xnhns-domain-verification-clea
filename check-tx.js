const { Requester, Validator } = require('@chainlink/external-adapter')
const { NodeClient } = require('hs-client');
const { Network } = require('hsd');
const network = Network.get('mainnet');

const clientOptions = {
  host: process.env.HSD_HOST || '127.0.0.1', // default to local resolver
  port: network.rpcPort,
  apiKey: process.env.HSD_API_KEY
}

const client = new NodeClient(clientOptions);


const customParams = {
  to: true,
  from: true,
  tld: false,
  type: true,
}

const findTxWithParams = ({txs, to, type, tld}) => {
  return txs.map((tx) => tx.ouputs.find((data) =>
    data.address === to &&
    data.covenant.action === type &&
    data.covenant.items.contains(tld)
  ))
}

const createRequest = (input, callback) => {
  // The Validator helps you validate the Chainlink request data
  const validator = new Validator(callback, input, customParams)
  const jobRunID = validator.validated.id
  const { to, from, type, tld } = validator.validated.data
  console.log('retrieving txt records for tld - ', tld, to, from, type);

  // turn tld from ENS keccak256 into HNS blake2
  // might require api call to the graph

  // https://hsd-dev.org/api-docs/#get-tx-by-addresses  
  client.getTXByAddress(from)
    .then((result) => {
      console.log(result);
      const hnsTLD = tld;
      const matchingTxs = findTxWithParams({})
    })
    .catch((err) => {
      console.log('error retrieving txt records - ', err);
      // if dns lookup was successful but nor TXT records were found
      if(err.code === dns.NOTFOUND || err.code == dns.NODATA) {
        const response = { status: 200, data: { result: NULL_ADDRESS } }
        callback(response.status, Requester.success(jobRunID, response))
      } else {
        callback(500, Requester.errored(jobRunID, err))
      }
    })
}

// This is a wrapper to allow the function to work with
// GCP Functions
exports.gcpservice = (req, res) => {
  createRequest(req.body, (statusCode, data) => {
    res.status(statusCode).send(data)
  })
}

// This is a wrapper to allow the function to work with
// AWS Lambda
exports.handler = (event, context, callback) => {
  createRequest(event, (statusCode, data) => {
    callback(null, data)
  })
}

// This is a wrapper to allow the function to work with
// newer AWS Lambda implementations
exports.handlerv2 = (event, context, callback) => {
  createRequest(JSON.parse(event.body), (statusCode, data) => {
    callback(null, {
      statusCode: statusCode,
      body: JSON.stringify(data),
      isBase64Encoded: false
    })
  })
}

// This allows the function to be exported for testing
// or for running in express
module.exports.createRequest = createRequest
