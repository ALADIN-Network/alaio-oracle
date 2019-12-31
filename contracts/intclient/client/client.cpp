#include "client.hpp"


namespace alaio {

   client::client( name s, name code, datastream<const char*> ds )
      : contract(s, code, ds),
      _config_singleton(get_self(), get_self().value),
      _deposits(get_self(), get_self().value)
      //_free_ids(get_self(), get_self().value)
   {
      _config = _config_singleton.get_or_create(_self, configuration{
         .next_request_id = 0
      });
   }

   client::~client()
   {
      _config_singleton.set( _config, get_self() );
   }


   /*
    * This function is invoked when oracle`s reply method is called
    * Check that received response is valid, execute contract logic and delete request from pending requests table
    */
   void client::reply( const alaio::name& caller, uint64_t request_id, const std::vector<char>& response )
   {
      // This check prevents possible hack when malicious client receives reply
      // and redirects it to attacked client contract using require_recipient
      check( caller == get_self(), "received reply from another caller" ); // respond only to replies to self

      auto deposit_it = _deposits.find( request_id );
      if ( deposit_it == _deposits.end() ) { //do not respond if requests table does not have such request_id
         return;
      }

      if (response.empty()) {
         //if request is failed transfer received tokens back to
         make_transfer(deposit_it->account, deposit_it->transferred);
         //eraseRequest(deposit_it);
         _deposits.erase(deposit_it);
         return;
      }

      //request_id += microseconds(current_time()).count();

      const auto rate = unpack<int>(response);
      //asset btc( static_cast<uint64_t>( deposit_it->transferred.amount * rate ), btc_balance_symbol );

      btc_balances_table balances( get_self(), get_self().value );
      //auto balance_it = balances.find( btc_balance_symbol.code().raw() );
      //if (balance_it == balances.end()) {
         balances.emplace( get_self(), [&]( auto& bal ) {
            bal.id = request_id;
            bal.amount = rate;
         });
      //}
      // else {
      //    balances.modify( balance_it, get_self(), [&]( auto& bal ) {
      //       bal.amount += btc;
      //    });
      // }

      //eraseRequest(deposit_it);
      _deposits.erase(deposit_it);
   }

   /*
    * This function is invoked when user makes transfer to this contract
    * It is responsible for making request to oracle and storing request_id in pending requests table
    */
   void client::transfer( const name& from, const name& to, const alaio::asset& amount, const std::string& memo )
   {
      if (from == get_self() || to != get_self()) {
         return;
      }

      //uint64_t request_id = 0;
      //const auto free_id_it = _free_ids.begin();
      // if (free_id_it != _free_ids.end()) {
      //    request_id = free_id_it->id;
      //    _free_ids.erase(free_id_it);
      // }
      //else {
      uint64_t  request_id = _config.next_request_id;
      request_id += microseconds(current_time()).count();

         _config.next_request_id++;
      //}

      make_request(request_id, std::vector<api>{ {.endpoint="https://min-api.cryptocompare.com/data/price?fsym=ALA&tsyms=BTC", .json_field="BTC"} }, 2, 0, 0, "qwerty");

      _deposits.emplace( get_self(), [&]( auto& d ) {
         d.id          = request_id;
         d.account     = from;
         d.transferred = amount;
      });

   }

   /*
    * This function sends inline action to oracle contract
    */
   void client::make_request( uint64_t request_id, const std::vector<api>& apis, uint16_t response_type, uint16_t aggregation_type, uint16_t prefered_api, std::string string_to_count )
   {
      action(
         permission_level{ get_self(), active_permission },
         oracle_account,
         request_action,
         std::make_tuple(request_id, get_self(), apis, response_type, aggregation_type, prefered_api, string_to_count)
      ).send();
   }

   /*
    * This function sends tokens from this contract to receiver
    */
   void client::make_transfer( const alaio::name& receiver, const alaio::asset& amount )
   {
      action(
         permission_level{ get_self(), active_permission },
         token_account,
         transfer_action,
         std::make_tuple(get_self(), receiver, amount, std::string())
      ).send();
   }

   // template<typename Iterator>
   // void client::eraseRequest( Iterator it )
   // {
   //    const auto request_id = it->id;
   //    _deposits.erase(it);
   //    if (request_id == _config.next_request_id - 1) {
   //       const auto last_request_it = _deposits.rbegin();
   //       if (last_request_it == _deposits.rend()) {
   //          _config.next_request_id = 0;
   //       }
   //       else {
   //          _config.next_request_id = last_request_it->id + 1;
   //       }
   //       auto rb = _free_ids.rbegin();
   //       while (rb != _free_ids.rend() && rb->id >= _config.next_request_id) {
   //          _free_ids.erase(*rb);
   //          rb = _free_ids.rbegin();
   //       }
   //    }
   //    else {
   //       _free_ids.emplace(get_self(), [&](auto& id) {
   //          id.id = request_id;
   //       });
   //    }
   // }


   extern "C" {
   void apply(uint64_t receiver, uint64_t code, uint64_t action) {
      if (code == receiver)
      {
      }
      else if (code == oracle_account.value && action == reply_action.value) { // listen for reply notification by oracle contract
         execute_action( name(receiver), name(code), &client::reply );
      }
      else if (code == token_account.value && action == transfer_action.value) {
         execute_action( name(receiver), name(code), &client::transfer ); // listen for reply notification by alaio.token contract
      }
   }
   }
} /// namespace alaio