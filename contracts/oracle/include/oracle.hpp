#pragma once

#include <alaiolib/asset.hpp>
#include <alaiolib/alaio.hpp>
#include <alaiolib/singleton.hpp>
#include <alaiolib/system.hpp>
#include <alaiolib/time.hpp>


namespace alaio {

   static constexpr alaio::name system_contract   = "alaio"_n;
   static constexpr alaio::name active_permission = "active"_n;
   static constexpr uint16_t max_api_count   = 10;
   static constexpr int64_t min_oracle_stake = 1000'0000;

   static const microseconds request_period      = alaio::minutes( 5 ); //TODO: adjust if needed

   class [[alaio::contract]] oracle : public contract {
      struct api {
         std::string endpoint;
         std::string json_field;
      };
   public:
      using contract::contract;

      oracle( name s, name code, datastream<const char*> ds );
      ~oracle();

      [[alaio::action]]
      void addrequest( uint64_t request_id, const alaio::name& caller, const std::vector<api>& apis, uint16_t response_type, uint16_t aggregation_type );

      [[alaio::action]]
      void reply( const alaio::name& caller, uint64_t request_id, const std::vector<char>& response );

      [[alaio::action]]
      void setoracle( const alaio::name& producer, const alaio::name& oracle );

   private:
      enum class response_type : uint16_t { Bool = 0, Int, Double, String, MaxVal };

      struct [[alaio::table]] oracle_info {
         name       producer;
         name       oracle_account;
         uint32_t   pending_requests;
         uint32_t   successful_requests;
         uint32_t   failed_requests;

         time_point last_claim_time;
         time_point last_reward_share_update;
         double     reward_share;
         int64_t    pending_punishment;

         uint64_t primary_key() const { return producer.value; }
         uint64_t by_oracle_account() const { return oracle_account.value; }

         bool is_active() const {
            return oracle_account.value != 0;
         }
      };
      typedef alaio::multi_index< "oracles"_n, oracle_info,
                                  indexed_by<"oracleacc"_n, const_mem_fun<oracle_info, uint64_t, &oracle_info::by_oracle_account>  >
                                > oracle_info_table;

      struct [[alaio::table]] request_info {
         uint64_t         id;
         time_point       time;
         name             assigned_oracle;
         name             standby_oracle;
         std::vector<api> apis;
         uint16_t         response_type;
         uint16_t         aggregation_type;

         uint64_t primary_key() const { return id; }
      };
      typedef alaio::multi_index< "requests"_n, request_info > request_info_table;


      struct [[alaio::table("oraclereward")]] oracle_reward_info {
         double     total_reward_share = 0;
         double     total_reward_share_change_rate = 0;
         time_point last_total_reward_share_change_rate_update = time_point();
      };
      typedef alaio::singleton< "oraclereward"_n, oracle_reward_info > oracle_reward_info_singleton;


      void check_response_type(uint16_t t) const;

      std::pair<name, name> get_current_oracle() const;

      double update_total_oracle_reward_share( const time_point& ct,
                                               double additional_shares_delta = 0.0,
                                               double shares_rate_delta = 0.0 );
      double update_oracle_reward_share( const oracle_info_table::const_iterator& oracle_itr,
                                         const time_point& ct,
                                         double shares_rate,
                                         bool reset_to_zero = false );


      oracle_reward_info_singleton _oracle_global;
      oracle_reward_info           _oracle_state;
      oracle_info_table            _oracles;
   };

} /// namespace alaio