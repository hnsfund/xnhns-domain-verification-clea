const { Requester, Validator } = require('@chainlink/external-adapter')
const { NodeClient } = require('hs-client');
const { Network } = require('hsd');
const network = Network.get(process.env.HSD_NETWORK);

const clientOptions = {
  host: process.env.HSD_HOST || '127.0.0.1', // default to local resolver
  port: network.rpcPort,
  apiKey: process.env.HSD_API_KEY
}

const client = new NodeClient(clientOptions);

// ChainLink external adapter to verify Handshake Domains from other blockchains
// Checks TXT and NS records according to HIP05
// https://github.com/handshake-org/HIPs/pull/10

const customParams = {
  tld: true,
  namespace: true, // TODO change bc confusing using NS for namespace and nameserver.
  registry: true,
}
const NULL_ADDRESS = Number(0).toString(16); // null address 0x0 in bytes for ethereum
const INVALID_TLD_RESPONSE = { status: 200, data: { result: NULL_ADDRESS } }

const createRequest = async (input, callback) => {
  // The Validator helps you validate the Chainlink request data
  const validator = new Validator(callback, input, customParams)
  const jobRunID = validator.validated.id
  const { tld, namespace, registry } = validator.validated.data
  const claimPrefix = 'xnhns=',
        nsSuffix = `._${namespace}.`;

  console.log('retrieving txt records for tld...', tld, namespace);

  const result = await client.execute('getnameresource', [ tld ]);
  if(!result) // tld does not exist
    return callback(INVALID_TLD_RESPONSE.status, INVALID_TLD_RESPONSE)

  if(!xnhnsClaimRecord) // tld not claimed
    return callback(INVALID_TLD_RESPONSE.status, INVALID_TLD_RESPONSE)
  
  console.log('checking correct NS before confirmig addr...');
  const nsRecords = result.records.filter(r => r.type === "NS")
  if(nsRecords.length > 1) {
    // can only delegate to one NS, invalid TLD
    return callback(
      INVALID_TLD_RESPONSE.status,
      Requester.success(jobRunID, INVALID_TLD_RESPONSE)
    )
  }

  console.log('NS record ', nsRecords);

  if(!nsRecords[0].ns === registry + nsSuffix) {
    return callback(
      INVALID_TLD_RESPONSE.status,
      Requester.success(jobRunID, INVALID_TLD_RESPONSE)
    )
  }

  const xnhnsClaimRecord = result.records.find(r =>
    r.type == "TXT" &&
    r.txt[0].startsWith(claimPrefix) &&
    r.txt[0].endsWith(nsSuffix))
  
  console.log('claim record : ', xnhnsClaimRecord);

  // pull network address from inbetweeen standard config
  const claimAddr = xnhnsClaimRecord.txt[0].slice(
    claimPrefix.length,
    nsSuffix.length * -1 // cutoff end of string
  )
  console.log('claim addr : ', claimAddr);
  
  const validResponse = { status: 200, data: { result: claimAddr } }
  return callback(validResponse.status, Requester.success(jobRunID, validResponse))
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
