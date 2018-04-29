const TCRegistrar = artifacts.require('TCRegistrar.sol')
const ENSRegistry = artifacts.require('ENSRegistry.sol')
const TCRegistry = artifacts.require('Registry.sol')

const fs = require('fs')
const BN = require('bignumber.js')

const config = JSON.parse(fs.readFileSync('./conf/config.json'))
const paramConfig = config.paramDefaults

const tcrUtils = require('./utils.js')
const web3Utils = require('web3-utils')
const namehash = require('eth-ens-namehash').hash

const bigTen = number => new BN(number.toString(10), 10)

contract('TCRegistrar', function(accounts) {
  let ens, tcr, registrar
  const [applicant, challenger, voter] = accounts
  const minDeposit = bigTen(paramConfig.minDeposit)
  const rootNode = web3Utils.sha3('tcr')
  const listing = web3Utils.sha3('tokens')

  before(async () => {
    tcr = await TCRegistry.deployed()
    ens = await ENSRegistry.new()
    registrar = await TCRegistrar.new(ens.address, tcr.address, namehash('tcr'))
    await ens.setSubnodeOwner(0, rootNode, registrar.address)
    assert.equal(await ens.owner(namehash('tcr')), registrar.address)
  })

  it('applicant should apply, pass challenge, and whitelist listing', async () => {
    const voting = await tcrUtils.getVoting()

    await tcrUtils.as(applicant, tcr.apply, listing, minDeposit, '')

    // Challenge and get back the pollID
    const pollID = await tcrUtils.challengeAndGetPollID(listing, challenger)

    // Make sure it's cool to commit
    const cpa = await voting.commitPeriodActive.call(pollID)
    assert.strictEqual(cpa, true, 'Commit period should be active')

    // Virgin commit
    const tokensArg = 10
    const salt = 420
    const voteOption = 1
    await tcrUtils.commitVote(pollID, voteOption, tokensArg, salt, voter)

    const numTokens = await voting.getNumTokens.call(voter, pollID)
    assert.strictEqual(
      numTokens.toString(10),
      tokensArg.toString(10),
      'Should have committed the correct number of tokens',
    )

    // Reveal
    await tcrUtils.increaseTime(paramConfig.commitStageLength + 1)
    // Make sure commit period is inactive
    const commitPeriodActive = await voting.commitPeriodActive.call(pollID)
    assert.strictEqual(commitPeriodActive, false, 'Commit period should be inactive')
    // Make sure reveal period is active
    let rpa = await voting.revealPeriodActive.call(pollID)
    assert.strictEqual(rpa, true, 'Reveal period should be active')

    await voting.revealVote(pollID, voteOption, salt, { from: voter })

    // End reveal period
    await tcrUtils.increaseTime(paramConfig.revealStageLength + 1)
    rpa = await voting.revealPeriodActive.call(pollID)
    assert.strictEqual(rpa, false, 'Reveal period should not be active')

    // updateStatus
    const pollResult = await voting.isPassed.call(pollID)
    assert.strictEqual(pollResult, true, 'Poll should have passed')

    // Add to whitelist
    await tcr.updateStatus(listing)
    const result = await tcr.isWhitelisted(listing)
    assert.strictEqual(result, true, 'Listing should be whitelisted')
  })

  it('should let applicant setSubnodeOwner of listing through TCRegistrar', async () => {
    await registrar.register(listing, applicant, { from: applicant })
    let ensOwner = await ens.owner(namehash('tokens.tcr'))
    assert.equal(ensOwner, applicant)
  })
})
