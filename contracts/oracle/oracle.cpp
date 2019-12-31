#include <oracle.hpp>

#include <alaio.system/alaio.system.hpp>
#include <alaio.token/alaio.token.hpp>


namespace alaio {

   oracle::oracle( name s, name code, datastream<const char*> ds )
   : contract(s,code,ds),
     _oracle_global( get_self(), get_self().value ),
     _oracles( get_self(), get_self().value )
   {
      _oracle_state = _oracle_global.get_or_create(get_self(), oracle_reward_info{});
   }

   oracle::~oracle()
   {
      _oracle_global.set( _oracle_state, get_self() );
   }


   void oracle::addrequest( uint64_t request_id, const alaio::name& caller, const std::vector<api>& apis, uint16_t response_type, uint16_t aggregation_type )
   {
      require_auth( caller );
    //  check(aggregation_type > 10 || aggregation_type < 0, "Aggregation type or response type out of range " );
     // check(response_type > 3 || response_type < 0, "Aggregation type or response type out of range " );
     // check(aggregation_type == 0 && ( response_type == 0 || response_type == 3)  , "Aggregation type or response type out of range ");
     // check(aggregation_type == 1 && ( response_type == 0 || response_type == 3)  , "Aggregation type or response type out of range ");
     // check(aggregation_type == 2 && ( response_type == 1 || response_type == 2 || response_type == 3)  , "Aggregation type or response type out of range ");
     // check(aggregation_type == 3 && ( response_type == 0 || response_type == 3)  , "Aggregation type or response type out of range ");
     // check(aggregation_type == 4 && ( response_type == 0 || response_type == 3)  , "Aggregation type or response type out of range ");
     // check(aggregation_type == 5 && ( response_type == 0 || response_type == 3)  , "Aggregation type or response type out of range ");
     // check(aggregation_type == 8 && ( response_type == 0 || response_type == 3)  , "Aggregation type or response type out of range ");
     // check(aggregation_type == 10 && ( response_type == 0 || response_type == 1 || response_type == 2)  , "Aggregation type or response type out of range ");

     // check( apis.size() <= max_api_count, "number of endpoints is too large" );
      for (const auto& api: apis) {
         check( api.endpoint.substr(0, 5) == std::string("https"), "invalid endpoint" );
         check( !api.json_field.empty(), "empty json field" );
         //TODO: add aggregation type check
      }
      check_response_type( response_type );

      request_info_table requests( get_self(), caller.value );
      check( requests.find( request_id ) == requests.end(), "request with this id already exists" );

      const auto [assigned_oracle, standby_oracle] = get_current_oracle();
      auto idx = _oracles.get_index<"oracleacc"_n>();
      const auto it = idx.find(assigned_oracle.value);
      idx.modify(it, same_payer, [](auto& o) {
         o.pending_requests++;
      });
      print("assigned oracle",assigned_oracle);
      print("standby_oracle",standby_oracle);

      requests.emplace( caller, [&, assigned=assigned_oracle, standby=standby_oracle]( auto& r ) {
         r.id               = request_id;
         r.time             = time_point(microseconds(current_time()));
         r.assigned_oracle  = assigned;
         r.standby_oracle   = standby;
         r.apis             = apis;
         r.response_type    = response_type;
         r.aggregation_type = aggregation_type;
      });
   }

