#pragma once

#include <alaiolib/asset.hpp>
#include <alaiolib/alaio.hpp>
#include <alaiolib/singleton.hpp>
#include <alaiolib/system.hpp>
#include <alaiolib/time.hpp>

#include <alaio.system/alaio.system.hpp>


namespace alaio {

   static constexpr alaio::name oracle_account    = "alaio"_n;
   static_assert(oracle_account, "oracle_account is empty. Please provide valid oracle account name");

   static constexpr alaio::name active_permission = "active"_n;
   static constexpr alaio::name request_action    = "addrequest"_n;
   static constexpr alaio::name reply_action      = "reply"_n;
   static constexpr alaio::name token_account     = "alaio.token"_n;
   static constexpr alaio::name transfer_action   = "transfer"_n;
   static const alaio::symbol btc_balance_symbol  = symbol{ "BTC", alaiosystem::system_contract::get_core_symbol().precision() };

   class [[alaio::contract]] client : public contract {
   public:
      client( name s, name code, datastream<const char*> ds );
      ~client();

      void reply( const alaio::name& caller, uint64_t request_id, const std::vector<char>& response );

      void transfer( const name& from, const name& to, const alaio::asset& amount, const std::string& memo );

   private:
      struct api {
         std::string endpoint;
         uint16_t request_type;
         uint16_t response_type;
         std::string parameters;
         std::string json_field;
      };


      /*
       * This is table to store pending requests
       * We are tracking an amount of tokens transferred by user to this contract
       * After response from oracle is received we are decoding result and calculating BTC equivalent of transferred ALA tokens
       */
      struct [[alaio::table]] deposit_request_info {
         uint64_t    id;
         name        account;
         asset       transferred;

         uint64_t primary_key() const { return id; }
      };
      typedef alaio::multi_index< "deposits"_n, deposit_request_info > deposit_request_info_table;

      /*
       * Table to track BTC balances of users
       */
      struct [[alaio::table]] btc_balances {
         uint64_t id;
         int amount;

         uint64_t primary_key() const { return id; }
      };
      typedef alaio::multi_index< "btcbalances"_n, btc_balances > btc_balances_table;

      // struct [[alaio::table]] free_request_id {
      //    uint64_t id = 0;

      //    uint64_t primary_key() const { return id; }
      // };
      // typedef alaio::multi_index< "freereqid"_n, free_request_id > free_request_id_table;

      struct [[alaio::table("config")]] configuration {
         uint64_t next_request_id = 0;
      };
      typedef alaio::singleton< "config"_n, configuration > configuration_singleton;


      void make_request( uint64_t request_id, const std::vector<api>& apis, uint16_t response_type, uint16_t aggregation_type, uint16_t prefered_api, std::string string_to_count  );
      void make_transfer( const alaio::name& receiver, const alaio::asset& amount );

      template<typename Iterator>
      void eraseRequest( Iterator it );

      configuration_singleton _config_singleton;
      configuration           _config;

      deposit_request_info_table _deposits;
      //free_request_id_table _free_ids;
   };

} /// namespace alaio
