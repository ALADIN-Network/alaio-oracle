#pragma once

#include <alaiolib/asset.hpp>
#include <alaiolib/alaio.hpp>
#include <alaiolib/singleton.hpp>
#include <alaiolib/system.hpp>
#include <alaiolib/time.hpp>

namespace alaio {

   static constexpr alaio::name oracle_account    = "alaio"_n;
   static_assert(oracle_account, "oracle_account is empty. Please provide valid oracle account name");

   static constexpr alaio::name active_permission = "active"_n;
   static constexpr alaio::name request_action    = "addrequest"_n;
   static constexpr alaio::name reply_action      = "reply"_n;
   static constexpr alaio::name contract_name     = "myclient"_n;
   static constexpr alaio::name action_name       = "addreq"_n;

   class [[alaio::contract]] client : public contract {

   private:
      struct api {
         std::string endpoint;
         std::string json_field;
      };

      struct [[alaio::table]] btc_balances {
         uint64_t id;
         std::string amount;

         uint64_t primary_key() const { return id; }
      };
      typedef alaio::multi_index< "btcbalances"_n, btc_balances > btc_balances_table;

      struct [[alaio::table("config")]] configuration {
         uint64_t next_request_id = 0;
      };
      typedef alaio::singleton< "config"_n, configuration > configuration_singleton;

      void make_request( uint64_t request_id, const std::vector<api>& apis, uint16_t response_type, uint16_t aggregation_type, uint16_t prefered_api, std::string string_to_count  );

      configuration_singleton _config_singleton;
      configuration           _config;

   public:
      client( name s, name code, datastream<const char*> ds );
      ~client();

      void reply( const alaio::name& caller, uint64_t request_id, const std::vector<char>& response );

      [[alaio::action]]
      void addreq( const std::vector<api>& apis, uint16_t response_type, uint16_t aggregation_type, uint16_t prefered_api, std::string string_to_count );
   };

} /// namespace alaio
