export const gameAbi = [
  {
    "inputs": [
      {
        "internalType": "enum CrossForCoffee.Difficulty",
        "name": "difficulty",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "lanesBet",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "tokenAmount",
        "type": "uint256"
      }
    ],
    "name": "playGame",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "enum CrossForCoffee.Difficulty",
        "name": "difficulty",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "won",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "lanesBet",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "lanesCrossed",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "payout",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "seed",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "result",
        "type": "string"
      }
    ],
    "name": "GameResult",
    "type": "event"
  }
] as const;
