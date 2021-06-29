# XNHNS Chainlink NodeJS External Adapter 

## Adapters 
`ns-claim.js` - Used by XNHNS registrars to verify a TLD is following [HIP-05](https://github.com/handshake-org/HIPs/blob/master/HIP-0005.md) and pointed to the appropriate nameserver. If correct it retrieves the ETH address associated with that TLD and submits on chain as the owner.

In the CL job spec we only specify the TLD we want to get an address from, we don't say how to look up that domain or parse the address. This lets nodes create their own implementations for verifying domains (e.g. merkle proofs) so there redundancy in the network.

## Input
```json
{
  "tld": "testingtld",
  "namespace": "eth",
  "registry": "0x36fc69f0983E536D1787cC83f481581f22CCA2A1"
}
```
## Output

```json
{
 "jobRunID": "278c97ffadb54a5bbb93cfec5f7b5503",
 "data": {
  "owner": "0x36fc69f0983E536D1787cC83f481581f22CCA2A1",
  "result": "0x36fc69f0983E536D1787cC83f481581f22CCA2A1"
 },
 "statusCode": 200
}
```

`nonce-challenge` - DEPRECATED. Early TLD verification method before HIP-05 and `ns-claim` adapter.

`check-tx` - Used by XNHNS crosschain NFTLD sales contract to verify a tx with the given parameters was mined on the Handshake blockchain.


## Install Locally

Install dependencies:

```bash
yarn
```

### Test

Run the local tests:

```bash
yarn test
```

Natively run the application (defaults to port 8080):

### Run

```bash
yarn start
```

## Call the external adapter/API server

```bash
curl -X POST -H "content-type:application/json" "http://localhost:8080/" --data '{ "id": 0, "data": { "from": "ETH", "to": "USD" } }'
```

## Docker

If you wish to use Docker to run the adapter, you can build the image by running the following command:

```bash
docker build . -t external-adapter
```

Then run it with:

```bash
docker run -p 8080:8080 -it external-adapter:latest
```

## Serverless hosts

After [installing locally](#install-locally):

### Create the zip

```bash
zip -r external-adapter.zip .
```

### Install to AWS Lambda

- In Lambda Functions, create function
- On the Create function page:
  - Give the function a name
  - Use Node.js 12.x for the runtime
  - Choose an existing role or create a new one
  - Click Create Function
- Under Function code, select "Upload a .zip file" from the Code entry type drop-down
- Click Upload and select the `external-adapter.zip` file
- Handler:
    - index.handler for REST API Gateways
    - index.handlerv2 for HTTP API Gateways
- Add the environment variable (repeat for all environment variables):
  - Key: API_KEY
  - Value: Your_API_key
- Save

#### To Set Up an API Gateway (HTTP API)

If using a HTTP API Gateway, Lambda's built-in Test will fail, but you will be able to externally call the function successfully.

- Click Add Trigger
- Select API Gateway in Trigger configuration
- Under API, click Create an API
- Choose HTTP API
- Select the security for the API
- Click Add

#### To Set Up an API Gateway (REST API)

If using a REST API Gateway, you will need to disable the Lambda proxy integration for Lambda-based adapter to function.

- Click Add Trigger
- Select API Gateway in Trigger configuration
- Under API, click Create an API
- Choose REST API
- Select the security for the API
- Click Add
- Click the API Gateway trigger
- Click the name of the trigger (this is a link, a new window opens)
- Click Integration Request
- Uncheck Use Lamba Proxy integration
- Click OK on the two dialogs
- Return to your function
- Remove the API Gateway and Save
- Click Add Trigger and use the same API Gateway
- Select the deployment stage and security
- Click Add

### Install to GCP

- In Functions, create a new function, choose to ZIP upload
- Click Browse and select the `external-adapter.zip` file
- Select a Storage Bucket to keep the zip in
- Function to execute: gcpservice
- Click More, Add variable (repeat for all environment variables)
  - NAME: API_KEY
  - VALUE: Your_API_key
