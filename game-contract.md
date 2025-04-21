THIS IS FOR VIEWING ONLY DO NOT COPY


// File: @openzeppelin/contracts/token/ERC20/IERC20.sol


// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/IERC20.sol)

pragma solidity ^0.8.20;

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// File: Game(Token)12.sol


pragma solidity ^0.8.19;


contract CrossForCoffee {
    address public owner;
    IERC20 public token;

    enum Difficulty { Easy, Medium, Hard, Daredevil }

    mapping(Difficulty => uint256[]) public laneMultipliersX100;
    mapping(Difficulty => uint256[]) public accidentChance;

    uint256 public nonce;

    // Store only the last game result for each player
    mapping(address => Game) public lastGameResult;

    struct Game {
        Difficulty difficulty;
        bool success;
        uint8 lanesBet;
        uint8 lanesCrossed;
        uint256 payout;
        uint256 baseSeed;
        string result;
    }

    constructor(address _token) {
        owner = msg.sender;
        token = IERC20(_token);

        laneMultipliersX100[Difficulty.Easy] = [100, 120, 140, 160, 180, 220, 260, 300];
        laneMultipliersX100[Difficulty.Medium] = [105, 120, 140, 160, 190, 230, 280, 340, 420, 500];
        laneMultipliersX100[Difficulty.Hard] = [112, 125, 140, 160, 185, 210, 240, 280, 330, 400, 480, 580, 680, 800];
        laneMultipliersX100[Difficulty.Daredevil] = [130, 150, 180, 210, 250, 300, 350, 420, 500, 600, 720, 850, 1000, 1200, 1350, 1500];

        accidentChance[Difficulty.Easy] = [500000, 329000, 263000, 231000, 199000, 182000, 171000, 159000];
        accidentChance[Difficulty.Medium] = [550000, 352000, 269000, 225000, 199000, 182000, 171000, 159000, 151000, 149000];
        accidentChance[Difficulty.Hard] = [600000, 392000, 302000, 254000, 225000, 206000, 189000, 177000, 169000, 158000, 149000, 146000];
        accidentChance[Difficulty.Daredevil] = [650000, 434000, 338000, 286000, 255000, 229000, 211000, 199000, 190000, 178000, 169000, 161000, 164000, 162000, 160000, 150000];
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function setToken(address newToken) external onlyOwner {
        require(newToken != address(0), "Invalid token address");
        token = IERC20(newToken);
    }

    function setMultipliers(Difficulty diff, uint256[] calldata multipliers) external onlyOwner {
        laneMultipliersX100[diff] = multipliers;
    }

    function setAccidentChance(Difficulty diff, uint256[] calldata chances) external onlyOwner {
        accidentChance[diff] = chances;
    }

    function playGame(Difficulty difficulty, uint8 lanesBet, uint256 tokenAmount) external {
        require(tokenAmount > 0, "Bet required");
        require(token.transferFrom(msg.sender, address(this), tokenAmount), "Transfer failed");

        uint256 baseSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, nonce++)));
        require(lanesBet > 0 && lanesBet <= laneMultipliersX100[difficulty].length, "Invalid lane count");

        uint256[] storage multipliers = laneMultipliersX100[difficulty];
        uint256[] storage chances = accidentChance[difficulty];

        uint8 lanesCrossed = 0;
        uint256 payout = 0;
        bool success = true;
        string memory result = "Win";

        for (uint8 i = 0; i < lanesBet; i++) {
            uint256 laneSeed = uint256(keccak256(abi.encode(baseSeed, i))) % 1e6;
            if (laneSeed < chances[i]) {
                success = false;
                result = "Loss";
                break;
            }
            payout += (tokenAmount * multipliers[i]) / 100;
            lanesCrossed++;
        }

        // Store the last game result
        lastGameResult[msg.sender] = Game({
            difficulty: difficulty,
            success: success,
            lanesBet: lanesBet,
            lanesCrossed: lanesCrossed,
            payout: payout,
            baseSeed: baseSeed,
            result: result
        });

        if (success) {
            require(token.transfer(msg.sender, payout), "Token payout failed");
        }
    }

    function getLastGameResult(address player) external view returns (Game memory) {
        return lastGameResult[player];
    }

    function withdrawTokens() external onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        require(token.transfer(owner, balance), "Token withdrawal failed");
    }
}
