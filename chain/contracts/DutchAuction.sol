// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AucEngine {
    address public owner;
    uint constant DURATION = 2 days; // длительность аукциона
    uint constant FEE = 10; // 10%   // плата за площадку
   
    struct Auction { // сам аукцион
        address payable seller; //  продавец
        uint startingPrice;     //  старт цена
        uint finalPrice;
        uint startAt;           // старт
        uint endsAt;
        uint discountRate;      // сброс от цены
        string item;            // описание что продаем
        bool stopped;
        bool withdrawn;         //вывод средств владельцу аукциона
        bool feeWithdrawn;      //вывод средств владельцу площадки
        address winner;
        
    }

    Auction[] public auctions;
    uint public auctionsCount;

    event AuctionCreated(uint index, string itemName, uint startingPrice, uint duration);
    event AuctionEnded(uint index, uint finalPrice, address winner);
    event AuctionPayoutWithdrawn(address indexed seller, uint amount, uint auctionIndex);
    event Withdrawn(address indexed to, uint256 amount);
    event OwnerFeeWithdrawn(address indexed owner, uint amount, uint auctionIndex);


    constructor() {
        owner = msg.sender;
    }
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }



    function createAuction(uint _startingPrice, uint _discountRate, string memory _item, uint _duration) external {
        uint duration = _duration == 0 ? DURATION : _duration;


        require(_duration > 0 && _duration <= 30 days, "Invalid duration");
        require(_discountRate > 0, "Discount rate must be > 0");
        require(_startingPrice >= _discountRate * duration, "incorrect starting price");

        Auction memory newAuction = Auction({
            seller: payable(msg.sender),
            startingPrice: _startingPrice,
            finalPrice: _startingPrice,
            discountRate: _discountRate,
            startAt: block.timestamp,             // now
            endsAt: block.timestamp + duration,
            item: _item,
            stopped: false,
            withdrawn: false,
            feeWithdrawn: false,
            winner: address(0)
        });

        auctions.push(newAuction);
        auctionsCount++;

        emit AuctionCreated(auctions.length - 1, _item, _startingPrice, duration);
    }

    function getPriceFor(uint index) public view returns(uint) {
        require(index < auctions.length, "Invalid auction index");

        Auction memory cAuction = auctions[index];
        require(!cAuction.stopped, "stopped!");

        uint elapsed = block.timestamp - cAuction.startAt;
        uint discount = cAuction.discountRate * elapsed;

        if (discount >= cAuction.startingPrice) {
            return 0;
        }

        return cAuction.startingPrice - discount;
    }

    function buy(uint index) external payable {
        require(index < auctions.length, "Invalid auction index");

        Auction storage cAuction = auctions[index];
        require(!cAuction.stopped, "stopped!");
        require(block.timestamp < cAuction.endsAt, "ended!");

        uint currentPrice = getPriceFor(index);
        require(msg.value >= currentPrice, "not enough funds!");

        cAuction.stopped = true;
        cAuction.winner = msg.sender;
        cAuction.finalPrice = currentPrice;

        uint refund = msg.value - currentPrice;
        if(refund > 0) {
            payable(msg.sender).transfer(refund);
        }
       
        emit AuctionEnded(index, currentPrice, msg.sender);
    }



    
    function _withdrawFromAuction(uint index) internal {
        Auction storage auc = auctions[index];

        require(auc.stopped, "Auction is not stopped yet");
        require(!auc.withdrawn, "Funds already withdrawn");
        require(auc.seller == msg.sender, "Only seller can withdraw");

        uint payout = auc.finalPrice - (auc.finalPrice * FEE / 100);
        auc.withdrawn = true;

        (bool ok, ) = auc.seller.call{value: payout}("");
        require(ok, "Withdrawal failed");

        emit Withdrawn(msg.sender, payout);
        emit AuctionPayoutWithdrawn(msg.sender, payout, index);
    }


    
    function withdrawFromAuction(uint index) external {
        require(index < auctions.length, "Invalid auction index");

        Auction storage auc = auctions[index];

        require(auc.stopped, "Auction not yet stopped");
        require(!auc.withdrawn, "Already withdrawn");
        require(auc.seller == msg.sender, "Only seller can withdraw");

        uint payout = auc.finalPrice - (auc.finalPrice * FEE / 100);
        auc.withdrawn = true;

        (bool ok, ) = auc.seller.call{value: payout}("");
        require(ok, "Withdrawal failed");

        emit Withdrawn(msg.sender, payout);
        emit AuctionPayoutWithdrawn(msg.sender, payout, index);
    }

    function ownerWithdrawFeeFromAuction(uint index) internal onlyOwner {
        require(index < auctions.length, "Invalid auction index");
        Auction storage auc = auctions[index];

        require(auc.stopped, "Auction not yet stopped");
        require(!auc.feeWithdrawn, "Fee already withdrawn");
        require(auc.finalPrice > 0, "Invalid auction final price");

        uint fee = (auc.finalPrice * FEE) / 100;
        auc.feeWithdrawn = true;

        (bool ok, ) = payable(owner).call{value: fee}("");
        require(ok, "Owner fee withdraw failed");

        emit OwnerFeeWithdrawn(owner, fee, index);
    }

    function stopAuctionIfExpired(uint index) external {
        Auction storage auc = auctions[index];
        require(!auc.stopped, "Auction already stopped");
        require(block.timestamp >= auc.endsAt, "Auction not yet expired");
        
        auc.stopped = true;
    }


    function getAuctionsLength() external view returns (uint) {
        return auctionsCount;
    }

    function getAuctionItem(uint index) external view returns (string memory) {
        require(index < auctions.length, "Invalid index");
        return auctions[index].item;
    }

    function getAuctionIsStopped(uint index) external view returns (bool) {
        require(index < auctions.length, "Invalid index");
        return auctions[index].stopped;
    }


    function getAuction(uint index) external view returns (
        address payable seller,
        uint startingPrice,
        uint finalPrice,
        uint startAt,
        uint endsAt,
        uint discountRate,
        string memory item,
        bool stopped,
        bool withdrawn,
        bool feeWithdrawn,
        address winner
    ) {
        Auction memory auc = auctions[index];
        return (
            auc.seller,
            auc.startingPrice,
            auc.finalPrice,
            auc.startAt,
            auc.endsAt,
            auc.discountRate,
            auc.item,
            auc.stopped,
            auc.withdrawn,
            auc.feeWithdrawn,
            auc.winner
        );
    }


}