pragma solidity 0.4.21;

import './lib/zeppelin-solidity/math/SafeMath.sol';
import './lib/zeppelin-solidity/ownership/Ownable.sol';

/// @title Whitelist for TKO token sale.
/// @author Takeoff Technology OU - <info@takeoff.ws>
/// @dev Based on code by OpenZeppelin's WhitelistedCrowdsale.sol
contract TkoWhitelist is Ownable{

    using SafeMath for uint256;

    // Manage whitelist account address.
    address public admin;

    mapping(address => uint256) internal totalIndividualWeiAmount;
    mapping(address => bool) internal whitelist;

    event AdminChanged(address indexed previousAdmin, address indexed newAdmin);


    /**
     * TkoWhitelist
     * @dev TkoWhitelist is the storage for whitelist and total amount by contributor's address.
     * @param _admin Address of managing whitelist.
     */
    function TkoWhitelist (address _admin) public {
        require(_admin != address(0));
        admin = _admin;
    }

    /**
     * @dev Throws if called by any account other than the owner or the admin.
     */
    modifier onlyOwnerOrAdmin() {
        require(msg.sender == owner || msg.sender == admin);
        _;
    }

    /**
     * @dev Allows the current owner to change administrator account of the contract to a newAdmin.
     * @param newAdmin The address to transfer ownership to.
     */
    function changeAdmin(address newAdmin) public onlyOwner {
        require(newAdmin != address(0));
        emit AdminChanged(admin, newAdmin);
        admin = newAdmin;
    }


    /**
      * @dev Returen whether the beneficiary is whitelisted.
      */
    function isWhitelisted(address _beneficiary) external view onlyOwnerOrAdmin returns (bool) {
        return whitelist[_beneficiary];
    }

    /**
     * @dev Adds single address to whitelist.
     * @param _beneficiary Address to be added to the whitelist
     */
    function addToWhitelist(address _beneficiary) external onlyOwnerOrAdmin {
        whitelist[_beneficiary] = true;
    }

    /**
     * @dev Adds list of addresses to whitelist.
     * @param _beneficiaries Addresses to be added to the whitelist
     */
    function addManyToWhitelist(address[] _beneficiaries) external onlyOwnerOrAdmin {
        for (uint256 i = 0; i < _beneficiaries.length; i++) {
            whitelist[_beneficiaries[i]] = true;
        }
    }

    /**
     * @dev Removes single address from whitelist.
     * @param _beneficiary Address to be removed to the whitelist
     */
    function removeFromWhitelist(address _beneficiary) external onlyOwnerOrAdmin {
        whitelist[_beneficiary] = false;
    }

    /**
     * @dev Return total individual wei amount.
     * @param _beneficiary Addresses to get total wei amount .
     * @return Total wei amount for the address.
     */
    function getTotalIndividualWeiAmount(address _beneficiary) external view onlyOwnerOrAdmin returns (uint256) {
        return totalIndividualWeiAmount[_beneficiary];
    }

    /**
     * @dev Set total individual wei amount.
     * @param _beneficiary Addresses to set total wei amount.
     * @param _totalWeiAmount Total wei amount for the address.
     */
    function setTotalIndividualWeiAmount(address _beneficiary,uint256 _totalWeiAmount) external onlyOwner {
        totalIndividualWeiAmount[_beneficiary] = _totalWeiAmount;
    }

    /**
     * @dev Add total individual wei amount.
     * @param _beneficiary Addresses to add total wei amount.
     * @param _weiAmount Total wei amount to be added for the address.
     */
    function addTotalIndividualWeiAmount(address _beneficiary,uint256 _weiAmount) external onlyOwner {
        totalIndividualWeiAmount[_beneficiary] = totalIndividualWeiAmount[_beneficiary].add(_weiAmount);
    }

}