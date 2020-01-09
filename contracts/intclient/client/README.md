# Contract for interaction with oracle

Contract receive tokens, executes request to oracle to get rate ALA-BTC and updates BTC ballance of user

## Build

Open file client.hpp and find line
```
static constexpr alaio::name oracle_account    = ""_n;
```
Place account name of oracle contract inside quotes.

Build contract using alaio-cpp tool:
```
$ cd contracts/client
$ alaio-cpp -abigen -I ../alaio.system/include -o client.wasm client.cpp
```

##Prerequisites

Add alaio.code permission to authorities of active permission so the contract is able to execute inline requests to oracle

##Usage

User is sending tokens to this contract and it updates user`s balance in BTC equivalent of sent tokens.

The workflow looks as follows:
1. Execute transfer from user account to account of this contract
2. Contract executes inline request to oracle
3. Oracle processes request and calls reply action
4. This contract receives reply notification and updates balances table
5. Check table `btcbalances`: `alacli get table <client contract> <user that executed transfer> btcbalances`