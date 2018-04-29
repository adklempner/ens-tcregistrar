pragma solidity ^0.4.11;

contract TCR {

    struct Listing {
        uint applicationExpiry; // Expiration date of apply stage
        bool whitelisted;       // Indicates registry status
        address owner;          // Owner of Listing
        uint unstakedDeposit;   // Number of tokens in the listing not locked in a challenge
        uint challengeID;       // Corresponds to a PollID in PLCRVoting
    }

    // Maps listingHashes to associated listingHash data
    mapping(bytes32 => Listing) public listings;

}
