//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BurnToClaim {
  event ExitTransactionEvent(
    bytes32 indexed transactionId,
    address indexed sender,
    address indexed receiver,
    address tokenContract,
    uint256 amount,
    bytes32 hashlock,
    uint256 timelock
  );
  event EntryTransactionEvent(bytes32 indexed transactionId);
  event ReclaimTransactionEvent(bytes32 indexed transactionId);

  struct BurnTokenData {
    address sender;
    address receiver;
    address tokenContract;
    uint256 amount;
    bytes32 hashlock;
    uint256 timelock;
    bool withdrawn;
    bool refunded;
    bytes32 preimage;
  }
  mapping(bytes32 => BurnTokenData) burnTokenData;

  struct CrosschainAddress {
    address contractAddress;
    bool isExit;
  }
  mapping(address => CrosschainAddress) crosschainAddress;

  function registerContract(address contractAddress) external {
    eventRequire(
      contractAddress != address(0),
      "contract address must not be zero address"
    );
    crosschainAddress[contractAddress] = CrosschainAddress(contractAddress, true);
  }

  function exitTransaction(
    address _burnAddress,
    bytes32 _hashlock,
    uint256 _timelock,
    address _tokenContract,
    uint256 _amount
  ) external returns (bytes32 transactionId) {
    uint startedAt = block.timestamp;

    eventRequire(_amount > 0, "token amount must be > 0");
    eventRequire(ERC20(_tokenContract).allowance(msg.sender, address(this)) >= _amount, "token allowance must be >= amount");
    eventRequire(_timelock > startedAt, "timelock time must be in the future");

    transactionId = sha256(
      abi.encodePacked(
        msg.sender,
        _burnAddress,
        _tokenContract,
        _amount,
        _hashlock,
        _timelock
      )
    );

    if (haveContract(transactionId)) revert("Contract already exists");
    if (!ERC20(_tokenContract).transferFrom( msg.sender, _burnAddress, _amount)) revert("transferFrom sender to this failed");

    burnTokenData[transactionId] = BurnTokenData(
      msg.sender,
      _burnAddress,
      _tokenContract,
      _amount,
      _hashlock,
      _timelock,
      false,
      false,
      0x0
    );

    emit ExitTransactionEvent(
      transactionId,
      msg.sender,
      _burnAddress,
      _tokenContract,
      _amount,
      _hashlock,
      block.timestamp
    );
  }

  function add(
    address _crosschainContractAddress,
    bytes32 _transactionId,
    address _burnAddress,
    bytes32 _hashlock,
    uint256 _timelock,
    address _tokenContract, // base token contract
    uint256 _amount
  ) external {
    eventRequire(
      crosschainAddress[_crosschainContractAddress].isExit,
      "Add corssChain data contract address not exit"
    );
    burnTokenData[_transactionId] = BurnTokenData(
      msg.sender,
      _burnAddress,
      _tokenContract,
      _amount,
      _hashlock,
      _timelock,
      false,
      false,
      0x0
    );
  }

  function entryTransaction(uint256 _amount, address _receiver, bytes32 _transactionId, bytes32 _preimage) external returns (bool) {
    eventRequire(haveContract(_transactionId), "transactionId does not exist");
    eventRequire(
      burnTokenData[_transactionId].hashlock == sha256(abi.encodePacked(_preimage)),
      "hashlock hash does not match"
    );
    eventRequire(
      burnTokenData[_transactionId].withdrawn == false,
      "withdrawable: already withdrawn"
    );
    eventRequire(
      burnTokenData[_transactionId].timelock > block.timestamp,
      "withdrawable: timelock time must be in the future"
    );

    BurnTokenData storage burntToken = burnTokenData[_transactionId];
    burntToken.preimage = _preimage;
    burntToken.withdrawn = true;

    if (!ERC20(burntToken.tokenContract).transfer(_receiver, _amount)){
      revert("transferFrom sender to this failed");
    }
    else {
      emit EntryTransactionEvent(_transactionId);
    }
    return true;
  }

  function update(address _crosschainContractAddress, bytes32 _transactionId, bytes32 _preimage) external {
    eventRequire(
      crosschainAddress[_crosschainContractAddress].isExit,
      "Update corssChain data contract address not exit"
    );
    BurnTokenData storage burntToken = burnTokenData[_transactionId];
    burntToken.preimage = _preimage;
    burntToken.withdrawn = true;
  }

  function reclaimTransaction(bytes32 _transactionId) external returns (bool) {
    eventRequire(haveContract(_transactionId), "transactionId does not exist");
    eventRequire(burnTokenData[_transactionId].sender == msg.sender, "refundable: not sender");
    eventRequire(burnTokenData[_transactionId].refunded == false, "refundable: already refunded");
    eventRequire(burnTokenData[_transactionId].withdrawn == false, "refundable: already withdrawn");
    eventRequire(burnTokenData[_transactionId].timelock <= block.timestamp, "refundable: timelock not yet passed");

    BurnTokenData storage burntToken = burnTokenData[_transactionId];
    burntToken.refunded = true;

    if (!ERC20(burntToken.tokenContract).transfer(burntToken.sender, burntToken.amount)) {
      revert("transferFrom sender to this failed");
    }

    emit ReclaimTransactionEvent(_transactionId);
    return true;
  }

  // HELPERS
  function haveContract(bytes32 _transactionId) internal view returns (bool exists) {
    exists = (burnTokenData[_transactionId].sender != address(0));
  }

  event RequireEvent(string  message);
  function eventRequire(bool condition, string memory message) public {
    if(condition == false){
      emit RequireEvent(message);
    }
  }
}