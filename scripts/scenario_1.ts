import { ethers } from 'hardhat'
import * as crypto from 'crypto'

// run yarn network:1 and get info there
// TODO: find a way to auto populate ENV
const SENDER_NETWORK_ADDRESS = 'http://127.0.0.1:8545'
const SENDER_ADDRESS = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'
const SENDER_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

// run yarn network:2 and get info there
// TODO: find a way to auto populate ENV
const RECIPIENT_NETWORK_ADDRESS = 'http://127.0.0.1:8546'
const RECIPIENT_ADDRESS = '0x95C388AfEb0fD9cEF9E3B8b2bD52a7D3eF265A79'
const RECIPIENT_PRIVATE_KEY = '0xbdeff86191ede0ba7d9448aac016f0f46450e18bdf64566dfafb9710d07207dc'

const TOKEN_AMOUNT = 1

const main = async () => {
  const senderProvider = new ethers.providers.JsonRpcProvider(SENDER_NETWORK_ADDRESS)
  const senderWallet = new ethers.Wallet(SENDER_PRIVATE_KEY, senderProvider)

  const recipientProvider = new ethers.providers.JsonRpcProvider(RECIPIENT_NETWORK_ADDRESS)
  const recipientWallet = new ethers.Wallet(RECIPIENT_PRIVATE_KEY, recipientProvider)

  const [
    senderBlockNumber,
    senderTokenFactory,
    senderAgentFactory,
    recipientBlockNumber,
    recipientTokenFactory,
    recipientAgentFactory,
  ] = await Promise.all([
    senderProvider.getBlockNumber(),
    ethers.getContractFactory('BasicToken', senderWallet),
    ethers.getContractFactory('BurnToClaim', senderWallet),
    recipientProvider.getBlockNumber(),
    ethers.getContractFactory('BasicToken', recipientWallet),
    ethers.getContractFactory('BurnToClaim', recipientWallet),
  ])

  const [senderTokenContract, recipientTokenContract] = await Promise.all([
    senderTokenFactory.deploy(1000, { nonce: senderBlockNumber }),
    recipientTokenFactory.deploy(1000, { nonce: recipientBlockNumber })
  ])

  const [senderAgentContract, recipientAgentContract] = await Promise.all([
    senderAgentFactory.deploy({ nonce: senderBlockNumber + 1 }), //  + 1
    recipientAgentFactory.deploy({ nonce: recipientBlockNumber + 1 }), //  + 1
  ])

  const [
    senderToken,
    senderAgent,
    recipientToken,
    recipientAgent,
  ] = await Promise.all([
    senderTokenContract.deployed(),
    senderAgentContract.deployed(),
    recipientTokenContract.deployed(),
    recipientAgentContract.deployed(),
  ])

  const [
    senderRegisterContractTx,
    recipientRegisterContractTx,
  ] = await Promise.all([
    senderAgent.registerContract(recipientAgent.address, { gasLimit: 100000 }),
    recipientAgent.registerContract(senderAgent.address, { gasLimit: 100000 }),
  ])
  await Promise.all([
    senderRegisterContractTx.wait(),
    recipientRegisterContractTx.wait()
  ])

  const [
    senderTokenTransferTx,
    recipientTokenTransferTx,
  ] = await Promise.all([
    senderToken.transfer(senderAgent.address, 1000, { gasLimit: 100000 }),
    recipientToken.transfer(recipientAgent.address, 1000, { gasLimit: 100000 }),
  ])
  await Promise.all([
    senderTokenTransferTx.wait(),
    recipientTokenTransferTx.wait()
  ])

  const senderTokenApproveTx = await senderToken.approve(senderAgent.address, TOKEN_AMOUNT)
  await senderTokenApproveTx.wait()

  const burnAccountWallet = ethers.Wallet.createRandom()
  const hashPair = genHashPair()

  // TODO: what is this
  const periodEndSeconds = '' // senderAgent.timer.periodEndSeconds
  const senderAgentExitTx = await senderAgent.exitTransaction(
    burnAccountWallet.address,
    hashPair.hash,
    periodEndSeconds,
    senderToken.address,
    TOKEN_AMOUNT
  )
  await senderAgentExitTx.wait()

  // const transactionId = '' // TODO: what transaction ?
  // const senderAgentReclaimTx = await senderAgent.reclaimTransaction(transactionId)
  // await senderAgentReclaimTx.wait()

  // const recipientAgentAddTx = await recipientAgent.add(
  //   senderAgent.address,
  //   transactionId,
  //   burnAccountWallet.address,
  //   hashPair.hash,
  //   periodEndSeconds,
  //   recipientToken.address,
  //   TOKEN_AMOUNT
  // )
  // await recipientAgentAddTx.wait()

  // const recipientAgentEntryTx = await recipientAgent.entryTransaction(
  //   TOKEN_AMOUNT,
  //   SENDER_ADDRESS,
  //   transactionId,
  //   hashPair.secret
  // )
  // await recipientAgentEntryTx.wait()

  // const senderAgentUpdateTx = await senderAgent.update(
  //   recipientAgent.address,
  //   transactionId,
  //   hashPair.secret
  // )
  // await senderAgentUpdateTx.wait()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

const genHashPair = () => {
  const secret = `0x${crypto.randomBytes(32).toString('hex')}`
  const hash = `0x${crypto.createHash('sha256').update(secret).digest().toString('hex')}`
  return { secret, hash }
}
