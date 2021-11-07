import { expect } from 'chai'
import { ethers } from 'hardhat'

// TODO throw this to env later
// check if there is a automated method
const LOCAL_ADDRESS = 'http://127.0.0.1:8545/'
const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

describe('Token and Agent', () => {
  it('should return token and agent deployed address', async () => {
    const provider = new ethers.providers.JsonRpcProvider(LOCAL_ADDRESS)
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider)

    const [
      tokenFactory,
      agentFactory,
      blockNumber
    ] = await Promise.all([
      ethers.getContractFactory('BasicToken', wallet),
      ethers.getContractFactory('BurnToClaim', wallet),
      provider.getBlockNumber()
    ])

    const tokenContract = await tokenFactory.deploy(1000, { nonce: blockNumber })
    const agentContract = await agentFactory.deploy({ nonce: blockNumber + 1 })

    const [token, agent] = await Promise.all([tokenContract.deployed(), agentContract.deployed()])

    expect(token.address).to.be.a('string')
    expect(agent.address).to.be.a('string')
  })
})
