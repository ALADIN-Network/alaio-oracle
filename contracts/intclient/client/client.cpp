#include "client.hpp"


namespace alaio {

   client::client( name s, name code, datastream<const char*> ds )
      : contract(s, code, ds),
      _config_singleton(get_self(), get_self().value)
   {
      _config = _config_singleton.get_or_create(_self, configuration{
         .next_request_id = 0
      });
   }

   client::~client()
   {
      _config_singleton.set( _config, get_self() );
   }

   void client::reply( const alaio::name& caller, uint64_t request_id, const std::vector<char>& response )
   {
      check( caller == get_self(), "received reply from another caller" ); 

      const auto rate = unpack<int>(response);

      btc_balances_table balances( get_self(), get_self().value );
         balances.emplace( get_self(), [&]( auto& bal ) {
            bal.id = request_id;
            bal.amount = rate;
         });
   }

   void client::addreq( const std::vector<api>& apis, uint16_t response_type, uint16_t aggregation_type, uint16_t prefered_api, std::string string_to_count  )
   {
      uint64_t  request_id = _config.next_request_id;
      request_id += microseconds(current_time()).count();
      _config.next_request_id++;
      
      make_request(request_id, apis, response_type, aggregation_type, prefered_api, string_to_count);
   }

   void client::make_request( uint64_t request_id, const std::vector<api>& apis, uint16_t response_type, uint16_t aggregation_type, uint16_t prefered_api, std::string string_to_count )
   {
      action(
         permission_level{ get_self(), active_permission },
         oracle_account,
         request_action,
         std::make_tuple(request_id, get_self(), apis, response_type, aggregation_type, prefered_api, string_to_count)
      ).send();
   }

   extern "C" {
   void apply(uint64_t receiver, uint64_t code, uint64_t action) {
      if (code == receiver)
      {
         execute_action( name(receiver), name(code), &client::addreq );
      }
      else if (code == oracle_account.value && action == reply_action.value) { // listen for reply notification by oracle contract
         execute_action( name(receiver), name(code), &client::reply );
      }     
   }
   }
} /// namespace alaio
