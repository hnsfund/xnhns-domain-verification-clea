const { Requester, Validator } = require('@chainlink/external-adapter')
const hdns = require('hdns');

const customParams = {
  domain: true,
  ns: true,
  nonce: true,
  noncePrefix: true
}

const createRequest = (input, callback) => {
  // The Validator helps you validate the Chainlink request data
  const validator = new Validator(callback, input, customParams)
  const jobRunID = validator.validated.id
  const { domain, registrySubdomain, nonce, noncePrefix } = validator.validated.data
  const fullDomain = registrySubdomain + domain
  console.log('retrieving txt records for domain - ', fullDomain);
  hdns.resolveTxt()
    .then((records) => {
      console.log('searching txt records for nonce - ', noncePrefix + nonce);
      console.log('all txt records - ', records);
      // parse 2d array of txt record sets for nonce
      const hasNonce = Boolean(records.find((txts) => txts.find(txt => txt === noncePrefix + nonce))[0])
      console.log('has nonce? ', hasNonce);

      const response = { status: 200, data: { result: hasNonce } }
      callback(response.status, Requester.success(jobRunID, response))
    })
    .catch((err) => {
      console.log('error retrieving txt records - ', err);
      // if dns lookup was successful but nor TXT records were found
      if(err.code === dns.NOTFOUND || err.code == dns.NODATA) {
        const response = { status: 200, data: { result: false } }
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