   void oracle::reply( const alaio::name& caller, uint64_t request_id, const std::vector<char>& response )
   {
      const auto ct = time_point(microseconds(current_time()));
      request_info_table requests( get_self(), caller.value );
      const auto& request = requests.get(request_id, "request is missing");
      bool first_timeframe = false;
      bool second_timeframe = false;
      bool timeout = false;
      if (ct - request.time < request_period) {
         require_auth(request.assigned_oracle);
         first_timeframe = true;
      }
      else if (ct - request.time < (request_period + request_period)) {
         require_auth(request.standby_oracle);
         second_timeframe = true;
      }
      else { // if request is timed out, anyone can call reply but with empty response
         check( response.empty(), "only empty response is allowed if request is timed out" );
         timeout = true;
      }

      name succeeded;
      auto idx = _oracles.get_index<"oracleacc"_n>();
      auto it = idx.find(request.assigned_oracle.value);
      if (it != idx.end()) {
         if (first_timeframe) {
            succeeded = request.assigned_oracle;
         }
         idx.modify(it, same_payer, [&](auto& o) {
            o.pending_requests--;
            if (!first_timeframe) {
               o.failed_requests++;
            }
         });
      }

      if (second_timeframe) {
         succeeded = request.standby_oracle;
      }
      else if (timeout && request.standby_oracle) {
         auto it = idx.find(request.standby_oracle.value);
         if (it != idx.end()) {
            idx.modify(it, same_payer, [&](auto &o) {
               o.failed_requests++;
            });
         }
      }

      if (succeeded) {
         auto it = idx.find(succeeded.value);
         if (it != idx.end()) {
            double init_successful_requests = it->successful_requests;
            idx.modify(it, same_payer, [&](auto &o) {
               o.successful_requests++;
            });

            double delta_change_rate = 0.0;
            double total_inactive_oracle_share = 0.0;
            const auto last_claim_plus_3days = it->last_claim_time + alaio::days(3);
            bool crossed_threshold = (last_claim_plus_3days <= ct);
            bool updated_after_threshold = (last_claim_plus_3days <= it->last_reward_share_update);
            double new_reward_share = update_oracle_reward_share(_oracles.find(it->producer.value),
                                                                 ct,
                                                                 updated_after_threshold ? 0.0
                                                                                         : init_successful_requests,
                                                                 crossed_threshold && !updated_after_threshold
            );
            if (!crossed_threshold) {
               delta_change_rate += 1;
            } else if (!updated_after_threshold) {
               total_inactive_oracle_share += new_reward_share;
               delta_change_rate -= init_successful_requests;
            }
            update_total_oracle_reward_share(ct, -total_inactive_oracle_share, delta_change_rate);
         }
      }

      require_recipient(caller);

      requests.erase(request);
   }

   void oracle::setoracle( const alaio::name& producer, const alaio::name& oracle )
   {
      require_auth(producer);

      alaiosystem::producers_table producers(system_contract, system_contract.value);
      check( producers.find(producer.value) != producers.end(), "only block producer is allowed to set it`s oracle" );

      const auto ct = time_point(microseconds(current_time()));
      auto it = _oracles.find(producer.value);
      if (it == _oracles.end()) {
         _oracles.emplace(producer, [&](auto& o) {
            o.producer                 = producer;
            o.oracle_account           = oracle;
            o.pending_requests         = 0;
            o.successful_requests      = 0;
            o.failed_requests          = 0;
            o.last_claim_time          = ct;
            o.last_reward_share_update = ct;
            o.reward_share             = 0;
            o.pending_punishment       = 0;
         });
      }
      else {
         _oracles.modify(it, same_payer, [&](auto& o) {
            o.oracle_account = oracle;
         });
      }
   }


   void oracle::check_response_type(uint16_t t) const
   {
      check( t >= 0 && t < static_cast<uint16_t>( response_type::MaxVal ), "response type is out of range" );
   }

