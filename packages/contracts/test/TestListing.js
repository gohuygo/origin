const Listing = artifacts.require('./Listing.sol')
const Purchase = artifacts.require('./Purchase.sol')

// Used to assert error cases
const isEVMError = function(err) {
  let str = err.toString()
  return str.includes("revert")
}

const ipfsHash = '0x6b14cac30356789cd0c39fec0acc2176c3573abdb799f3b17ccc6972ab4d39ba'
const price = 33
const unitsAvailable = 42

contract('Listing', accounts => {
  var seller = accounts[0]
  var buyer = accounts[1]
  var stranger = accounts[2]
  var listing

  beforeEach(async function() {
    listing = await Listing.new(
      seller,
      ipfsHash,
      price,
      unitsAvailable,
      {from: seller}
    )
  })

  it('should have correct price', async function() {
    let newPrice = await listing.price()
    assert.equal(
      newPrice,
      price,
      'price is correct'
    )
  })

  it('should allow the seller to close it', async function() {
    assert.equal(await listing.unitsAvailable(), unitsAvailable)
    await listing.close({from: seller})
    assert.equal(await listing.unitsAvailable(), 0)
  })

  it('should not allow a stranger to close it', async function() {
    assert.equal(await listing.unitsAvailable(), unitsAvailable)
    try {
      await listing.close({from: stranger})
    } catch (err) {
      assert.ok(isEVMError(err), 'an EVM error is thrown');
    }
    assert.equal(await listing.unitsAvailable(), unitsAvailable)
  })

  it('should be able to buy a listing', async function() {
    const unitsToBuy = 1 // TODO: Handle multiple units
    const buyTransaction = await listing.buyListing(
      unitsToBuy,
      { from: buyer, value: 6 }
    )
    const listingPurchasedEvent = buyTransaction.logs.find((e)=>e.event=="ListingPurchased")
    const purchaseContract = Purchase.at(listingPurchasedEvent.args._purchaseContract)

    // Check units available decreased
    let newUnitsAvailable = await listing.unitsAvailable()
    assert.equal(
      newUnitsAvailable,
      (unitsAvailable - unitsToBuy),
      'units available has decreased'
    )

    // Check buyer set correctly
    assert.equal(await purchaseContract.buyer(), buyer)

    // Check that purchase was stored in listings
    assert.equal((await listing.purchasesLength()).toNumber(), 1)

    // Check that we can fetch the purchase address
    assert.equal(await listing.getPurchase(0), purchaseContract.address)
  })

})
