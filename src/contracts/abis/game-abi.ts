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
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "lastGameResult",
    "outputs": [
      {
        "components": [
          {
            "internalType": "enum CrossForCoffee.Difficulty",
            "name": "difficulty",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "success",
            "type": "bool"
          },
          {
            "internalType": "uint8",
            "name": "lanesBet",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "lanesCrossed",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "payout",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "baseSeed",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "result",
            "type": "string"
          }
        ],
        "internalType": "struct CrossForCoffee.Game",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "getLastGameResult",
    "outputs": [
      {
        "components": [
          {
            "internalType": "enum CrossForCoffee.Difficulty",
            "name": "difficulty",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "success",
            "type": "bool"
          },
          {
            "internalType": "uint8",
            "name": "lanesBet",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "lanesCrossed",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "payout",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "baseSeed",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "result",
            "type": "string"
          }
        ],
        "internalType": "struct CrossForCoffee.Game",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
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