   std::pair<name, name> oracle::get_current_oracle() const
   {
      alaiosystem::producers_table producers(system_contract, system_contract.value);
      auto idx = producers.get_index<"prototalvote"_n>();

      std::vector<std::pair<name, uint32_t>> active_oracles;
      for ( auto it = idx.cbegin(); it != idx.cend() && std::distance(idx.cbegin(), it) < 21 && 0 < it->total_votes && it->active(); ++it ) {
         auto oracle_it = _oracles.find(it->owner.value);
         if (oracle_it != _oracles.end() && oracle_it->is_active()) {
            active_oracles.emplace_back(oracle_it->oracle_account, oracle_it->pending_requests);
         }
      }
      check( !active_oracles.empty(), "noone from top21 has active oracle" );
      //sort oracles by pending requests in descending order
      std::sort( active_oracles.begin(), active_oracles.end(),
         [](const std::pair<name, uint32_t>& l, const std::pair<name, uint32_t>& r) { return l.second > r.second; } );

      //Calculate oracle based on current block time and number of pending requests
      uint32_t value = 10; //the higher value the higher probability for oracle
      uint32_t total = value;
      std::vector<uint32_t> v{ value };
      for (size_t i = 1; i < active_oracles.size(); i++) {
         if (active_oracles[i - 1] > active_oracles[i]) {
            value++; //increase probability if oracle has less pending requests than previous one
         }
         v.push_back(total + value);
         total += value;
      }

      std::pair<name, name> ret;
      const auto ct = time_point(microseconds(current_time()));
      auto x = block_timestamp(ct).slot % total;
      auto it = std::find_if(std::begin(v), std::end(v), [x](const auto& val) { return x < val; });
      check( it != std::end(v), "shouldn`t happen" );
      auto index = std::distance(std::begin(v), it);
      ret.first = active_oracles[index].first;

      // delete choosen oracle because standby oracle must be a different one
      total -= v[index];
      v.erase(it);
      active_oracles.erase(active_oracles.begin() + index);
      if (active_oracles.empty()) {
         return ret;
      }

      x = block_timestamp(ct).slot % total;
      it = std::find_if(std::begin(v), std::end(v), [x](const auto& val) { return x < val; });
      check( it != std::end(v), "shouldn`t happen" );
      index = std::distance(std::begin(v), it);
      ret.second = active_oracles[index].first;
      return ret;
   }


   double oracle::update_total_oracle_reward_share( const time_point& ct,
                                                    double additional_shares_delta,
                                                    double shares_rate_delta )
   {
      double delta_total_reward_share = 0.0;
      if( ct > _oracle_state.last_total_reward_share_change_rate_update ) {
         delta_total_reward_share = _oracle_state.total_reward_share_change_rate
                                     * double( (ct - _oracle_state.last_total_reward_share_change_rate_update).count() / 1E6 );
      }

      delta_total_reward_share += additional_shares_delta;
      if( delta_total_reward_share < 0 && _oracle_state.total_reward_share < -delta_total_reward_share ) {
         _oracle_state.total_reward_share = 0.0;
      } else {
         _oracle_state.total_reward_share += delta_total_reward_share;
      }

      if( shares_rate_delta < 0 && _oracle_state.total_reward_share_change_rate < -shares_rate_delta ) {
         _oracle_state.total_reward_share_change_rate = 0.0;
      } else {
         _oracle_state.total_reward_share_change_rate += shares_rate_delta;
      }

      _oracle_state.last_total_reward_share_change_rate_update = ct;

      return _oracle_state.total_reward_share;
   }

   double oracle::update_oracle_reward_share( const oracle_info_table::const_iterator& oracle_itr,
                                              const time_point& ct,
                                              double shares_rate,
                                              bool reset_to_zero )
   {
      double delta_reward_share = 0.0;
      if( shares_rate > 0.0 && ct > oracle_itr->last_reward_share_update ) {
         delta_reward_share = shares_rate * double( (ct - oracle_itr->last_reward_share_update).count() / 1E6 ); // cannot be negative
      }

      double new_reward_share = oracle_itr->reward_share + delta_reward_share;
      _oracles.modify( oracle_itr, same_payer, [&](auto& o) {
         if( reset_to_zero )
            o.reward_share = 0.0;
         else
            o.reward_share = new_reward_share;

         o.last_reward_share_update = ct;
      } );

      return new_reward_share;
   }


   extern "C" {
   void apply(uint64_t receiver, uint64_t code, uint64_t action) {
      if (code == receiver)
      {
         switch (action)
         {
            ALAIO_DISPATCH_HELPER( oracle, (addrequest)(reply)(setoracle) )
         }
      }
   }
   }

} /// namespace alaio
