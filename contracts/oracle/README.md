# Oracle contract

Contract receives request via 'addrequest' and replies via 'reply'

## Build

Build contract using alaio-cpp tool:
```
$ cd contracts/oracle
$ alaio-cpp -abigen -I ../alaio.system/include -o oracle.wasm oracle.cpp
```

## Usage

Every block producer must execute 'setoracle' action in order to receive requests.

When 'addrequest' is executed, active oracle is choosen based on block time and pending request count.
If oracle hasn`t executed requests for given period of time (an hour) and last request was failed then it is considered as inactive and won't receive requests.  
In order to become active oracle need to execute 'activate' action.  

Request is considered as failed if 'reply' has been executed after time period of 5 minutes or response data is empty.