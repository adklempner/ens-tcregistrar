pragma solidity ^0.4.18;

import './ens/ENS.sol';
import './TCR.sol';

/**
 * A registrar that allocates subdomains based on listings in a TCR.
 *
 * Based on FIFSRegistrar.sol by Nick Johnson
 * https://github.com/ethereum/ens/blob/6141359670af83974340e6492e6830125783ccaa/contracts/FIFSRegistrar.sol
 */
contract TCRegistrar {
    ENS public ens;
    TCR public tcr;
    bytes32 public rootNode;

    modifier only_owner(bytes32 subnode) {
        var(,whitelisted,owner,,) = tcr.listings(subnode);
        require(whitelisted && owner == msg.sender);
        _;
    }

    /**
     * Constructor.
     * @param ensAddr The address of the ENS registry.
     * @param tcrAddr The address of the token curated registry.
     * @param node The node that this registrar administers.
     */
    function TCRegistrar(ENS ensAddr, TCR tcrAddr, bytes32 node) public {
        ens = ensAddr;
        tcr = tcrAddr;
        rootNode = node;
    }

    /**
     * Register a name, or change the owner of an existing registration.
     * @param subnode The hash of the label to register.
     * @param owner The address of the new owner.
     */
    function register(bytes32 subnode, address owner) public only_owner(subnode) {
        ens.setSubnodeOwner(rootNode, subnode, owner);
    }

}
