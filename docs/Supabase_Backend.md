Tables details MD
| schema   | table_name                 | row_estimate | bytes  | columns                                                       
| auth     | audit_log_entries          | -1           | 0      | [{"column":"instance_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"id","default":null,"nullable":false,"data_type":"uuid"},{"column":"payload","default":null,"nullable":true,"data_type":"json"},{"column":"created_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"ip_address","default":"''::character varying","nullable":false,"data_type":"character varying(64)"}]                                                           |
| auth     | custom_oauth_providers     | -1           | 0      | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"provider_type","default":null,"nullable":false,"data_type":"text"},{"column":"identifier","default":null,"nullable":false,"data_type":"text"},{"column":"name","default":null,"nullable":false,"data_type":"text"},{"column":"client_id","default":null,"nullable":false,"data_type":"text"},{"column":"client_secret","default":null,"nullable":false,"data_type":"text"},{"column":"acceptable_client_ids","default":"'{}'::text[]","nullable":false,"data_type":"text[]"},{"column":"scopes","default":"'{}'::text[]","nullable":false,"data_type":"text[]"},{"column":"pkce_enabled","default":"true","nullable":false,"data_type":"boolean"},{"column":"attribute_mapping","default":"'{}'::jsonb","nullable":false,"data_type":"jsonb"},{"column":"authorization_params","default":"'{}'::jsonb","nullable":false,"data_type":"jsonb"},{"column":"enabled","default":"true","nullable":false,"data_type":"boolean"},{"column":"email_optional","default":"false","nullable":false,"data_type":"boolean"},{"column":"issuer","default":null,"nullable":true,"data_type":"text"},{"column":"discovery_url","default":null,"nullable":true,"data_type":"text"},{"column":"skip_nonce_check","default":"false","nullable":false,"data_type":"boolean"},{"column":"cached_discovery","default":null,"nullable":true,"data_type":"jsonb"},{"column":"discovery_cached_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"authorization_url","default":null,"nullable":true,"data_type":"text"},{"column":"token_url","default":null,"nullable":true,"data_type":"text"},{"column":"userinfo_url","default":null,"nullable":true,"data_type":"text"},{"column":"jwks_uri","default":null,"nullable":true,"data_type":"text"},{"column":"created_at","default":"now()","nullable":false,"data_type":"timestamp with time zone"},{"column":"updated_at","default":"now()","nullable":false,"data_type":"timestamp with time zone"}]                                                       |
| auth     | flow_state                 | 8            | 8192   | [{"column":"id","default":null,"nullable":false,"data_type":"uuid"},{"column":"user_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"auth_code","default":null,"nullable":true,"data_type":"text"},{"column":"code_challenge_method","default":null,"nullable":true,"data_type":"auth.code_challenge_method"},{"column":"code_challenge","default":null,"nullable":true,"data_type":"text"},{"column":"provider_type","default":null,"nullable":false,"data_type":"text"},{"column":"provider_access_token","default":null,"nullable":true,"data_type":"text"},{"column":"provider_refresh_token","default":null,"nullable":true,"data_type":"text"},{"column":"created_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"updated_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"authentication_method","default":null,"nullable":false,"data_type":"text"},{"column":"auth_code_issued_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"invite_token","default":null,"nullable":true,"data_type":"text"},{"column":"referrer","default":null,"nullable":true,"data_type":"text"},{"column":"oauth_client_state_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"linking_target_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"email_optional","default":"false","nullable":false,"data_type":"boolean"}]                                              |
| auth     | identities                 | 17           | 16384  | [{"column":"provider_id","default":null,"nullable":false,"data_type":"text"},{"column":"user_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"identity_data","default":null,"nullable":false,"data_type":"jsonb"},{"column":"provider","default":null,"nullable":false,"data_type":"text"},{"column":"last_sign_in_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"created_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"updated_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"email","default":"lower((identity_data ->> 'email'::text))","nullable":true,"data_type":"text"},{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"}]                                           
| auth     | instances                  | -1           | 0      | [{"column":"id","default":null,"nullable":false,"data_type":"uuid"},{"column":"uuid","default":null,"nullable":true,"data_type":"uuid"},{"column":"raw_base_config","default":null,"nullable":true,"data_type":"text"},{"column":"created_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"updated_at","default":null,"nullable":true,"data_type":"timestamp with time zone"}]                                                                                         |
| auth     | mfa_amr_claims             | 0            | 8192   | [{"column":"session_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"created_at","default":null,"nullable":false,"data_type":"timestamp with time zone"},{"column":"updated_at","default":null,"nullable":false,"data_type":"timestamp with time zone"},{"column":"authentication_method","default":null,"nullable":false,"data_type":"text"},{"column":"id","default":null,"nullable":false,"data_type":"uuid"}]                                                         |
| auth     | mfa_challenges             | -1           | 0      | [{"column":"id","default":null,"nullable":false,"data_type":"uuid"},{"column":"factor_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"created_at","default":null,"nullable":false,"data_type":"timestamp with time zone"},{"column":"verified_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"ip_address","default":null,"nullable":false,"data_type":"inet"},{"column":"otp_code","default":null,"nullable":true,"data_type":"text"},{"column":"web_authn_session_data","default":null,"nullable":true,"data_type":"jsonb"}]                                         
| auth     | mfa_factors                | -1           | 0      | [{"column":"id","default":null,"nullable":false,"data_type":"uuid"},{"column":"user_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"friendly_name","default":null,"nullable":true,"data_type":"text"},{"column":"factor_type","default":null,"nullable":false,"data_type":"auth.factor_type"},{"column":"status","default":null,"nullable":false,"data_type":"auth.factor_status"},{"column":"created_at","default":null,"nullable":false,"data_type":"timestamp with time zone"},{"column":"updated_at","default":null,"nullable":false,"data_type":"timestamp with time zone"},{"column":"secret","default":null,"nullable":true,"data_type":"text"},{"column":"phone","default":null,"nullable":true,"data_type":"text"},{"column":"last_challenged_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"web_authn_credential","default":null,"nullable":true,"data_type":"jsonb"},{"column":"web_authn_aaguid","default":null,"nullable":true,"data_type":"uuid"},{"column":"last_webauthn_challenge_data","default":null,"nullable":true,"data_type":"jsonb"}]                                                                                                 |
| auth     | oauth_authorizations       | -1           | 0      | [{"column":"id","default":null,"nullable":false,"data_type":"uuid"},{"column":"authorization_id","default":null,"nullable":false,"data_type":"text"},{"column":"client_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"user_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"redirect_uri","default":null,"nullable":false,"data_type":"text"},{"column":"scope","default":null,"nullable":false,"data_type":"text"},{"column":"state","default":null,"nullable":true,"data_type":"text"},{"column":"resource","default":null,"nullable":true,"data_type":"text"},{"column":"code_challenge","default":null,"nullable":true,"data_type":"text"},{"column":"code_challenge_method","default":null,"nullable":true,"data_type":"auth.code_challenge_method"},{"column":"response_type","default":"'code'::auth.oauth_response_type","nullable":false,"data_type":"auth.oauth_response_type"},{"column":"status","default":"'pending'::auth.oauth_authorization_status","nullable":false,"data_type":"auth.oauth_authorization_status"},{"column":"authorization_code","default":null,"nullable":true,"data_type":"text"},{"column":"created_at","default":"now()","nullable":false,"data_type":"timestamp with time zone"},{"column":"expires_at","default":"(now() + '00:03:00'::interval)","nullable":false,"data_type":"timestamp with time zone"},{"column":"approved_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"nonce","default":null,"nullable":true,"data_type":"text"}]                                                                                              |
| auth     | oauth_client_states        | -1           | 0      | [{"column":"id","default":null,"nullable":false,"data_type":"uuid"},{"column":"provider_type","default":null,"nullable":false,"data_type":"text"},{"column":"code_verifier","default":null,"nullable":true,"data_type":"text"},{"column":"created_at","default":null,"nullable":false,"data_type":"timestamp with time zone"}]                                                                                                                   |
| auth     | oauth_clients              | -1           | 0      | [{"column":"id","default":null,"nullable":false,"data_type":"uuid"},{"column":"client_secret_hash","default":null,"nullable":true,"data_type":"text"},{"column":"registration_type","default":null,"nullable":false,"data_type":"auth.oauth_registration_type"},{"column":"redirect_uris","default":null,"nullable":false,"data_type":"text"},{"column":"grant_types","default":null,"nullable":false,"data_type":"text"},{"column":"client_name","default":null,"nullable":true,"data_type":"text"},{"column":"client_uri","default":null,"nullable":true,"data_type":"text"},{"column":"logo_uri","default":null,"nullable":true,"data_type":"text"},{"column":"created_at","default":"now()","nullable":false,"data_type":"timestamp with time zone"},{"column":"updated_at","default":"now()","nullable":false,"data_type":"timestamp with time zone"},{"column":"deleted_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"client_type","default":"'confidential'::auth.oauth_client_type","nullable":false,"data_type":"auth.oauth_client_type"},{"column":"token_endpoint_auth_method","default":null,"nullable":false,"data_type":"text"}]                                                                                               |
| auth     | oauth_consents             | -1           | 0      | [{"column":"id","default":null,"nullable":false,"data_type":"uuid"},{"column":"user_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"client_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"scopes","default":null,"nullable":false,"data_type":"text"},{"column":"granted_at","default":"now()","nullable":false,"data_type":"timestamp with time zone"},{"column":"revoked_at","default":null,"nullable":true,"data_type":"timestamp with time zone"}]                                                            |
| auth     | one_time_tokens            | -1           | 8192   | [{"column":"id","default":null,"nullable":false,"data_type":"uuid"},{"column":"user_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"token_type","default":null,"nullable":false,"data_type":"auth.one_time_token_type"},{"column":"token_hash","default":null,"nullable":false,"data_type":"text"},{"column":"relates_to","default":null,"nullable":false,"data_type":"text"},{"column":"created_at","default":"now()","nullable":false,"data_type":"timestamp without time zone"},{"column":"updated_at","default":"now()","nullable":false,"data_type":"timestamp without time zone"}]                                                                         |
| auth     | refresh_tokens             | 104          | 24576  | [{"column":"instance_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"id","default":"nextval('auth.refresh_tokens_id_seq'::regclass)","nullable":false,"data_type":"bigint"},{"column":"token","default":null,"nullable":true,"data_type":"character varying(255)"},{"column":"user_id","default":null,"nullable":true,"data_type":"character varying(255)"},{"column":"revoked","default":null,"nullable":true,"data_type":"boolean"},{"column":"created_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"updated_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"parent","default":null,"nullable":true,"data_type":"character varying(255)"},{"column":"session_id","default":null,"nullable":true,"data_type":"uuid"}]                                          
| auth     | saml_providers             | -1           | 0      | [{"column":"id","default":null,"nullable":false,"data_type":"uuid"},{"column":"sso_provider_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"entity_id","default":null,"nullable":false,"data_type":"text"},{"column":"metadata_xml","default":null,"nullable":false,"data_type":"text"},{"column":"metadata_url","default":null,"nullable":true,"data_type":"text"},{"column":"attribute_mapping","default":null,"nullable":true,"data_type":"jsonb"},{"column":"created_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"updated_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"name_id_format","default":null,"nullable":true,"data_type":"text"}]                                          
| auth     | saml_relay_states          | -1           | 0      | [{"column":"id","default":null,"nullable":false,"data_type":"uuid"},{"column":"sso_provider_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"request_id","default":null,"nullable":false,"data_type":"text"},{"column":"for_email","default":null,"nullable":true,"data_type":"text"},{"column":"redirect_to","default":null,"nullable":true,"data_type":"text"},{"column":"created_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"updated_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"flow_state_id","default":null,"nullable":true,"data_type":"uuid"}]                                                                                        |
| auth     | schema_migrations          | 69           | 8192   | [{"column":"version","default":null,"nullable":false,"data_type":"character varying(255)"}]                                                                                                                 |
| auth     | sessions                   | 18           | 8192   | [{"column":"id","default":null,"nullable":false,"data_type":"uuid"},{"column":"user_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"created_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"updated_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"factor_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"aal","default":null,"nullable":true,"data_type":"auth.aal_level"},{"column":"not_after","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"refreshed_at","default":null,"nullable":true,"data_type":"timestamp without time zone"},{"column":"user_agent","default":null,"nullable":true,"data_type":"text"},{"column":"ip","default":null,"nullable":true,"data_type":"inet"},{"column":"tag","default":null,"nullable":true,"data_type":"text"},{"column":"oauth_client_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"refresh_token_hmac_key","default":null,"nullable":true,"data_type":"text"},{"column":"refresh_token_counter","default":null,"nullable":true,"data_type":"bigint"},{"column":"scopes","default":null,"nullable":true,"data_type":"text"}]                                                             |
| auth     | sso_domains                | -1           | 0      | [{"column":"id","default":null,"nullable":false,"data_type":"uuid"},{"column":"sso_provider_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"domain","default":null,"nullable":false,"data_type":"text"},{"column":"created_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"updated_at","default":null,"nullable":true,"data_type":"timestamp with time zone"}]                                                                                        |
| auth     | sso_providers              | -1           | 0      | [{"column":"id","default":null,"nullable":false,"data_type":"uuid"},{"column":"resource_id","default":null,"nullable":true,"data_type":"text"},{"column":"created_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"updated_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"disabled","default":null,"nullable":true,"data_type":"boolean"}]                                                                      |
| auth     | users                      | 7            | 24576  | [{"column":"instance_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"id","default":null,"nullable":false,"data_type":"uuid"},{"column":"aud","default":null,"nullable":true,"data_type":"character varying(255)"},{"column":"role","default":null,"nullable":true,"data_type":"character varying(255)"},{"column":"email","default":null,"nullable":true,"data_type":"character varying(255)"},{"column":"encrypted_password","default":null,"nullable":true,"data_type":"character varying(255)"},{"column":"email_confirmed_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"invited_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"confirmation_token","default":null,"nullable":true,"data_type":"character varying(255)"},{"column":"confirmation_sent_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"recovery_token","default":null,"nullable":true,"data_type":"character varying(255)"},{"column":"recovery_sent_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"email_change_token_new","default":null,"nullable":true,"data_type":"character varying(255)"},{"column":"email_change","default":null,"nullable":true,"data_type":"character varying(255)"},{"column":"email_change_sent_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"last_sign_in_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"raw_app_meta_data","default":null,"nullable":true,"data_type":"jsonb"},{"column":"raw_user_meta_data","default":null,"nullable":true,"data_type":"jsonb"},{"column":"is_super_admin","default":null,"nullable":true,"data_type":"boolean"},{"column":"created_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"updated_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"phone","default":"NULL::character varying","nullable":true,"data_type":"text"},{"column":"phone_confirmed_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"phone_change","default":"''::character varying","nullable":true,"data_type":"text"},{"column":"phone_change_token","default":"''::character varying","nullable":true,"data_type":"character varying(255)"},{"column":"phone_change_sent_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"confirmed_at","default":"LEAST(email_confirmed_at, phone_confirmed_at)","nullable":true,"data_type":"timestamp with time zone"},{"column":"email_change_token_current","default":"''::character varying","nullable":true,"data_type":"character varying(255)"},{"column":"email_change_confirm_status","default":"0","nullable":true,"data_type":"smallint"},{"column":"banned_until","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"reauthentication_token","default":"''::character varying","nullable":true,"data_type":"character varying(255)"},{"column":"reauthentication_sent_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"is_sso_user","default":"false","nullable":false,"data_type":"boolean"},{"column":"deleted_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"is_anonymous","default":"false","nullable":false,"data_type":"boolean"}] |
| public   | adjustments                | -1           | 0      | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"workbench_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"original_transaction_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"adjustment_type","default":null,"nullable":false,"data_type":"text"},{"column":"reason","default":null,"nullable":false,"data_type":"text"},{"column":"corrected_party_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"corrected_budget_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"adjustment_amount","default":null,"nullable":false,"data_type":"numeric"},{"column":"created_by","default":null,"nullable":false,"data_type":"uuid"},{"column":"created_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"},{"column":"original_entry_id","default":null,"nullable":true,"data_type":"uuid"}]                                                                     |
| public   | audit_logs                 | 51           | 49152  | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"workbench_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"user_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"action","default":null,"nullable":false,"data_type":"text"},{"column":"entity_type","default":null,"nullable":false,"data_type":"text"},{"column":"entity_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"old_data","default":null,"nullable":true,"data_type":"jsonb"},{"column":"new_data","default":null,"nullable":true,"data_type":"jsonb"},{"column":"created_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"}]                                                                                               |
| public   | budget_items               | -1           | 8192   | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"budget_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"category","default":null,"nullable":false,"data_type":"text"},{"column":"amount","default":null,"nullable":false,"data_type":"numeric"},{"column":"created_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"}]                                                                           |
| public   | budgets                    | -1           | 8192   | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"workbench_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"name","default":null,"nullable":false,"data_type":"text"},{"column":"allocated_amount","default":null,"nullable":false,"data_type":"numeric"},{"column":"created_by","default":null,"nullable":true,"data_type":"uuid"},{"column":"created_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"},{"column":"period_start","default":"CURRENT_DATE","nullable":false,"data_type":"date"},{"column":"period_end","default":"(CURRENT_DATE + '1 mon'::interval)","nullable":false,"data_type":"date"},{"column":"total_amount","default":"0","nullable":false,"data_type":"numeric"}]                                       
| public   | chat_feedback              | -1           | 8192   | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"user_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"session_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"rating","default":null,"nullable":false,"data_type":"integer"},{"column":"feedback","default":null,"nullable":true,"data_type":"text"},{"column":"created_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"}]                                                       
| public   | chat_messages              | 107          | 131072 | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"session_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"role","default":null,"nullable":true,"data_type":"text"},{"column":"content","default":null,"nullable":false,"data_type":"text"},{"column":"metadata","default":"'{}'::jsonb","nullable":true,"data_type":"jsonb"},{"column":"created_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"}]                                                       
| public   | chat_sessions              | 51           | 8192   | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"workbench_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"user_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"title","default":null,"nullable":true,"data_type":"text"},{"column":"created_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"}]                                                                                             |
| public   | compliances                | -1           | 8192   | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"workbench_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"name","default":null,"nullable":false,"data_type":"text"},{"column":"form","default":null,"nullable":true,"data_type":"text"},{"column":"deadline","default":null,"nullable":false,"data_type":"date"},{"column":"status","default":"'pending'::text","nullable":true,"data_type":"text"},{"column":"created_by","default":null,"nullable":true,"data_type":"uuid"},{"column":"created_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"},{"column":"period","default":null,"nullable":true,"data_type":"text"},{"column":"filed_date","default":null,"nullable":true,"data_type":"date"}]                                                                                |
| public   | inventory_items            | -1           | 8192   | [{"column":"id","default":"uuid_generate_v4()","nullable":false,"data_type":"uuid"},{"column":"workbench_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"name","default":null,"nullable":false,"data_type":"text"},{"column":"hsn_code","default":null,"nullable":true,"data_type":"text"},{"column":"type","default":"'product'::text","nullable":true,"data_type":"text"},{"column":"classification","default":"'asset'::text","nullable":true,"data_type":"text"},{"column":"amount","default":"0","nullable":true,"data_type":"numeric"},{"column":"quantity","default":"1","nullable":true,"data_type":"numeric"},{"column":"unit_price","default":"\nCASE\n    WHEN (quantity > (0)::numeric) THEN (amount / quantity)\n    ELSE (0)::numeric\nEND","nullable":true,"data_type":"numeric"},{"column":"description","default":null,"nullable":true,"data_type":"text"},{"column":"created_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"},{"column":"updated_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"}]                                                                                                     |
| public   | ledger_entries             | -1           | 8192   | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"workbench_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"record_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"account_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"counter_account_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"amount","default":"0","nullable":false,"data_type":"numeric"},{"column":"entry_type","default":null,"nullable":false,"data_type":"text"},{"column":"category","default":null,"nullable":true,"data_type":"text"},{"column":"description","default":null,"nullable":true,"data_type":"text"},{"column":"transaction_date","default":"CURRENT_DATE","nullable":true,"data_type":"date"},{"column":"metadata","default":"'{}'::jsonb","nullable":true,"data_type":"jsonb"},{"column":"created_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"}]                                                                            |
| public   | party_accounts             | -1           | 0      | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"party_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"account_type","default":null,"nullable":false,"data_type":"text"},{"column":"account_identifier","default":null,"nullable":false,"data_type":"text"},{"column":"account_name","default":null,"nullable":true,"data_type":"text"},{"column":"is_primary","default":"false","nullable":true,"data_type":"boolean"},{"column":"created_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"}]                                                       
| public   | plans                      | -1           | 8192   | [{"column":"id","default":null,"nullable":false,"data_type":"text"},{"column":"name","default":null,"nullable":false,"data_type":"text"},{"column":"max_workbenches","default":null,"nullable":false,"data_type":"integer"},{"column":"max_chat_sessions","default":null,"nullable":false,"data_type":"integer"},{"column":"retention_days","default":null,"nullable":false,"data_type":"integer"},{"column":"price_inr","default":null,"nullable":false,"data_type":"integer"},{"column":"created_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"}]                                                       
| public   | transactions               | 1            | 8192   | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"workbench_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"amount","default":null,"nullable":false,"data_type":"numeric"},{"column":"direction","default":null,"nullable":false,"data_type":"text"},{"column":"transaction_date","default":null,"nullable":false,"data_type":"date"},{"column":"payment_type","default":null,"nullable":false,"data_type":"text"},{"column":"party_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"party_account_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"workbench_account_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"external_reference","default":null,"nullable":true,"data_type":"text"},{"column":"source_document_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"purpose","default":null,"nullable":true,"data_type":"text"},{"column":"created_by","default":null,"nullable":true,"data_type":"uuid"},{"column":"created_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"},{"column":"status","default":"'completed'::text","nullable":false,"data_type":"text"}]                                                                                             |
| public   | usage_counters             | -1           | 8192   | [{"column":"user_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"subscription_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"month","default":null,"nullable":false,"data_type":"date"},{"column":"chat_sessions","default":"0","nullable":true,"data_type":"integer"},{"column":"workbenches_created","default":"0","nullable":true,"data_type":"integer"},{"column":"created_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"}]                                                       
| public   | user_profiles              | -1           | 8192   | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"user_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"name","default":null,"nullable":false,"data_type":"text"},{"column":"role","default":null,"nullable":false,"data_type":"text"},{"column":"contact_number","default":null,"nullable":true,"data_type":"text"},{"column":"created_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"},{"column":"updated_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"},{"column":"status","default":"'partial'::text","nullable":false,"data_type":"text"},{"column":"job_title","default":null,"nullable":true,"data_type":"text"},{"column":"industry","default":null,"nullable":true,"data_type":"text"},{"column":"company_size","default":null,"nullable":true,"data_type":"text"},{"column":"company_name","default":null,"nullable":true,"data_type":"text"},{"column":"cin","default":null,"nullable":true,"data_type":"text"},{"column":"pan","default":null,"nullable":true,"data_type":"text"},{"column":"director_name","default":null,"nullable":true,"data_type":"text"},{"column":"domain","default":null,"nullable":true,"data_type":"text"},{"column":"zoho_integration","default":"false","nullable":true,"data_type":"boolean"}]                                                                                             |
| public   | user_subscriptions         | -1           | 8192   | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"user_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"plan_id","default":null,"nullable":false,"data_type":"text"},{"column":"status","default":null,"nullable":false,"data_type":"text"},{"column":"started_at","default":null,"nullable":false,"data_type":"timestamp with time zone"},{"column":"expires_at","default":null,"nullable":false,"data_type":"timestamp with time zone"},{"column":"created_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"}]                                                                             |
| public   | workbench_accounts         | -1           | 8192   | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"workbench_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"account_type","default":null,"nullable":false,"data_type":"text"},{"column":"name","default":null,"nullable":false,"data_type":"text"},{"column":"account_identifier","default":null,"nullable":true,"data_type":"text"},{"column":"provider","default":null,"nullable":true,"data_type":"text"},{"column":"is_active","default":"true","nullable":true,"data_type":"boolean"},{"column":"created_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"},{"column":"category","default":"'General'::text","nullable":false,"data_type":"text"},{"column":"cash_impact","default":"false","nullable":true,"data_type":"boolean"}]                                                                                                     |
| public   | workbench_documents        | 6            | 8192   | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"workbench_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"file_path","default":null,"nullable":false,"data_type":"text"},{"column":"document_type","default":null,"nullable":true,"data_type":"text"},{"column":"processing_status","default":"'UPLOADED'::text","nullable":true,"data_type":"text"},{"column":"uploaded_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"},{"column":"file_name","default":null,"nullable":true,"data_type":"text"},{"column":"file_size","default":null,"nullable":true,"data_type":"bigint"},{"column":"mime_type","default":null,"nullable":true,"data_type":"text"},{"column":"extracted_text","default":null,"nullable":true,"data_type":"text"},{"column":"uploaded_by","default":null,"nullable":true,"data_type":"uuid"}]                                                                                                                                                       |
| public   | workbench_invites          | -1           | 8192   | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"workbench_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"email","default":null,"nullable":false,"data_type":"text"},{"column":"role","default":null,"nullable":false,"data_type":"text"},{"column":"invited_by","default":null,"nullable":false,"data_type":"uuid"},{"column":"token","default":null,"nullable":false,"data_type":"text"},{"column":"expires_at","default":null,"nullable":false,"data_type":"timestamp with time zone"},{"column":"accepted_at","default":null,"nullable":true,"data_type":"timestamp with time zone"},{"column":"created_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"}]                                                                                                                  |
| public   | workbench_members          | -1           | 8192   | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"workbench_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"user_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"role","default":null,"nullable":false,"data_type":"text"},{"column":"invited_by","default":null,"nullable":true,"data_type":"uuid"},{"column":"created_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"}]                                                                                                                            |
| public   | workbench_parties          | -1           | 8192   | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"workbench_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"name","default":null,"nullable":false,"data_type":"text"},{"column":"party_type","default":null,"nullable":false,"data_type":"text"},{"column":"gstin","default":null,"nullable":true,"data_type":"text"},{"column":"pan","default":null,"nullable":true,"data_type":"text"},{"column":"is_active","default":"true","nullable":true,"data_type":"boolean"},{"column":"created_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"},{"column":"updated_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"}]                                                                                                                                     |
| public   | workbench_records          | 172          | 98304  | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"workbench_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"record_type","default":null,"nullable":false,"data_type":"text"},{"column":"reference_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"summary","default":null,"nullable":true,"data_type":"text"},{"column":"metadata","default":null,"nullable":true,"data_type":"jsonb"},{"column":"created_by","default":null,"nullable":true,"data_type":"uuid"},{"column":"created_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"},{"column":"party_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"gross_amount","default":"0","nullable":true,"data_type":"numeric"},{"column":"tax_amount","default":"0","nullable":true,"data_type":"numeric"},{"column":"net_amount","default":"0","nullable":true,"data_type":"numeric"},{"column":"issue_date","default":null,"nullable":true,"data_type":"date"},{"column":"due_date","default":null,"nullable":true,"data_type":"date"},{"column":"status","default":"'draft'::text","nullable":true,"data_type":"text"},{"column":"confidence_score","default":"0.5","nullable":true,"data_type":"numeric"},{"column":"document_id","default":null,"nullable":true,"data_type":"uuid"}]                                                                                                                                                     |
| public   | workbenches                | -1           | 8192   | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"name","default":null,"nullable":false,"data_type":"text"},{"column":"description","default":null,"nullable":true,"data_type":"text"},{"column":"owner_user_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"created_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"},{"column":"updated_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"},{"column":"status","default":"'active'::text","nullable":true,"data_type":"text"},{"column":"state","default":"'CREATED'::text","nullable":false,"data_type":"text"},{"column":"history_window_months","default":"12","nullable":true,"data_type":"integer"},{"column":"books_start_date","default":null,"nullable":true,"data_type":"date"}]                                                                                                                                                                                                       |
| realtime | schema_migrations          | 64           | 8192   | [{"column":"version","default":null,"nullable":false,"data_type":"bigint"},{"column":"inserted_at","default":null,"nullable":true,"data_type":"timestamp(0) without time zone"}]                                                                                                                                                                           |
| realtime | subscription               | -1           | 0      | [{"column":"id","default":null,"nullable":false,"data_type":"bigint"},{"column":"subscription_id","default":null,"nullable":false,"data_type":"uuid"},{"column":"entity","default":null,"nullable":false,"data_type":"regclass"},{"column":"filters","default":"'{}'::realtime.user_defined_filter[]","nullable":false,"data_type":"realtime.user_defined_filter[]"},{"column":"claims","default":null,"nullable":false,"data_type":"jsonb"},{"column":"claims_role","default":"realtime.to_regrole((claims ->> 'role'::text))","nullable":false,"data_type":"regrole"},{"column":"created_at","default":"timezone('utc'::text, now())","nullable":false,"data_type":"timestamp without time zone"},{"column":"action_filter","default":"'*'::text","nullable":true,"data_type":"text"}]                                                                                                                                                 |
| storage  | buckets                    | -1           | 8192   | [{"column":"id","default":null,"nullable":false,"data_type":"text"},{"column":"name","default":null,"nullable":false,"data_type":"text"},{"column":"owner","default":null,"nullable":true,"data_type":"uuid"},{"column":"created_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"},{"column":"updated_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"},{"column":"public","default":"false","nullable":true,"data_type":"boolean"},{"column":"avif_autodetection","default":"false","nullable":true,"data_type":"boolean"},{"column":"file_size_limit","default":null,"nullable":true,"data_type":"bigint"},{"column":"allowed_mime_types","default":null,"nullable":true,"data_type":"text[]"},{"column":"owner_id","default":null,"nullable":true,"data_type":"text"},{"column":"type","default":"'STANDARD'::storage.buckettype","nullable":false,"data_type":"storage.buckettype"}]                                                                                                                    |
| storage  | buckets_analytics          | -1           | 0      | [{"column":"name","default":null,"nullable":false,"data_type":"text"},{"column":"type","default":"'ANALYTICS'::storage.buckettype","nullable":false,"data_type":"storage.buckettype"},{"column":"format","default":"'ICEBERG'::text","nullable":false,"data_type":"text"},{"column":"created_at","default":"now()","nullable":false,"data_type":"timestamp with time zone"},{"column":"updated_at","default":"now()","nullable":false,"data_type":"timestamp with time zone"},{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"deleted_at","default":null,"nullable":true,"data_type":"timestamp with time zone"}]                                                                                                                                                  |
| storage  | buckets_vectors            | -1           | 0      | [{"column":"id","default":null,"nullable":false,"data_type":"text"},{"column":"type","default":"'VECTOR'::storage.buckettype","nullable":false,"data_type":"storage.buckettype"},{"column":"created_at","default":"now()","nullable":false,"data_type":"timestamp with time zone"},{"column":"updated_at","default":"now()","nullable":false,"data_type":"timestamp with time zone"}]                                                                                                                                                                   |
| storage  | migrations                 | -1           | 16384  | [{"column":"id","default":null,"nullable":false,"data_type":"integer"},{"column":"name","default":null,"nullable":false,"data_type":"character varying(100)"},{"column":"hash","default":null,"nullable":false,"data_type":"character varying(40)"},{"column":"executed_at","default":"CURRENT_TIMESTAMP","nullable":true,"data_type":"timestamp without time zone"}]                                                                                                                    |
| storage  | objects                    | 21           | 40960  | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"bucket_id","default":null,"nullable":true,"data_type":"text"},{"column":"name","default":null,"nullable":true,"data_type":"text"},{"column":"owner","default":null,"nullable":true,"data_type":"uuid"},{"column":"created_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"},{"column":"updated_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"},{"column":"last_accessed_at","default":"now()","nullable":true,"data_type":"timestamp with time zone"},{"column":"metadata","default":null,"nullable":true,"data_type":"jsonb"},{"column":"path_tokens","default":"string_to_array(name, '/'::text)","nullable":true,"data_type":"text[]"},{"column":"version","default":null,"nullable":true,"data_type":"text"},{"column":"owner_id","default":null,"nullable":true,"data_type":"text"},{"column":"user_metadata","default":null,"nullable":true,"data_type":"jsonb"}]                                                                                                 |
| storage  | s3_multipart_uploads       | -1           | 0      | [{"column":"id","default":null,"nullable":false,"data_type":"text"},{"column":"in_progress_size","default":"0","nullable":false,"data_type":"bigint"},{"column":"upload_signature","default":null,"nullable":false,"data_type":"text"},{"column":"bucket_id","default":null,"nullable":false,"data_type":"text"},{"column":"key","default":null,"nullable":false,"data_type":"text"},{"column":"version","default":null,"nullable":false,"data_type":"text"},{"column":"owner_id","default":null,"nullable":true,"data_type":"text"},{"column":"created_at","default":"now()","nullable":false,"data_type":"timestamp with time zone"},{"column":"user_metadata","default":null,"nullable":true,"data_type":"jsonb"}]                                                                                                                                                       |
| storage  | s3_multipart_uploads_parts | -1           | 0      | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"upload_id","default":null,"nullable":false,"data_type":"text"},{"column":"size","default":"0","nullable":false,"data_type":"bigint"},{"column":"part_number","default":null,"nullable":false,"data_type":"integer"},{"column":"bucket_id","default":null,"nullable":false,"data_type":"text"},{"column":"key","default":null,"nullable":false,"data_type":"text"},{"column":"etag","default":null,"nullable":false,"data_type":"text"},{"column":"owner_id","default":null,"nullable":true,"data_type":"text"},{"column":"version","default":null,"nullable":false,"data_type":"text"},{"column":"created_at","default":"now()","nullable":false,"data_type":"timestamp with time zone"}]                                                                                                                                                  |
| storage  | vector_indexes             | -1           | 0      | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"text"},{"column":"name","default":null,"nullable":false,"data_type":"text"},{"column":"bucket_id","default":null,"nullable":false,"data_type":"text"},{"column":"data_type","default":null,"nullable":false,"data_type":"text"},{"column":"dimension","default":null,"nullable":false,"data_type":"integer"},{"column":"distance_metric","default":null,"nullable":false,"data_type":"text"},{"column":"metadata_configuration","default":null,"nullable":true,"data_type":"jsonb"},{"column":"created_at","default":"now()","nullable":false,"data_type":"timestamp with time zone"},{"column":"updated_at","default":"now()","nullable":false,"data_type":"timestamp with time zone"}]                                                                                                          |
| vault    | secrets                    | -1           | 8192   | [{"column":"id","default":"gen_random_uuid()","nullable":false,"data_type":"uuid"},{"column":"name","default":null,"nullable":true,"data_type":"text"},{"column":"description","default":"''::text","nullable":false,"data_type":"text"},{"column":"secret","default":null,"nullable":false,"data_type":"text"},{"column":"key_id","default":null,"nullable":true,"data_type":"uuid"},{"column":"nonce","default":"vault._crypto_aead_det_noncegen()","nullable":true,"data_type":"bytea"},{"column":"created_at","default":"CURRENT_TIMESTAMP","nullable":false,"data_type":"timestamp with time zone"},{"column":"updated_at","default":"CURRENT_TIMESTAMP","nullable":false,"data_type":"timestamp with time zone"}]                                                       



function details md

[
  {
    "schema": "auth",
    "function_name": "email",
    "definition": "CREATE OR REPLACE FUNCTION auth.email()\n RETURNS text\n LANGUAGE sql\n STABLE\nAS $function$\n  select \n  coalesce(\n    nullif(current_setting('request.jwt.claim.email', true), ''),\n    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')\n  )::text\n$function$\n"
  },
  {
    "schema": "auth",
    "function_name": "jwt",
    "definition": "CREATE OR REPLACE FUNCTION auth.jwt()\n RETURNS jsonb\n LANGUAGE sql\n STABLE\nAS $function$\n  select \n    coalesce(\n        nullif(current_setting('request.jwt.claim', true), ''),\n        nullif(current_setting('request.jwt.claims', true), '')\n    )::jsonb\n$function$\n"
  },
  {
    "schema": "auth",
    "function_name": "role",
    "definition": "CREATE OR REPLACE FUNCTION auth.role()\n RETURNS text\n LANGUAGE sql\n STABLE\nAS $function$\n  select \n  coalesce(\n    nullif(current_setting('request.jwt.claim.role', true), ''),\n    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')\n  )::text\n$function$\n"
  },
  {
    "schema": "auth",
    "function_name": "uid",
    "definition": "CREATE OR REPLACE FUNCTION auth.uid()\n RETURNS uuid\n LANGUAGE sql\n STABLE\nAS $function$\n  select \n  coalesce(\n    nullif(current_setting('request.jwt.claim.sub', true), ''),\n    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')\n  )::uuid\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "accept_invite",
    "definition": "CREATE OR REPLACE FUNCTION public.accept_invite(invite_token text)\n RETURNS json\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\ndeclare\r\n  invite_record record;\r\n  current_user_id uuid;\r\n  existing_member_id uuid;\r\nbegin\r\n  current_user_id := auth.uid();\r\n  if current_user_id is null then\r\n    return json_build_object('error', 'User not authenticated');\r\n  end if;\r\n\r\n  select * into invite_record from public.workbench_invites where token = invite_token;\r\n\r\n  if invite_record.id is null then return json_build_object('error', 'Invalid token'); end if;\r\n  if invite_record.accepted_at is not null then return json_build_object('error', 'Invite already accepted'); end if;\r\n  if invite_record.expires_at < now() then return json_build_object('error', 'Invite expired'); end if;\r\n\r\n  select id into existing_member_id from public.workbench_members \r\n  where workbench_id = invite_record.workbench_id and user_id = current_user_id;\r\n  \r\n  if existing_member_id is not null then\r\n     update public.workbench_invites set accepted_at = now() where id = invite_record.id;\r\n     return json_build_object('success', true, 'workbench_id', invite_record.workbench_id, 'message', 'Already a member');\r\n  end if;\r\n\r\n  insert into public.workbench_members (workbench_id, user_id, role, invited_by)\r\n  values (invite_record.workbench_id, current_user_id, invite_record.role, invite_record.invited_by);\r\n\r\n  update public.workbench_invites set accepted_at = now() where id = invite_record.id;\r\n\r\n  return json_build_object('success', true, 'workbench_id', invite_record.workbench_id);\r\nend;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "array_to_halfvec",
    "definition": "CREATE OR REPLACE FUNCTION public.array_to_halfvec(real[], integer, boolean)\n RETURNS halfvec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$array_to_halfvec$function$\n"
  },
  {
    "schema": "public",
    "function_name": "array_to_halfvec",
    "definition": "CREATE OR REPLACE FUNCTION public.array_to_halfvec(integer[], integer, boolean)\n RETURNS halfvec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$array_to_halfvec$function$\n"
  },
  {
    "schema": "public",
    "function_name": "array_to_halfvec",
    "definition": "CREATE OR REPLACE FUNCTION public.array_to_halfvec(double precision[], integer, boolean)\n RETURNS halfvec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$array_to_halfvec$function$\n"
  },
  {
    "schema": "public",
    "function_name": "array_to_halfvec",
    "definition": "CREATE OR REPLACE FUNCTION public.array_to_halfvec(numeric[], integer, boolean)\n RETURNS halfvec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$array_to_halfvec$function$\n"
  },
  {
    "schema": "public",
    "function_name": "array_to_sparsevec",
    "definition": "CREATE OR REPLACE FUNCTION public.array_to_sparsevec(integer[], integer, boolean)\n RETURNS sparsevec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$array_to_sparsevec$function$\n"
  },
  {
    "schema": "public",
    "function_name": "array_to_sparsevec",
    "definition": "CREATE OR REPLACE FUNCTION public.array_to_sparsevec(double precision[], integer, boolean)\n RETURNS sparsevec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$array_to_sparsevec$function$\n"
  },
  {
    "schema": "public",
    "function_name": "array_to_sparsevec",
    "definition": "CREATE OR REPLACE FUNCTION public.array_to_sparsevec(real[], integer, boolean)\n RETURNS sparsevec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$array_to_sparsevec$function$\n"
  },
  {
    "schema": "public",
    "function_name": "array_to_sparsevec",
    "definition": "CREATE OR REPLACE FUNCTION public.array_to_sparsevec(numeric[], integer, boolean)\n RETURNS sparsevec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$array_to_sparsevec$function$\n"
  },
  {
    "schema": "public",
    "function_name": "array_to_vector",
    "definition": "CREATE OR REPLACE FUNCTION public.array_to_vector(double precision[], integer, boolean)\n RETURNS vector\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$array_to_vector$function$\n"
  },
  {
    "schema": "public",
    "function_name": "array_to_vector",
    "definition": "CREATE OR REPLACE FUNCTION public.array_to_vector(real[], integer, boolean)\n RETURNS vector\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$array_to_vector$function$\n"
  },
  {
    "schema": "public",
    "function_name": "array_to_vector",
    "definition": "CREATE OR REPLACE FUNCTION public.array_to_vector(numeric[], integer, boolean)\n RETURNS vector\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$array_to_vector$function$\n"
  },
  {
    "schema": "public",
    "function_name": "array_to_vector",
    "definition": "CREATE OR REPLACE FUNCTION public.array_to_vector(integer[], integer, boolean)\n RETURNS vector\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$array_to_vector$function$\n"
  },
  {
    "schema": "public",
    "function_name": "binary_quantize",
    "definition": "CREATE OR REPLACE FUNCTION public.binary_quantize(vector)\n RETURNS bit\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$binary_quantize$function$\n"
  },
  {
    "schema": "public",
    "function_name": "binary_quantize",
    "definition": "CREATE OR REPLACE FUNCTION public.binary_quantize(halfvec)\n RETURNS bit\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_binary_quantize$function$\n"
  },
  {
    "schema": "public",
    "function_name": "citext",
    "definition": "CREATE OR REPLACE FUNCTION public.citext(inet)\n RETURNS citext\n LANGUAGE internal\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$network_show$function$\n"
  },
  {
    "schema": "public",
    "function_name": "citext",
    "definition": "CREATE OR REPLACE FUNCTION public.citext(character)\n RETURNS citext\n LANGUAGE internal\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$rtrim1$function$\n"
  },
  {
    "schema": "public",
    "function_name": "citext",
    "definition": "CREATE OR REPLACE FUNCTION public.citext(boolean)\n RETURNS citext\n LANGUAGE internal\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$booltext$function$\n"
  },
  {
    "schema": "public",
    "function_name": "citext_cmp",
    "definition": "CREATE OR REPLACE FUNCTION public.citext_cmp(citext, citext)\n RETURNS integer\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/citext', $function$citext_cmp$function$\n"
  },
  {
    "schema": "public",
    "function_name": "citext_eq",
    "definition": "CREATE OR REPLACE FUNCTION public.citext_eq(citext, citext)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/citext', $function$citext_eq$function$\n"
  },
  {
    "schema": "public",
    "function_name": "citext_ge",
    "definition": "CREATE OR REPLACE FUNCTION public.citext_ge(citext, citext)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/citext', $function$citext_ge$function$\n"
  },
  {
    "schema": "public",
    "function_name": "citext_gt",
    "definition": "CREATE OR REPLACE FUNCTION public.citext_gt(citext, citext)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/citext', $function$citext_gt$function$\n"
  },
  {
    "schema": "public",
    "function_name": "citext_hash",
    "definition": "CREATE OR REPLACE FUNCTION public.citext_hash(citext)\n RETURNS integer\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/citext', $function$citext_hash$function$\n"
  },
  {
    "schema": "public",
    "function_name": "citext_hash_extended",
    "definition": "CREATE OR REPLACE FUNCTION public.citext_hash_extended(citext, bigint)\n RETURNS bigint\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/citext', $function$citext_hash_extended$function$\n"
  },
  {
    "schema": "public",
    "function_name": "citext_larger",
    "definition": "CREATE OR REPLACE FUNCTION public.citext_larger(citext, citext)\n RETURNS citext\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/citext', $function$citext_larger$function$\n"
  },
  {
    "schema": "public",
    "function_name": "citext_le",
    "definition": "CREATE OR REPLACE FUNCTION public.citext_le(citext, citext)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/citext', $function$citext_le$function$\n"
  },
  {
    "schema": "public",
    "function_name": "citext_lt",
    "definition": "CREATE OR REPLACE FUNCTION public.citext_lt(citext, citext)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/citext', $function$citext_lt$function$\n"
  },
  {
    "schema": "public",
    "function_name": "citext_ne",
    "definition": "CREATE OR REPLACE FUNCTION public.citext_ne(citext, citext)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/citext', $function$citext_ne$function$\n"
  },
  {
    "schema": "public",
    "function_name": "citext_pattern_cmp",
    "definition": "CREATE OR REPLACE FUNCTION public.citext_pattern_cmp(citext, citext)\n RETURNS integer\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/citext', $function$citext_pattern_cmp$function$\n"
  },
  {
    "schema": "public",
    "function_name": "citext_pattern_ge",
    "definition": "CREATE OR REPLACE FUNCTION public.citext_pattern_ge(citext, citext)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/citext', $function$citext_pattern_ge$function$\n"
  },
  {
    "schema": "public",
    "function_name": "citext_pattern_gt",
    "definition": "CREATE OR REPLACE FUNCTION public.citext_pattern_gt(citext, citext)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/citext', $function$citext_pattern_gt$function$\n"
  },
  {
    "schema": "public",
    "function_name": "citext_pattern_le",
    "definition": "CREATE OR REPLACE FUNCTION public.citext_pattern_le(citext, citext)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/citext', $function$citext_pattern_le$function$\n"
  },
  {
    "schema": "public",
    "function_name": "citext_pattern_lt",
    "definition": "CREATE OR REPLACE FUNCTION public.citext_pattern_lt(citext, citext)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/citext', $function$citext_pattern_lt$function$\n"
  },
  {
    "schema": "public",
    "function_name": "citext_smaller",
    "definition": "CREATE OR REPLACE FUNCTION public.citext_smaller(citext, citext)\n RETURNS citext\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/citext', $function$citext_smaller$function$\n"
  },
  {
    "schema": "public",
    "function_name": "citextin",
    "definition": "CREATE OR REPLACE FUNCTION public.citextin(cstring)\n RETURNS citext\n LANGUAGE internal\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$textin$function$\n"
  },
  {
    "schema": "public",
    "function_name": "citextout",
    "definition": "CREATE OR REPLACE FUNCTION public.citextout(citext)\n RETURNS cstring\n LANGUAGE internal\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$textout$function$\n"
  },
  {
    "schema": "public",
    "function_name": "citextrecv",
    "definition": "CREATE OR REPLACE FUNCTION public.citextrecv(internal)\n RETURNS citext\n LANGUAGE internal\n STABLE PARALLEL SAFE STRICT\nAS $function$textrecv$function$\n"
  },
  {
    "schema": "public",
    "function_name": "citextsend",
    "definition": "CREATE OR REPLACE FUNCTION public.citextsend(citext)\n RETURNS bytea\n LANGUAGE internal\n STABLE PARALLEL SAFE STRICT\nAS $function$textsend$function$\n"
  },
  {
    "schema": "public",
    "function_name": "cosine_distance",
    "definition": "CREATE OR REPLACE FUNCTION public.cosine_distance(halfvec, halfvec)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_cosine_distance$function$\n"
  },
  {
    "schema": "public",
    "function_name": "cosine_distance",
    "definition": "CREATE OR REPLACE FUNCTION public.cosine_distance(vector, vector)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$cosine_distance$function$\n"
  },
  {
    "schema": "public",
    "function_name": "cosine_distance",
    "definition": "CREATE OR REPLACE FUNCTION public.cosine_distance(sparsevec, sparsevec)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$sparsevec_cosine_distance$function$\n"
  },
  {
    "schema": "public",
    "function_name": "current_auth_uid",
    "definition": "CREATE OR REPLACE FUNCTION public.current_auth_uid()\n RETURNS uuid\n LANGUAGE sql\n STABLE\nAS $function$\r\n    SELECT auth.uid();\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec(halfvec, integer, boolean)\n RETURNS halfvec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_accum",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_accum(double precision[], halfvec)\n RETURNS double precision[]\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_accum$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_add",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_add(halfvec, halfvec)\n RETURNS halfvec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_add$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_avg",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_avg(double precision[])\n RETURNS halfvec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_avg$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_cmp",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_cmp(halfvec, halfvec)\n RETURNS integer\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_cmp$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_combine",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_combine(double precision[], double precision[])\n RETURNS double precision[]\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_combine$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_concat",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_concat(halfvec, halfvec)\n RETURNS halfvec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_concat$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_eq",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_eq(halfvec, halfvec)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_eq$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_ge",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_ge(halfvec, halfvec)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_ge$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_gt",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_gt(halfvec, halfvec)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_gt$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_in",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_in(cstring, oid, integer)\n RETURNS halfvec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_in$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_l2_squared_distance",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_l2_squared_distance(halfvec, halfvec)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_l2_squared_distance$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_le",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_le(halfvec, halfvec)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_le$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_lt",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_lt(halfvec, halfvec)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_lt$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_mul",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_mul(halfvec, halfvec)\n RETURNS halfvec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_mul$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_ne",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_ne(halfvec, halfvec)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_ne$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_negative_inner_product",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_negative_inner_product(halfvec, halfvec)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_negative_inner_product$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_out",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_out(halfvec)\n RETURNS cstring\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_out$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_recv",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_recv(internal, oid, integer)\n RETURNS halfvec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_recv$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_send",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_send(halfvec)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_send$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_spherical_distance",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_spherical_distance(halfvec, halfvec)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_spherical_distance$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_sub",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_sub(halfvec, halfvec)\n RETURNS halfvec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_sub$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_to_float4",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_to_float4(halfvec, integer, boolean)\n RETURNS real[]\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_to_float4$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_to_sparsevec",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_to_sparsevec(halfvec, integer, boolean)\n RETURNS sparsevec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_to_sparsevec$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_to_vector",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_to_vector(halfvec, integer, boolean)\n RETURNS vector\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_to_vector$function$\n"
  },
  {
    "schema": "public",
    "function_name": "halfvec_typmod_in",
    "definition": "CREATE OR REPLACE FUNCTION public.halfvec_typmod_in(cstring[])\n RETURNS integer\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_typmod_in$function$\n"
  },
  {
    "schema": "public",
    "function_name": "hamming_distance",
    "definition": "CREATE OR REPLACE FUNCTION public.hamming_distance(bit, bit)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$hamming_distance$function$\n"
  },
  {
    "schema": "public",
    "function_name": "handle_new_user",
    "definition": "CREATE OR REPLACE FUNCTION public.handle_new_user()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\r\ndeclare\r\n  default_name text;\r\n  new_subscription_id uuid;\r\nbegin\r\n  -- 1. Get a default name from email\r\n  default_name := split_part(new.email, '@', 1);\r\n  if default_name = '' or default_name is null then\r\n    default_name := 'New User';\r\n  end if;\r\n\r\n  -- 2. Create User Profile\r\n  begin\r\n    insert into public.user_profiles (user_id, name, status, role)\r\n    values (\r\n      new.id,\r\n      coalesce(new.raw_user_meta_data->>'full_name', default_name),\r\n      'partial',\r\n      'founder'\r\n    )\r\n    on conflict (user_id) do nothing;\r\n  exception when others then\r\n    raise warning 'Error creating user profile: %', SQLERRM;\r\n  end;\r\n\r\n  -- 3. Initialize Free Subscription\r\n  begin\r\n    insert into public.user_subscriptions (user_id, plan_id, status, started_at, expires_at)\r\n    values (\r\n      new.id,\r\n      'free',\r\n      'active',\r\n      now(),\r\n      now() + interval '10 years' -- Long term for free plan\r\n    )\r\n    on conflict (user_id) do nothing\r\n    returning id into new_subscription_id;\r\n\r\n    -- 4. Initialize Usage Counter if subscription was created\r\n    if new_subscription_id is not null then\r\n      insert into public.usage_counters (user_id, subscription_id, month)\r\n      values (\r\n        new.id,\r\n        new_subscription_id,\r\n        date_trunc('month', now())::date\r\n      )\r\n      on conflict do nothing;\r\n    end if;\r\n  exception when others then\r\n    raise warning 'Error initializing subscription/usage: %', SQLERRM;\r\n  end;\r\n  \r\n  return new;\r\nexception when others then\r\n  -- Final safety net to ensure auth.users record is always created\r\n  raise warning 'Critical error in handle_new_user: %', SQLERRM;\r\n  return new;\r\nend;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "hnsw_bit_support",
    "definition": "CREATE OR REPLACE FUNCTION public.hnsw_bit_support(internal)\n RETURNS internal\n LANGUAGE c\nAS '$libdir/vector', $function$hnsw_bit_support$function$\n"
  },
  {
    "schema": "public",
    "function_name": "hnsw_halfvec_support",
    "definition": "CREATE OR REPLACE FUNCTION public.hnsw_halfvec_support(internal)\n RETURNS internal\n LANGUAGE c\nAS '$libdir/vector', $function$hnsw_halfvec_support$function$\n"
  },
  {
    "schema": "public",
    "function_name": "hnsw_sparsevec_support",
    "definition": "CREATE OR REPLACE FUNCTION public.hnsw_sparsevec_support(internal)\n RETURNS internal\n LANGUAGE c\nAS '$libdir/vector', $function$hnsw_sparsevec_support$function$\n"
  },
  {
    "schema": "public",
    "function_name": "hnswhandler",
    "definition": "CREATE OR REPLACE FUNCTION public.hnswhandler(internal)\n RETURNS index_am_handler\n LANGUAGE c\nAS '$libdir/vector', $function$hnswhandler$function$\n"
  },
  {
    "schema": "public",
    "function_name": "inner_product",
    "definition": "CREATE OR REPLACE FUNCTION public.inner_product(halfvec, halfvec)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_inner_product$function$\n"
  },
  {
    "schema": "public",
    "function_name": "inner_product",
    "definition": "CREATE OR REPLACE FUNCTION public.inner_product(sparsevec, sparsevec)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$sparsevec_inner_product$function$\n"
  },
  {
    "schema": "public",
    "function_name": "inner_product",
    "definition": "CREATE OR REPLACE FUNCTION public.inner_product(vector, vector)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$inner_product$function$\n"
  },
  {
    "schema": "public",
    "function_name": "is_workbench_member",
    "definition": "CREATE OR REPLACE FUNCTION public.is_workbench_member(wb_id uuid)\n RETURNS boolean\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nbegin\n  return exists (\n    select 1 from public.workbench_members\n    where workbench_id = wb_id\n    and user_id = auth.uid()\n  );\nend;\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "ivfflat_bit_support",
    "definition": "CREATE OR REPLACE FUNCTION public.ivfflat_bit_support(internal)\n RETURNS internal\n LANGUAGE c\nAS '$libdir/vector', $function$ivfflat_bit_support$function$\n"
  },
  {
    "schema": "public",
    "function_name": "ivfflat_halfvec_support",
    "definition": "CREATE OR REPLACE FUNCTION public.ivfflat_halfvec_support(internal)\n RETURNS internal\n LANGUAGE c\nAS '$libdir/vector', $function$ivfflat_halfvec_support$function$\n"
  },
  {
    "schema": "public",
    "function_name": "ivfflathandler",
    "definition": "CREATE OR REPLACE FUNCTION public.ivfflathandler(internal)\n RETURNS index_am_handler\n LANGUAGE c\nAS '$libdir/vector', $function$ivfflathandler$function$\n"
  },
  {
    "schema": "public",
    "function_name": "jaccard_distance",
    "definition": "CREATE OR REPLACE FUNCTION public.jaccard_distance(bit, bit)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$jaccard_distance$function$\n"
  },
  {
    "schema": "public",
    "function_name": "l1_distance",
    "definition": "CREATE OR REPLACE FUNCTION public.l1_distance(sparsevec, sparsevec)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$sparsevec_l1_distance$function$\n"
  },
  {
    "schema": "public",
    "function_name": "l1_distance",
    "definition": "CREATE OR REPLACE FUNCTION public.l1_distance(halfvec, halfvec)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_l1_distance$function$\n"
  },
  {
    "schema": "public",
    "function_name": "l1_distance",
    "definition": "CREATE OR REPLACE FUNCTION public.l1_distance(vector, vector)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$l1_distance$function$\n"
  },
  {
    "schema": "public",
    "function_name": "l2_distance",
    "definition": "CREATE OR REPLACE FUNCTION public.l2_distance(sparsevec, sparsevec)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$sparsevec_l2_distance$function$\n"
  },
  {
    "schema": "public",
    "function_name": "l2_distance",
    "definition": "CREATE OR REPLACE FUNCTION public.l2_distance(vector, vector)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$l2_distance$function$\n"
  },
  {
    "schema": "public",
    "function_name": "l2_distance",
    "definition": "CREATE OR REPLACE FUNCTION public.l2_distance(halfvec, halfvec)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_l2_distance$function$\n"
  },
  {
    "schema": "public",
    "function_name": "l2_norm",
    "definition": "CREATE OR REPLACE FUNCTION public.l2_norm(sparsevec)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$sparsevec_l2_norm$function$\n"
  },
  {
    "schema": "public",
    "function_name": "l2_norm",
    "definition": "CREATE OR REPLACE FUNCTION public.l2_norm(halfvec)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_l2_norm$function$\n"
  },
  {
    "schema": "public",
    "function_name": "l2_normalize",
    "definition": "CREATE OR REPLACE FUNCTION public.l2_normalize(vector)\n RETURNS vector\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$l2_normalize$function$\n"
  },
  {
    "schema": "public",
    "function_name": "l2_normalize",
    "definition": "CREATE OR REPLACE FUNCTION public.l2_normalize(halfvec)\n RETURNS halfvec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_l2_normalize$function$\n"
  },
  {
    "schema": "public",
    "function_name": "l2_normalize",
    "definition": "CREATE OR REPLACE FUNCTION public.l2_normalize(sparsevec)\n RETURNS sparsevec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$sparsevec_l2_normalize$function$\n"
  },
  {
    "schema": "public",
    "function_name": "process_new_transaction",
    "definition": "CREATE OR REPLACE FUNCTION public.process_new_transaction()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\ndeclare\r\n  v_entry_type text;\r\n  v_record_id uuid;\r\nbegin\r\n  -- Determine entry type based on transaction direction\r\n  -- If money comes IN (credit in bank terms), it increases the asset (Debit in accounting)\r\n  -- If money goes OUT (debit in bank terms), it decreases the asset (Credit in accounting)\r\n  -- However, usually 'credit' in a transactions table means 'deposit' and 'debit' means 'withdrawal'.\r\n  -- Let's assume:\r\n  -- Transaction 'credit' (deposit) -> Ledger 'debit' (increase asset)\r\n  -- Transaction 'debit' (withdrawal) -> Ledger 'credit' (decrease asset)\r\n  \r\n  if NEW.direction = 'credit' then\r\n    v_entry_type := 'debit'; \r\n  else\r\n    v_entry_type := 'credit';\r\n  end if;\r\n\r\n  -- Find associated record if exists\r\n  if NEW.source_document_id is not null then\r\n    select id into v_record_id from public.workbench_records \r\n    where document_id = NEW.source_document_id limit 1;\r\n  end if;\r\n\r\n  insert into public.ledger_entries (\r\n    workbench_id,\r\n    record_id,\r\n    account_id,\r\n    amount,\r\n    entry_type,\r\n    category,\r\n    description,\r\n    transaction_date\r\n  ) values (\r\n    NEW.workbench_id,\r\n    v_record_id,\r\n    NEW.workbench_account_id,\r\n    NEW.amount,\r\n    v_entry_type,\r\n    NEW.purpose, -- Use purpose as category for now\r\n    NEW.purpose, -- description\r\n    NEW.transaction_date\r\n  );\r\n\r\n  return NEW;\r\nend;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "regexp_match",
    "definition": "CREATE OR REPLACE FUNCTION public.regexp_match(citext, citext)\n RETURNS text[]\n LANGUAGE sql\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$\n    SELECT pg_catalog.regexp_match( $1::pg_catalog.text, $2::pg_catalog.text, 'i' );\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "regexp_match",
    "definition": "CREATE OR REPLACE FUNCTION public.regexp_match(citext, citext, text)\n RETURNS text[]\n LANGUAGE sql\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$\n    SELECT pg_catalog.regexp_match( $1::pg_catalog.text, $2::pg_catalog.text, CASE WHEN pg_catalog.strpos($3, 'c') = 0 THEN  $3 || 'i' ELSE $3 END );\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "regexp_matches",
    "definition": "CREATE OR REPLACE FUNCTION public.regexp_matches(citext, citext)\n RETURNS SETOF text[]\n LANGUAGE sql\n IMMUTABLE PARALLEL SAFE STRICT ROWS 1\nAS $function$\n    SELECT pg_catalog.regexp_matches( $1::pg_catalog.text, $2::pg_catalog.text, 'i' );\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "regexp_matches",
    "definition": "CREATE OR REPLACE FUNCTION public.regexp_matches(citext, citext, text)\n RETURNS SETOF text[]\n LANGUAGE sql\n IMMUTABLE PARALLEL SAFE STRICT ROWS 10\nAS $function$\n    SELECT pg_catalog.regexp_matches( $1::pg_catalog.text, $2::pg_catalog.text, CASE WHEN pg_catalog.strpos($3, 'c') = 0 THEN  $3 || 'i' ELSE $3 END );\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "regexp_replace",
    "definition": "CREATE OR REPLACE FUNCTION public.regexp_replace(citext, citext, text, text)\n RETURNS text\n LANGUAGE sql\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$\n    SELECT pg_catalog.regexp_replace( $1::pg_catalog.text, $2::pg_catalog.text, $3, CASE WHEN pg_catalog.strpos($4, 'c') = 0 THEN  $4 || 'i' ELSE $4 END);\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "regexp_replace",
    "definition": "CREATE OR REPLACE FUNCTION public.regexp_replace(citext, citext, text)\n RETURNS text\n LANGUAGE sql\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$\n    SELECT pg_catalog.regexp_replace( $1::pg_catalog.text, $2::pg_catalog.text, $3, 'i');\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "regexp_split_to_array",
    "definition": "CREATE OR REPLACE FUNCTION public.regexp_split_to_array(citext, citext)\n RETURNS text[]\n LANGUAGE sql\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$\n    SELECT pg_catalog.regexp_split_to_array( $1::pg_catalog.text, $2::pg_catalog.text, 'i' );\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "regexp_split_to_array",
    "definition": "CREATE OR REPLACE FUNCTION public.regexp_split_to_array(citext, citext, text)\n RETURNS text[]\n LANGUAGE sql\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$\n    SELECT pg_catalog.regexp_split_to_array( $1::pg_catalog.text, $2::pg_catalog.text, CASE WHEN pg_catalog.strpos($3, 'c') = 0 THEN  $3 || 'i' ELSE $3 END );\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "regexp_split_to_table",
    "definition": "CREATE OR REPLACE FUNCTION public.regexp_split_to_table(citext, citext, text)\n RETURNS SETOF text\n LANGUAGE sql\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$\n    SELECT pg_catalog.regexp_split_to_table( $1::pg_catalog.text, $2::pg_catalog.text, CASE WHEN pg_catalog.strpos($3, 'c') = 0 THEN  $3 || 'i' ELSE $3 END );\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "regexp_split_to_table",
    "definition": "CREATE OR REPLACE FUNCTION public.regexp_split_to_table(citext, citext)\n RETURNS SETOF text\n LANGUAGE sql\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$\n    SELECT pg_catalog.regexp_split_to_table( $1::pg_catalog.text, $2::pg_catalog.text, 'i' );\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "replace",
    "definition": "CREATE OR REPLACE FUNCTION public.replace(citext, citext, citext)\n RETURNS text\n LANGUAGE sql\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$\n    SELECT pg_catalog.regexp_replace( $1::pg_catalog.text, pg_catalog.regexp_replace($2::pg_catalog.text, '([^a-zA-Z_0-9])', E'\\\\\\\\\\\\1', 'g'), $3::pg_catalog.text, 'gi' );\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "set_updated_at_workbench_files",
    "definition": "CREATE OR REPLACE FUNCTION public.set_updated_at_workbench_files()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  IF TG_OP = 'UPDATE' THEN\n    NEW.updated_at := now();\n  END IF;\n  RETURN NEW;\nEND;\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "set_updated_at_workbenches",
    "definition": "CREATE OR REPLACE FUNCTION public.set_updated_at_workbenches()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  IF TG_OP = 'UPDATE' THEN\n    NEW.updated_at := now();\n  END IF;\n  RETURN NEW;\nEND;\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "sparsevec",
    "definition": "CREATE OR REPLACE FUNCTION public.sparsevec(sparsevec, integer, boolean)\n RETURNS sparsevec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$sparsevec$function$\n"
  },
  {
    "schema": "public",
    "function_name": "sparsevec_cmp",
    "definition": "CREATE OR REPLACE FUNCTION public.sparsevec_cmp(sparsevec, sparsevec)\n RETURNS integer\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$sparsevec_cmp$function$\n"
  },
  {
    "schema": "public",
    "function_name": "sparsevec_eq",
    "definition": "CREATE OR REPLACE FUNCTION public.sparsevec_eq(sparsevec, sparsevec)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$sparsevec_eq$function$\n"
  },
  {
    "schema": "public",
    "function_name": "sparsevec_ge",
    "definition": "CREATE OR REPLACE FUNCTION public.sparsevec_ge(sparsevec, sparsevec)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$sparsevec_ge$function$\n"
  },
  {
    "schema": "public",
    "function_name": "sparsevec_gt",
    "definition": "CREATE OR REPLACE FUNCTION public.sparsevec_gt(sparsevec, sparsevec)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$sparsevec_gt$function$\n"
  },
  {
    "schema": "public",
    "function_name": "sparsevec_in",
    "definition": "CREATE OR REPLACE FUNCTION public.sparsevec_in(cstring, oid, integer)\n RETURNS sparsevec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$sparsevec_in$function$\n"
  },
  {
    "schema": "public",
    "function_name": "sparsevec_l2_squared_distance",
    "definition": "CREATE OR REPLACE FUNCTION public.sparsevec_l2_squared_distance(sparsevec, sparsevec)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$sparsevec_l2_squared_distance$function$\n"
  },
  {
    "schema": "public",
    "function_name": "sparsevec_le",
    "definition": "CREATE OR REPLACE FUNCTION public.sparsevec_le(sparsevec, sparsevec)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$sparsevec_le$function$\n"
  },
  {
    "schema": "public",
    "function_name": "sparsevec_lt",
    "definition": "CREATE OR REPLACE FUNCTION public.sparsevec_lt(sparsevec, sparsevec)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$sparsevec_lt$function$\n"
  },
  {
    "schema": "public",
    "function_name": "sparsevec_ne",
    "definition": "CREATE OR REPLACE FUNCTION public.sparsevec_ne(sparsevec, sparsevec)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$sparsevec_ne$function$\n"
  },
  {
    "schema": "public",
    "function_name": "sparsevec_negative_inner_product",
    "definition": "CREATE OR REPLACE FUNCTION public.sparsevec_negative_inner_product(sparsevec, sparsevec)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$sparsevec_negative_inner_product$function$\n"
  },
  {
    "schema": "public",
    "function_name": "sparsevec_out",
    "definition": "CREATE OR REPLACE FUNCTION public.sparsevec_out(sparsevec)\n RETURNS cstring\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$sparsevec_out$function$\n"
  },
  {
    "schema": "public",
    "function_name": "sparsevec_recv",
    "definition": "CREATE OR REPLACE FUNCTION public.sparsevec_recv(internal, oid, integer)\n RETURNS sparsevec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$sparsevec_recv$function$\n"
  },
  {
    "schema": "public",
    "function_name": "sparsevec_send",
    "definition": "CREATE OR REPLACE FUNCTION public.sparsevec_send(sparsevec)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$sparsevec_send$function$\n"
  },
  {
    "schema": "public",
    "function_name": "sparsevec_to_halfvec",
    "definition": "CREATE OR REPLACE FUNCTION public.sparsevec_to_halfvec(sparsevec, integer, boolean)\n RETURNS halfvec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$sparsevec_to_halfvec$function$\n"
  },
  {
    "schema": "public",
    "function_name": "sparsevec_to_vector",
    "definition": "CREATE OR REPLACE FUNCTION public.sparsevec_to_vector(sparsevec, integer, boolean)\n RETURNS vector\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$sparsevec_to_vector$function$\n"
  },
  {
    "schema": "public",
    "function_name": "sparsevec_typmod_in",
    "definition": "CREATE OR REPLACE FUNCTION public.sparsevec_typmod_in(cstring[])\n RETURNS integer\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$sparsevec_typmod_in$function$\n"
  },
  {
    "schema": "public",
    "function_name": "split_part",
    "definition": "CREATE OR REPLACE FUNCTION public.split_part(citext, citext, integer)\n RETURNS text\n LANGUAGE sql\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$\n    SELECT (pg_catalog.regexp_split_to_array( $1::pg_catalog.text, pg_catalog.regexp_replace($2::pg_catalog.text, '([^a-zA-Z_0-9])', E'\\\\\\\\\\\\1', 'g'), 'i'))[$3];\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "strpos",
    "definition": "CREATE OR REPLACE FUNCTION public.strpos(citext, citext)\n RETURNS integer\n LANGUAGE sql\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$\n    SELECT pg_catalog.strpos( pg_catalog.lower( $1::pg_catalog.text ), pg_catalog.lower( $2::pg_catalog.text ) );\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "subvector",
    "definition": "CREATE OR REPLACE FUNCTION public.subvector(halfvec, integer, integer)\n RETURNS halfvec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_subvector$function$\n"
  },
  {
    "schema": "public",
    "function_name": "subvector",
    "definition": "CREATE OR REPLACE FUNCTION public.subvector(vector, integer, integer)\n RETURNS vector\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$subvector$function$\n"
  },
  {
    "schema": "public",
    "function_name": "texticlike",
    "definition": "CREATE OR REPLACE FUNCTION public.texticlike(citext, citext)\n RETURNS boolean\n LANGUAGE internal\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$texticlike$function$\n"
  },
  {
    "schema": "public",
    "function_name": "texticlike",
    "definition": "CREATE OR REPLACE FUNCTION public.texticlike(citext, text)\n RETURNS boolean\n LANGUAGE internal\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$texticlike$function$\n"
  },
  {
    "schema": "public",
    "function_name": "texticnlike",
    "definition": "CREATE OR REPLACE FUNCTION public.texticnlike(citext, text)\n RETURNS boolean\n LANGUAGE internal\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$texticnlike$function$\n"
  },
  {
    "schema": "public",
    "function_name": "texticnlike",
    "definition": "CREATE OR REPLACE FUNCTION public.texticnlike(citext, citext)\n RETURNS boolean\n LANGUAGE internal\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$texticnlike$function$\n"
  },
  {
    "schema": "public",
    "function_name": "texticregexeq",
    "definition": "CREATE OR REPLACE FUNCTION public.texticregexeq(citext, text)\n RETURNS boolean\n LANGUAGE internal\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$texticregexeq$function$\n"
  },
  {
    "schema": "public",
    "function_name": "texticregexeq",
    "definition": "CREATE OR REPLACE FUNCTION public.texticregexeq(citext, citext)\n RETURNS boolean\n LANGUAGE internal\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$texticregexeq$function$\n"
  },
  {
    "schema": "public",
    "function_name": "texticregexne",
    "definition": "CREATE OR REPLACE FUNCTION public.texticregexne(citext, citext)\n RETURNS boolean\n LANGUAGE internal\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$texticregexne$function$\n"
  },
  {
    "schema": "public",
    "function_name": "texticregexne",
    "definition": "CREATE OR REPLACE FUNCTION public.texticregexne(citext, text)\n RETURNS boolean\n LANGUAGE internal\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$texticregexne$function$\n"
  },
  {
    "schema": "public",
    "function_name": "translate",
    "definition": "CREATE OR REPLACE FUNCTION public.translate(citext, citext, text)\n RETURNS text\n LANGUAGE sql\n IMMUTABLE PARALLEL SAFE STRICT\nAS $function$\n    SELECT pg_catalog.translate( pg_catalog.translate( $1::pg_catalog.text, pg_catalog.lower($2::pg_catalog.text), $3), pg_catalog.upper($2::pg_catalog.text), $3);\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "update_updated_at",
    "definition": "CREATE OR REPLACE FUNCTION public.update_updated_at()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nbegin\r\n  new.updated_at = now();\r\n  return new;\r\nend;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "update_updated_at_column",
    "definition": "CREATE OR REPLACE FUNCTION public.update_updated_at_column()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    NEW.updated_at = NOW();\r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector",
    "definition": "CREATE OR REPLACE FUNCTION public.vector(vector, integer, boolean)\n RETURNS vector\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_accum",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_accum(double precision[], vector)\n RETURNS double precision[]\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_accum$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_add",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_add(vector, vector)\n RETURNS vector\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_add$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_avg",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_avg(double precision[])\n RETURNS vector\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_avg$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_cmp",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_cmp(vector, vector)\n RETURNS integer\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_cmp$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_combine",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_combine(double precision[], double precision[])\n RETURNS double precision[]\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_combine$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_concat",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_concat(vector, vector)\n RETURNS vector\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_concat$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_dims",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_dims(halfvec)\n RETURNS integer\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$halfvec_vector_dims$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_dims",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_dims(vector)\n RETURNS integer\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_dims$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_eq",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_eq(vector, vector)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_eq$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_ge",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_ge(vector, vector)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_ge$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_gt",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_gt(vector, vector)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_gt$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_in",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_in(cstring, oid, integer)\n RETURNS vector\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_in$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_l2_squared_distance",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_l2_squared_distance(vector, vector)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_l2_squared_distance$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_le",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_le(vector, vector)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_le$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_lt",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_lt(vector, vector)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_lt$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_mul",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_mul(vector, vector)\n RETURNS vector\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_mul$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_ne",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_ne(vector, vector)\n RETURNS boolean\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_ne$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_negative_inner_product",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_negative_inner_product(vector, vector)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_negative_inner_product$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_norm",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_norm(vector)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_norm$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_out",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_out(vector)\n RETURNS cstring\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_out$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_recv",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_recv(internal, oid, integer)\n RETURNS vector\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_recv$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_send",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_send(vector)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_send$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_spherical_distance",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_spherical_distance(vector, vector)\n RETURNS double precision\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_spherical_distance$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_sub",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_sub(vector, vector)\n RETURNS vector\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_sub$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_to_float4",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_to_float4(vector, integer, boolean)\n RETURNS real[]\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_to_float4$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_to_halfvec",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_to_halfvec(vector, integer, boolean)\n RETURNS halfvec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_to_halfvec$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_to_sparsevec",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_to_sparsevec(vector, integer, boolean)\n RETURNS sparsevec\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_to_sparsevec$function$\n"
  },
  {
    "schema": "public",
    "function_name": "vector_typmod_in",
    "definition": "CREATE OR REPLACE FUNCTION public.vector_typmod_in(cstring[])\n RETURNS integer\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/vector', $function$vector_typmod_in$function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "apply_rls",
    "definition": "CREATE OR REPLACE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024))\n RETURNS SETOF realtime.wal_rls\n LANGUAGE plpgsql\nAS $function$\ndeclare\n-- Regclass of the table e.g. public.notes\nentity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;\n\n-- I, U, D, T: insert, update ...\naction realtime.action = (\n    case wal ->> 'action'\n        when 'I' then 'INSERT'\n        when 'U' then 'UPDATE'\n        when 'D' then 'DELETE'\n        else 'ERROR'\n    end\n);\n\n-- Is row level security enabled for the table\nis_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;\n\nsubscriptions realtime.subscription[] = array_agg(subs)\n    from\n        realtime.subscription subs\n    where\n        subs.entity = entity_\n        -- Filter by action early - only get subscriptions interested in this action\n        -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'\n        and (subs.action_filter = '*' or subs.action_filter = action::text);\n\n-- Subscription vars\nroles regrole[] = array_agg(distinct us.claims_role::text)\n    from\n        unnest(subscriptions) us;\n\nworking_role regrole;\nclaimed_role regrole;\nclaims jsonb;\n\nsubscription_id uuid;\nsubscription_has_access bool;\nvisible_to_subscription_ids uuid[] = '{}';\n\n-- structured info for wal's columns\ncolumns realtime.wal_column[];\n-- previous identity values for update/delete\nold_columns realtime.wal_column[];\n\nerror_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;\n\n-- Primary jsonb output for record\noutput jsonb;\n\nbegin\nperform set_config('role', null, true);\n\ncolumns =\n    array_agg(\n        (\n            x->>'name',\n            x->>'type',\n            x->>'typeoid',\n            realtime.cast(\n                (x->'value') #>> '{}',\n                coalesce(\n                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4\n                    (x->>'type')::regtype\n                )\n            ),\n            (pks ->> 'name') is not null,\n            true\n        )::realtime.wal_column\n    )\n    from\n        jsonb_array_elements(wal -> 'columns') x\n        left join jsonb_array_elements(wal -> 'pk') pks\n            on (x ->> 'name') = (pks ->> 'name');\n\nold_columns =\n    array_agg(\n        (\n            x->>'name',\n            x->>'type',\n            x->>'typeoid',\n            realtime.cast(\n                (x->'value') #>> '{}',\n                coalesce(\n                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4\n                    (x->>'type')::regtype\n                )\n            ),\n            (pks ->> 'name') is not null,\n            true\n        )::realtime.wal_column\n    )\n    from\n        jsonb_array_elements(wal -> 'identity') x\n        left join jsonb_array_elements(wal -> 'pk') pks\n            on (x ->> 'name') = (pks ->> 'name');\n\nfor working_role in select * from unnest(roles) loop\n\n    -- Update `is_selectable` for columns and old_columns\n    columns =\n        array_agg(\n            (\n                c.name,\n                c.type_name,\n                c.type_oid,\n                c.value,\n                c.is_pkey,\n                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')\n            )::realtime.wal_column\n        )\n        from\n            unnest(columns) c;\n\n    old_columns =\n            array_agg(\n                (\n                    c.name,\n                    c.type_name,\n                    c.type_oid,\n                    c.value,\n                    c.is_pkey,\n                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')\n                )::realtime.wal_column\n            )\n            from\n                unnest(old_columns) c;\n\n    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then\n        return next (\n            jsonb_build_object(\n                'schema', wal ->> 'schema',\n                'table', wal ->> 'table',\n                'type', action\n            ),\n            is_rls_enabled,\n            -- subscriptions is already filtered by entity\n            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),\n            array['Error 400: Bad Request, no primary key']\n        )::realtime.wal_rls;\n\n    -- The claims role does not have SELECT permission to the primary key of entity\n    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then\n        return next (\n            jsonb_build_object(\n                'schema', wal ->> 'schema',\n                'table', wal ->> 'table',\n                'type', action\n            ),\n            is_rls_enabled,\n            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),\n            array['Error 401: Unauthorized']\n        )::realtime.wal_rls;\n\n    else\n        output = jsonb_build_object(\n            'schema', wal ->> 'schema',\n            'table', wal ->> 'table',\n            'type', action,\n            'commit_timestamp', to_char(\n                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),\n                'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'\n            ),\n            'columns', (\n                select\n                    jsonb_agg(\n                        jsonb_build_object(\n                            'name', pa.attname,\n                            'type', pt.typname\n                        )\n                        order by pa.attnum asc\n                    )\n                from\n                    pg_attribute pa\n                    join pg_type pt\n                        on pa.atttypid = pt.oid\n                where\n                    attrelid = entity_\n                    and attnum > 0\n                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')\n            )\n        )\n        -- Add \"record\" key for insert and update\n        || case\n            when action in ('INSERT', 'UPDATE') then\n                jsonb_build_object(\n                    'record',\n                    (\n                        select\n                            jsonb_object_agg(\n                                -- if unchanged toast, get column name and value from old record\n                                coalesce((c).name, (oc).name),\n                                case\n                                    when (c).name is null then (oc).value\n                                    else (c).value\n                                end\n                            )\n                        from\n                            unnest(columns) c\n                            full outer join unnest(old_columns) oc\n                                on (c).name = (oc).name\n                        where\n                            coalesce((c).is_selectable, (oc).is_selectable)\n                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))\n                    )\n                )\n            else '{}'::jsonb\n        end\n        -- Add \"old_record\" key for update and delete\n        || case\n            when action = 'UPDATE' then\n                jsonb_build_object(\n                        'old_record',\n                        (\n                            select jsonb_object_agg((c).name, (c).value)\n                            from unnest(old_columns) c\n                            where\n                                (c).is_selectable\n                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))\n                        )\n                    )\n            when action = 'DELETE' then\n                jsonb_build_object(\n                    'old_record',\n                    (\n                        select jsonb_object_agg((c).name, (c).value)\n                        from unnest(old_columns) c\n                        where\n                            (c).is_selectable\n                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))\n                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey\n                    )\n                )\n            else '{}'::jsonb\n        end;\n\n        -- Create the prepared statement\n        if is_rls_enabled and action <> 'DELETE' then\n            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then\n                deallocate walrus_rls_stmt;\n            end if;\n            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);\n        end if;\n\n        visible_to_subscription_ids = '{}';\n\n        for subscription_id, claims in (\n                select\n                    subs.subscription_id,\n                    subs.claims\n                from\n                    unnest(subscriptions) subs\n                where\n                    subs.entity = entity_\n                    and subs.claims_role = working_role\n                    and (\n                        realtime.is_visible_through_filters(columns, subs.filters)\n                        or (\n                          action = 'DELETE'\n                          and realtime.is_visible_through_filters(old_columns, subs.filters)\n                        )\n                    )\n        ) loop\n\n            if not is_rls_enabled or action = 'DELETE' then\n                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;\n            else\n                -- Check if RLS allows the role to see the record\n                perform\n                    -- Trim leading and trailing quotes from working_role because set_config\n                    -- doesn't recognize the role as valid if they are included\n                    set_config('role', trim(both '\"' from working_role::text), true),\n                    set_config('request.jwt.claims', claims::text, true);\n\n                execute 'execute walrus_rls_stmt' into subscription_has_access;\n\n                if subscription_has_access then\n                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;\n                end if;\n            end if;\n        end loop;\n\n        perform set_config('role', null, true);\n\n        return next (\n            output,\n            is_rls_enabled,\n            visible_to_subscription_ids,\n            case\n                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']\n                else '{}'\n            end\n        )::realtime.wal_rls;\n\n    end if;\nend loop;\n\nperform set_config('role', null, true);\nend;\n$function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "broadcast_changes",
    "definition": "CREATE OR REPLACE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text)\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n    -- Declare a variable to hold the JSONB representation of the row\n    row_data jsonb := '{}'::jsonb;\nBEGIN\n    IF level = 'STATEMENT' THEN\n        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';\n    END IF;\n    -- Check the operation type and handle accordingly\n    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN\n        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);\n        PERFORM realtime.send (row_data, event_name, topic_name);\n    ELSE\n        RAISE EXCEPTION 'Unexpected operation type: %', operation;\n    END IF;\nEXCEPTION\n    WHEN OTHERS THEN\n        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;\nEND;\n\n$function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "build_prepared_statement_sql",
    "definition": "CREATE OR REPLACE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[])\n RETURNS text\n LANGUAGE sql\nAS $function$\n      /*\n      Builds a sql string that, if executed, creates a prepared statement to\n      tests retrive a row from *entity* by its primary key columns.\n      Example\n          select realtime.build_prepared_statement_sql('public.notes', '{\"id\"}'::text[], '{\"bigint\"}'::text[])\n      */\n          select\n      'prepare ' || prepared_statement_name || ' as\n          select\n              exists(\n                  select\n                      1\n                  from\n                      ' || entity || '\n                  where\n                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '\n              )'\n          from\n              unnest(columns) pkc\n          where\n              pkc.is_pkey\n          group by\n              entity\n      $function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "cast",
    "definition": "CREATE OR REPLACE FUNCTION realtime.\"cast\"(val text, type_ regtype)\n RETURNS jsonb\n LANGUAGE plpgsql\n IMMUTABLE\nAS $function$\ndeclare\n  res jsonb;\nbegin\n  if type_::text = 'bytea' then\n    return to_jsonb(val);\n  end if;\n  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;\n  return res;\nend\n$function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "check_equality_op",
    "definition": "CREATE OR REPLACE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text)\n RETURNS boolean\n LANGUAGE plpgsql\n IMMUTABLE\nAS $function$\n      /*\n      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness\n      */\n      declare\n          op_symbol text = (\n              case\n                  when op = 'eq' then '='\n                  when op = 'neq' then '!='\n                  when op = 'lt' then '<'\n                  when op = 'lte' then '<='\n                  when op = 'gt' then '>'\n                  when op = 'gte' then '>='\n                  when op = 'in' then '= any'\n                  else 'UNKNOWN OP'\n              end\n          );\n          res boolean;\n      begin\n          execute format(\n              'select %L::'|| type_::text || ' ' || op_symbol\n              || ' ( %L::'\n              || (\n                  case\n                      when op = 'in' then type_::text || '[]'\n                      else type_::text end\n              )\n              || ')', val_1, val_2) into res;\n          return res;\n      end;\n      $function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "is_visible_through_filters",
    "definition": "CREATE OR REPLACE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[])\n RETURNS boolean\n LANGUAGE sql\n IMMUTABLE\nAS $function$\n    /*\n    Should the record be visible (true) or filtered out (false) after *filters* are applied\n    */\n        select\n            -- Default to allowed when no filters present\n            $2 is null -- no filters. this should not happen because subscriptions has a default\n            or array_length($2, 1) is null -- array length of an empty array is null\n            or bool_and(\n                coalesce(\n                    realtime.check_equality_op(\n                        op:=f.op,\n                        type_:=coalesce(\n                            col.type_oid::regtype, -- null when wal2json version <= 2.4\n                            col.type_name::regtype\n                        ),\n                        -- cast jsonb to text\n                        val_1:=col.value #>> '{}',\n                        val_2:=f.value\n                    ),\n                    false -- if null, filter does not match\n                )\n            )\n        from\n            unnest(filters) f\n            join unnest(columns) col\n                on f.column_name = col.name;\n    $function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "list_changes",
    "definition": "CREATE OR REPLACE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer)\n RETURNS SETOF realtime.wal_rls\n LANGUAGE sql\n SET log_min_messages TO 'fatal'\nAS $function$\n      with pub as (\n        select\n          concat_ws(\n            ',',\n            case when bool_or(pubinsert) then 'insert' else null end,\n            case when bool_or(pubupdate) then 'update' else null end,\n            case when bool_or(pubdelete) then 'delete' else null end\n          ) as w2j_actions,\n          coalesce(\n            string_agg(\n              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),\n              ','\n            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),\n            ''\n          ) w2j_add_tables\n        from\n          pg_publication pp\n          left join pg_publication_tables ppt\n            on pp.pubname = ppt.pubname\n        where\n          pp.pubname = publication\n        group by\n          pp.pubname\n        limit 1\n      ),\n      w2j as (\n        select\n          x.*, pub.w2j_add_tables\n        from\n          pub,\n          pg_logical_slot_get_changes(\n            slot_name, null, max_changes,\n            'include-pk', 'true',\n            'include-transaction', 'false',\n            'include-timestamp', 'true',\n            'include-type-oids', 'true',\n            'format-version', '2',\n            'actions', pub.w2j_actions,\n            'add-tables', pub.w2j_add_tables\n          ) x\n      )\n      select\n        xyz.wal,\n        xyz.is_rls_enabled,\n        xyz.subscription_ids,\n        xyz.errors\n      from\n        w2j,\n        realtime.apply_rls(\n          wal := w2j.data::jsonb,\n          max_record_bytes := max_record_bytes\n        ) xyz(wal, is_rls_enabled, subscription_ids, errors)\n      where\n        w2j.w2j_add_tables <> ''\n        and xyz.subscription_ids[1] is not null\n    $function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "quote_wal2json",
    "definition": "CREATE OR REPLACE FUNCTION realtime.quote_wal2json(entity regclass)\n RETURNS text\n LANGUAGE sql\n IMMUTABLE STRICT\nAS $function$\n      select\n        (\n          select string_agg('' || ch,'')\n          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)\n          where\n            not (x.idx = 1 and x.ch = '\"')\n            and not (\n              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)\n              and x.ch = '\"'\n            )\n        )\n        || '.'\n        || (\n          select string_agg('' || ch,'')\n          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)\n          where\n            not (x.idx = 1 and x.ch = '\"')\n            and not (\n              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)\n              and x.ch = '\"'\n            )\n          )\n      from\n        pg_class pc\n        join pg_namespace nsp\n          on pc.relnamespace = nsp.oid\n      where\n        pc.oid = entity\n    $function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "send",
    "definition": "CREATE OR REPLACE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true)\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n  generated_id uuid;\n  final_payload jsonb;\nBEGIN\n  BEGIN\n    -- Generate a new UUID for the id\n    generated_id := gen_random_uuid();\n\n    -- Check if payload has an 'id' key, if not, add the generated UUID\n    IF payload ? 'id' THEN\n      final_payload := payload;\n    ELSE\n      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));\n    END IF;\n\n    -- Set the topic configuration\n    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);\n\n    -- Attempt to insert the message\n    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)\n    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');\n  EXCEPTION\n    WHEN OTHERS THEN\n      -- Capture and notify the error\n      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;\n  END;\nEND;\n$function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "subscription_check_filters",
    "definition": "CREATE OR REPLACE FUNCTION realtime.subscription_check_filters()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\n    /*\n    Validates that the user defined filters for a subscription:\n    - refer to valid columns that the claimed role may access\n    - values are coercable to the correct column type\n    */\n    declare\n        col_names text[] = coalesce(\n                array_agg(c.column_name order by c.ordinal_position),\n                '{}'::text[]\n            )\n            from\n                information_schema.columns c\n            where\n                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity\n                and pg_catalog.has_column_privilege(\n                    (new.claims ->> 'role'),\n                    format('%I.%I', c.table_schema, c.table_name)::regclass,\n                    c.column_name,\n                    'SELECT'\n                );\n        filter realtime.user_defined_filter;\n        col_type regtype;\n\n        in_val jsonb;\n    begin\n        for filter in select * from unnest(new.filters) loop\n            -- Filtered column is valid\n            if not filter.column_name = any(col_names) then\n                raise exception 'invalid column for filter %', filter.column_name;\n            end if;\n\n            -- Type is sanitized and safe for string interpolation\n            col_type = (\n                select atttypid::regtype\n                from pg_catalog.pg_attribute\n                where attrelid = new.entity\n                      and attname = filter.column_name\n            );\n            if col_type is null then\n                raise exception 'failed to lookup type for column %', filter.column_name;\n            end if;\n\n            -- Set maximum number of entries for in filter\n            if filter.op = 'in'::realtime.equality_op then\n                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);\n                if coalesce(jsonb_array_length(in_val), 0) > 100 then\n                    raise exception 'too many values for `in` filter. Maximum 100';\n                end if;\n            else\n                -- raises an exception if value is not coercable to type\n                perform realtime.cast(filter.value, col_type);\n            end if;\n\n        end loop;\n\n        -- Apply consistent order to filters so the unique constraint on\n        -- (subscription_id, entity, filters) can't be tricked by a different filter order\n        new.filters = coalesce(\n            array_agg(f order by f.column_name, f.op, f.value),\n            '{}'\n        ) from unnest(new.filters) f;\n\n        return new;\n    end;\n    $function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "to_regrole",
    "definition": "CREATE OR REPLACE FUNCTION realtime.to_regrole(role_name text)\n RETURNS regrole\n LANGUAGE sql\n IMMUTABLE\nAS $function$ select role_name::regrole $function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "topic",
    "definition": "CREATE OR REPLACE FUNCTION realtime.topic()\n RETURNS text\n LANGUAGE sql\n STABLE\nAS $function$\nselect nullif(current_setting('realtime.topic', true), '')::text;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "can_insert_object",
    "definition": "CREATE OR REPLACE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb)\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  INSERT INTO \"storage\".\"objects\" (\"bucket_id\", \"name\", \"owner\", \"metadata\") VALUES (bucketid, name, owner, metadata);\n  -- hack to rollback the successful insert\n  RAISE sqlstate 'PT200' using\n  message = 'ROLLBACK',\n  detail = 'rollback successful insert';\nEND\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "delete_leaf_prefixes",
    "definition": "CREATE OR REPLACE FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[])\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nDECLARE\n    v_rows_deleted integer;\nBEGIN\n    LOOP\n        WITH candidates AS (\n            SELECT DISTINCT\n                t.bucket_id,\n                unnest(storage.get_prefixes(t.name)) AS name\n            FROM unnest(bucket_ids, names) AS t(bucket_id, name)\n        ),\n        uniq AS (\n             SELECT\n                 bucket_id,\n                 name,\n                 storage.get_level(name) AS level\n             FROM candidates\n             WHERE name <> ''\n             GROUP BY bucket_id, name\n        ),\n        leaf AS (\n             SELECT\n                 p.bucket_id,\n                 p.name,\n                 p.level\n             FROM storage.prefixes AS p\n                  JOIN uniq AS u\n                       ON u.bucket_id = p.bucket_id\n                           AND u.name = p.name\n                           AND u.level = p.level\n             WHERE NOT EXISTS (\n                 SELECT 1\n                 FROM storage.objects AS o\n                 WHERE o.bucket_id = p.bucket_id\n                   AND o.level = p.level + 1\n                   AND o.name COLLATE \"C\" LIKE p.name || '/%'\n             )\n             AND NOT EXISTS (\n                 SELECT 1\n                 FROM storage.prefixes AS c\n                 WHERE c.bucket_id = p.bucket_id\n                   AND c.level = p.level + 1\n                   AND c.name COLLATE \"C\" LIKE p.name || '/%'\n             )\n        )\n        DELETE\n        FROM storage.prefixes AS p\n            USING leaf AS l\n        WHERE p.bucket_id = l.bucket_id\n          AND p.name = l.name\n          AND p.level = l.level;\n\n        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;\n        EXIT WHEN v_rows_deleted = 0;\n    END LOOP;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "enforce_bucket_name_length",
    "definition": "CREATE OR REPLACE FUNCTION storage.enforce_bucket_name_length()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nbegin\n    if length(new.name) > 100 then\n        raise exception 'bucket name \"%\" is too long (% characters). Max is 100.', new.name, length(new.name);\n    end if;\n    return new;\nend;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "extension",
    "definition": "CREATE OR REPLACE FUNCTION storage.extension(name text)\n RETURNS text\n LANGUAGE plpgsql\n IMMUTABLE\nAS $function$\nDECLARE\n    _parts text[];\n    _filename text;\nBEGIN\n    SELECT string_to_array(name, '/') INTO _parts;\n    SELECT _parts[array_length(_parts,1)] INTO _filename;\n    RETURN reverse(split_part(reverse(_filename), '.', 1));\nEND\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "filename",
    "definition": "CREATE OR REPLACE FUNCTION storage.filename(name text)\n RETURNS text\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n_parts text[];\nBEGIN\n\tselect string_to_array(name, '/') into _parts;\n\treturn _parts[array_length(_parts,1)];\nEND\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "foldername",
    "definition": "CREATE OR REPLACE FUNCTION storage.foldername(name text)\n RETURNS text[]\n LANGUAGE plpgsql\n IMMUTABLE\nAS $function$\nDECLARE\n    _parts text[];\nBEGIN\n    -- Split on \"/\" to get path segments\n    SELECT string_to_array(name, '/') INTO _parts;\n    -- Return everything except the last segment\n    RETURN _parts[1 : array_length(_parts,1) - 1];\nEND\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "get_common_prefix",
    "definition": "CREATE OR REPLACE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text)\n RETURNS text\n LANGUAGE sql\n IMMUTABLE\nAS $function$\nSELECT CASE\n    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0\n    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))\n    ELSE NULL\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "get_level",
    "definition": "CREATE OR REPLACE FUNCTION storage.get_level(name text)\n RETURNS integer\n LANGUAGE sql\n IMMUTABLE STRICT\nAS $function$\nSELECT array_length(string_to_array(\"name\", '/'), 1);\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "get_prefix",
    "definition": "CREATE OR REPLACE FUNCTION storage.get_prefix(name text)\n RETURNS text\n LANGUAGE sql\n IMMUTABLE STRICT\nAS $function$\nSELECT\n    CASE WHEN strpos(\"name\", '/') > 0 THEN\n             regexp_replace(\"name\", '[\\/]{1}[^\\/]+\\/?$', '')\n         ELSE\n             ''\n        END;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "get_prefixes",
    "definition": "CREATE OR REPLACE FUNCTION storage.get_prefixes(name text)\n RETURNS text[]\n LANGUAGE plpgsql\n IMMUTABLE STRICT\nAS $function$\nDECLARE\n    parts text[];\n    prefixes text[];\n    prefix text;\nBEGIN\n    -- Split the name into parts by '/'\n    parts := string_to_array(\"name\", '/');\n    prefixes := '{}';\n\n    -- Construct the prefixes, stopping one level below the last part\n    FOR i IN 1..array_length(parts, 1) - 1 LOOP\n            prefix := array_to_string(parts[1:i], '/');\n            prefixes := array_append(prefixes, prefix);\n    END LOOP;\n\n    RETURN prefixes;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "get_size_by_bucket",
    "definition": "CREATE OR REPLACE FUNCTION storage.get_size_by_bucket()\n RETURNS TABLE(size bigint, bucket_id text)\n LANGUAGE plpgsql\n STABLE\nAS $function$\nBEGIN\n    return query\n        select sum((metadata->>'size')::bigint) as size, obj.bucket_id\n        from \"storage\".objects as obj\n        group by obj.bucket_id;\nEND\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "list_multipart_uploads_with_delimiter",
    "definition": "CREATE OR REPLACE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text)\n RETURNS TABLE(key text, id text, created_at timestamp with time zone)\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    RETURN QUERY EXECUTE\n        'SELECT DISTINCT ON(key COLLATE \"C\") * from (\n            SELECT\n                CASE\n                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN\n                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))\n                    ELSE\n                        key\n                END AS key, id, created_at\n            FROM\n                storage.s3_multipart_uploads\n            WHERE\n                bucket_id = $5 AND\n                key ILIKE $1 || ''%'' AND\n                CASE\n                    WHEN $4 != '''' AND $6 = '''' THEN\n                        CASE\n                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN\n                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE \"C\" > $4\n                            ELSE\n                                key COLLATE \"C\" > $4\n                            END\n                    ELSE\n                        true\n                END AND\n                CASE\n                    WHEN $6 != '''' THEN\n                        id COLLATE \"C\" > $6\n                    ELSE\n                        true\n                    END\n            ORDER BY\n                key COLLATE \"C\" ASC, created_at ASC) as e order by key COLLATE \"C\" LIMIT $3'\n        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "list_objects_with_delimiter",
    "definition": "CREATE OR REPLACE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text)\n RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)\n LANGUAGE plpgsql\n STABLE\nAS $function$\nDECLARE\n    v_peek_name TEXT;\n    v_current RECORD;\n    v_common_prefix TEXT;\n\n    -- Configuration\n    v_is_asc BOOLEAN;\n    v_prefix TEXT;\n    v_start TEXT;\n    v_upper_bound TEXT;\n    v_file_batch_size INT;\n\n    -- Seek state\n    v_next_seek TEXT;\n    v_count INT := 0;\n\n    -- Dynamic SQL for batch query only\n    v_batch_query TEXT;\n\nBEGIN\n    -- ========================================================================\n    -- INITIALIZATION\n    -- ========================================================================\n    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';\n    v_prefix := coalesce(prefix_param, '');\n    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;\n    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);\n\n    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE \"C\")\n    IF v_prefix = '' THEN\n        v_upper_bound := NULL;\n    ELSIF right(v_prefix, 1) = delimiter_param THEN\n        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);\n    ELSE\n        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);\n    END IF;\n\n    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)\n    IF v_is_asc THEN\n        IF v_upper_bound IS NOT NULL THEN\n            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||\n                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE \"C\" >= $2 ' ||\n                'AND o.name COLLATE \"C\" < $3 ORDER BY o.name COLLATE \"C\" ASC LIMIT $4';\n        ELSE\n            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||\n                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE \"C\" >= $2 ' ||\n                'ORDER BY o.name COLLATE \"C\" ASC LIMIT $4';\n        END IF;\n    ELSE\n        IF v_upper_bound IS NOT NULL THEN\n            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||\n                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE \"C\" < $2 ' ||\n                'AND o.name COLLATE \"C\" >= $3 ORDER BY o.name COLLATE \"C\" DESC LIMIT $4';\n        ELSE\n            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||\n                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE \"C\" < $2 ' ||\n                'ORDER BY o.name COLLATE \"C\" DESC LIMIT $4';\n        END IF;\n    END IF;\n\n    -- ========================================================================\n    -- SEEK INITIALIZATION: Determine starting position\n    -- ========================================================================\n    IF v_start = '' THEN\n        IF v_is_asc THEN\n            v_next_seek := v_prefix;\n        ELSE\n            -- DESC without cursor: find the last item in range\n            IF v_upper_bound IS NOT NULL THEN\n                SELECT o.name INTO v_next_seek FROM storage.objects o\n                WHERE o.bucket_id = _bucket_id AND o.name COLLATE \"C\" >= v_prefix AND o.name COLLATE \"C\" < v_upper_bound\n                ORDER BY o.name COLLATE \"C\" DESC LIMIT 1;\n            ELSIF v_prefix <> '' THEN\n                SELECT o.name INTO v_next_seek FROM storage.objects o\n                WHERE o.bucket_id = _bucket_id AND o.name COLLATE \"C\" >= v_prefix\n                ORDER BY o.name COLLATE \"C\" DESC LIMIT 1;\n            ELSE\n                SELECT o.name INTO v_next_seek FROM storage.objects o\n                WHERE o.bucket_id = _bucket_id\n                ORDER BY o.name COLLATE \"C\" DESC LIMIT 1;\n            END IF;\n\n            IF v_next_seek IS NOT NULL THEN\n                v_next_seek := v_next_seek || delimiter_param;\n            ELSE\n                RETURN;\n            END IF;\n        END IF;\n    ELSE\n        -- Cursor provided: determine if it refers to a folder or leaf\n        IF EXISTS (\n            SELECT 1 FROM storage.objects o\n            WHERE o.bucket_id = _bucket_id\n              AND o.name COLLATE \"C\" LIKE v_start || delimiter_param || '%'\n            LIMIT 1\n        ) THEN\n            -- Cursor refers to a folder\n            IF v_is_asc THEN\n                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);\n            ELSE\n                v_next_seek := v_start || delimiter_param;\n            END IF;\n        ELSE\n            -- Cursor refers to a leaf object\n            IF v_is_asc THEN\n                v_next_seek := v_start || delimiter_param;\n            ELSE\n                v_next_seek := v_start;\n            END IF;\n        END IF;\n    END IF;\n\n    -- ========================================================================\n    -- MAIN LOOP: Hybrid peek-then-batch algorithm\n    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch\n    -- ========================================================================\n    LOOP\n        EXIT WHEN v_count >= max_keys;\n\n        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)\n        IF v_is_asc THEN\n            IF v_upper_bound IS NOT NULL THEN\n                SELECT o.name INTO v_peek_name FROM storage.objects o\n                WHERE o.bucket_id = _bucket_id AND o.name COLLATE \"C\" >= v_next_seek AND o.name COLLATE \"C\" < v_upper_bound\n                ORDER BY o.name COLLATE \"C\" ASC LIMIT 1;\n            ELSE\n                SELECT o.name INTO v_peek_name FROM storage.objects o\n                WHERE o.bucket_id = _bucket_id AND o.name COLLATE \"C\" >= v_next_seek\n                ORDER BY o.name COLLATE \"C\" ASC LIMIT 1;\n            END IF;\n        ELSE\n            IF v_upper_bound IS NOT NULL THEN\n                SELECT o.name INTO v_peek_name FROM storage.objects o\n                WHERE o.bucket_id = _bucket_id AND o.name COLLATE \"C\" < v_next_seek AND o.name COLLATE \"C\" >= v_prefix\n                ORDER BY o.name COLLATE \"C\" DESC LIMIT 1;\n            ELSIF v_prefix <> '' THEN\n                SELECT o.name INTO v_peek_name FROM storage.objects o\n                WHERE o.bucket_id = _bucket_id AND o.name COLLATE \"C\" < v_next_seek AND o.name COLLATE \"C\" >= v_prefix\n                ORDER BY o.name COLLATE \"C\" DESC LIMIT 1;\n            ELSE\n                SELECT o.name INTO v_peek_name FROM storage.objects o\n                WHERE o.bucket_id = _bucket_id AND o.name COLLATE \"C\" < v_next_seek\n                ORDER BY o.name COLLATE \"C\" DESC LIMIT 1;\n            END IF;\n        END IF;\n\n        EXIT WHEN v_peek_name IS NULL;\n\n        -- STEP 2: Check if this is a FOLDER or FILE\n        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);\n\n        IF v_common_prefix IS NOT NULL THEN\n            -- FOLDER: Emit and skip to next folder (no heap access needed)\n            name := rtrim(v_common_prefix, delimiter_param);\n            id := NULL;\n            updated_at := NULL;\n            created_at := NULL;\n            last_accessed_at := NULL;\n            metadata := NULL;\n            RETURN NEXT;\n            v_count := v_count + 1;\n\n            -- Advance seek past the folder range\n            IF v_is_asc THEN\n                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);\n            ELSE\n                v_next_seek := v_common_prefix;\n            END IF;\n        ELSE\n            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)\n            -- For ASC: upper_bound is the exclusive upper limit (< condition)\n            -- For DESC: prefix is the inclusive lower limit (>= condition)\n            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,\n                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size\n            LOOP\n                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);\n\n                IF v_common_prefix IS NOT NULL THEN\n                    -- Hit a folder: exit batch, let peek handle it\n                    v_next_seek := v_current.name;\n                    EXIT;\n                END IF;\n\n                -- Emit file\n                name := v_current.name;\n                id := v_current.id;\n                updated_at := v_current.updated_at;\n                created_at := v_current.created_at;\n                last_accessed_at := v_current.last_accessed_at;\n                metadata := v_current.metadata;\n                RETURN NEXT;\n                v_count := v_count + 1;\n\n                -- Advance seek past this file\n                IF v_is_asc THEN\n                    v_next_seek := v_current.name || delimiter_param;\n                ELSE\n                    v_next_seek := v_current.name;\n                END IF;\n\n                EXIT WHEN v_count >= max_keys;\n            END LOOP;\n        END IF;\n    END LOOP;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "operation",
    "definition": "CREATE OR REPLACE FUNCTION storage.operation()\n RETURNS text\n LANGUAGE plpgsql\n STABLE\nAS $function$\nBEGIN\n    RETURN current_setting('storage.operation', true);\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "protect_delete",
    "definition": "CREATE OR REPLACE FUNCTION storage.protect_delete()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    -- Check if storage.allow_delete_query is set to 'true'\n    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN\n        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'\n            USING HINT = 'This prevents accidental data loss from orphaned objects.',\n                  ERRCODE = '42501';\n    END IF;\n    RETURN NULL;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "search",
    "definition": "CREATE OR REPLACE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)\n RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)\n LANGUAGE plpgsql\n STABLE\nAS $function$\nDECLARE\n    v_peek_name TEXT;\n    v_current RECORD;\n    v_common_prefix TEXT;\n    v_delimiter CONSTANT TEXT := '/';\n\n    -- Configuration\n    v_limit INT;\n    v_prefix TEXT;\n    v_prefix_lower TEXT;\n    v_is_asc BOOLEAN;\n    v_order_by TEXT;\n    v_sort_order TEXT;\n    v_upper_bound TEXT;\n    v_file_batch_size INT;\n\n    -- Dynamic SQL for batch query only\n    v_batch_query TEXT;\n\n    -- Seek state\n    v_next_seek TEXT;\n    v_count INT := 0;\n    v_skipped INT := 0;\nBEGIN\n    -- ========================================================================\n    -- INITIALIZATION\n    -- ========================================================================\n    v_limit := LEAST(coalesce(limits, 100), 1500);\n    v_prefix := coalesce(prefix, '') || coalesce(search, '');\n    v_prefix_lower := lower(v_prefix);\n    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';\n    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);\n\n    -- Validate sort column\n    CASE lower(coalesce(sortcolumn, 'name'))\n        WHEN 'name' THEN v_order_by := 'name';\n        WHEN 'updated_at' THEN v_order_by := 'updated_at';\n        WHEN 'created_at' THEN v_order_by := 'created_at';\n        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';\n        ELSE v_order_by := 'name';\n    END CASE;\n\n    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;\n\n    -- ========================================================================\n    -- NON-NAME SORTING: Use path_tokens approach (unchanged)\n    -- ========================================================================\n    IF v_order_by != 'name' THEN\n        RETURN QUERY EXECUTE format(\n            $sql$\n            WITH folders AS (\n                SELECT path_tokens[$1] AS folder\n                FROM storage.objects\n                WHERE objects.name ILIKE $2 || '%%'\n                  AND bucket_id = $3\n                  AND array_length(objects.path_tokens, 1) <> $1\n                GROUP BY folder\n                ORDER BY folder %s\n            )\n            (SELECT folder AS \"name\",\n                   NULL::uuid AS id,\n                   NULL::timestamptz AS updated_at,\n                   NULL::timestamptz AS created_at,\n                   NULL::timestamptz AS last_accessed_at,\n                   NULL::jsonb AS metadata FROM folders)\n            UNION ALL\n            (SELECT path_tokens[$1] AS \"name\",\n                   id, updated_at, created_at, last_accessed_at, metadata\n             FROM storage.objects\n             WHERE objects.name ILIKE $2 || '%%'\n               AND bucket_id = $3\n               AND array_length(objects.path_tokens, 1) = $1\n             ORDER BY %I %s)\n            LIMIT $4 OFFSET $5\n            $sql$, v_sort_order, v_order_by, v_sort_order\n        ) USING levels, v_prefix, bucketname, v_limit, offsets;\n        RETURN;\n    END IF;\n\n    -- ========================================================================\n    -- NAME SORTING: Hybrid skip-scan with batch optimization\n    -- ========================================================================\n\n    -- Calculate upper bound for prefix filtering\n    IF v_prefix_lower = '' THEN\n        v_upper_bound := NULL;\n    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN\n        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);\n    ELSE\n        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);\n    END IF;\n\n    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)\n    IF v_is_asc THEN\n        IF v_upper_bound IS NOT NULL THEN\n            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||\n                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE \"C\" >= $2 ' ||\n                'AND lower(o.name) COLLATE \"C\" < $3 ORDER BY lower(o.name) COLLATE \"C\" ASC LIMIT $4';\n        ELSE\n            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||\n                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE \"C\" >= $2 ' ||\n                'ORDER BY lower(o.name) COLLATE \"C\" ASC LIMIT $4';\n        END IF;\n    ELSE\n        IF v_upper_bound IS NOT NULL THEN\n            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||\n                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE \"C\" < $2 ' ||\n                'AND lower(o.name) COLLATE \"C\" >= $3 ORDER BY lower(o.name) COLLATE \"C\" DESC LIMIT $4';\n        ELSE\n            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||\n                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE \"C\" < $2 ' ||\n                'ORDER BY lower(o.name) COLLATE \"C\" DESC LIMIT $4';\n        END IF;\n    END IF;\n\n    -- Initialize seek position\n    IF v_is_asc THEN\n        v_next_seek := v_prefix_lower;\n    ELSE\n        -- DESC: find the last item in range first (static SQL)\n        IF v_upper_bound IS NOT NULL THEN\n            SELECT o.name INTO v_peek_name FROM storage.objects o\n            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE \"C\" >= v_prefix_lower AND lower(o.name) COLLATE \"C\" < v_upper_bound\n            ORDER BY lower(o.name) COLLATE \"C\" DESC LIMIT 1;\n        ELSIF v_prefix_lower <> '' THEN\n            SELECT o.name INTO v_peek_name FROM storage.objects o\n            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE \"C\" >= v_prefix_lower\n            ORDER BY lower(o.name) COLLATE \"C\" DESC LIMIT 1;\n        ELSE\n            SELECT o.name INTO v_peek_name FROM storage.objects o\n            WHERE o.bucket_id = bucketname\n            ORDER BY lower(o.name) COLLATE \"C\" DESC LIMIT 1;\n        END IF;\n\n        IF v_peek_name IS NOT NULL THEN\n            v_next_seek := lower(v_peek_name) || v_delimiter;\n        ELSE\n            RETURN;\n        END IF;\n    END IF;\n\n    -- ========================================================================\n    -- MAIN LOOP: Hybrid peek-then-batch algorithm\n    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch\n    -- ========================================================================\n    LOOP\n        EXIT WHEN v_count >= v_limit;\n\n        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)\n        IF v_is_asc THEN\n            IF v_upper_bound IS NOT NULL THEN\n                SELECT o.name INTO v_peek_name FROM storage.objects o\n                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE \"C\" >= v_next_seek AND lower(o.name) COLLATE \"C\" < v_upper_bound\n                ORDER BY lower(o.name) COLLATE \"C\" ASC LIMIT 1;\n            ELSE\n                SELECT o.name INTO v_peek_name FROM storage.objects o\n                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE \"C\" >= v_next_seek\n                ORDER BY lower(o.name) COLLATE \"C\" ASC LIMIT 1;\n            END IF;\n        ELSE\n            IF v_upper_bound IS NOT NULL THEN\n                SELECT o.name INTO v_peek_name FROM storage.objects o\n                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE \"C\" < v_next_seek AND lower(o.name) COLLATE \"C\" >= v_prefix_lower\n                ORDER BY lower(o.name) COLLATE \"C\" DESC LIMIT 1;\n            ELSIF v_prefix_lower <> '' THEN\n                SELECT o.name INTO v_peek_name FROM storage.objects o\n                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE \"C\" < v_next_seek AND lower(o.name) COLLATE \"C\" >= v_prefix_lower\n                ORDER BY lower(o.name) COLLATE \"C\" DESC LIMIT 1;\n            ELSE\n                SELECT o.name INTO v_peek_name FROM storage.objects o\n                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE \"C\" < v_next_seek\n                ORDER BY lower(o.name) COLLATE \"C\" DESC LIMIT 1;\n            END IF;\n        END IF;\n\n        EXIT WHEN v_peek_name IS NULL;\n\n        -- STEP 2: Check if this is a FOLDER or FILE\n        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);\n\n        IF v_common_prefix IS NOT NULL THEN\n            -- FOLDER: Handle offset, emit if needed, skip to next folder\n            IF v_skipped < offsets THEN\n                v_skipped := v_skipped + 1;\n            ELSE\n                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);\n                id := NULL;\n                updated_at := NULL;\n                created_at := NULL;\n                last_accessed_at := NULL;\n                metadata := NULL;\n                RETURN NEXT;\n                v_count := v_count + 1;\n            END IF;\n\n            -- Advance seek past the folder range\n            IF v_is_asc THEN\n                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);\n            ELSE\n                v_next_seek := lower(v_common_prefix);\n            END IF;\n        ELSE\n            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)\n            -- For ASC: upper_bound is the exclusive upper limit (< condition)\n            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)\n            FOR v_current IN EXECUTE v_batch_query\n                USING bucketname, v_next_seek,\n                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size\n            LOOP\n                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);\n\n                IF v_common_prefix IS NOT NULL THEN\n                    -- Hit a folder: exit batch, let peek handle it\n                    v_next_seek := lower(v_current.name);\n                    EXIT;\n                END IF;\n\n                -- Handle offset skipping\n                IF v_skipped < offsets THEN\n                    v_skipped := v_skipped + 1;\n                ELSE\n                    -- Emit file\n                    name := split_part(v_current.name, v_delimiter, levels);\n                    id := v_current.id;\n                    updated_at := v_current.updated_at;\n                    created_at := v_current.created_at;\n                    last_accessed_at := v_current.last_accessed_at;\n                    metadata := v_current.metadata;\n                    RETURN NEXT;\n                    v_count := v_count + 1;\n                END IF;\n\n                -- Advance seek past this file\n                IF v_is_asc THEN\n                    v_next_seek := lower(v_current.name) || v_delimiter;\n                ELSE\n                    v_next_seek := lower(v_current.name);\n                END IF;\n\n                EXIT WHEN v_count >= v_limit;\n            END LOOP;\n        END IF;\n    END LOOP;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "search_by_timestamp",
    "definition": "CREATE OR REPLACE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text)\n RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)\n LANGUAGE plpgsql\n STABLE\nAS $function$\nDECLARE\n    v_cursor_op text;\n    v_query text;\n    v_prefix text;\nBEGIN\n    v_prefix := coalesce(p_prefix, '');\n\n    IF p_sort_order = 'asc' THEN\n        v_cursor_op := '>';\n    ELSE\n        v_cursor_op := '<';\n    END IF;\n\n    v_query := format($sql$\n        WITH raw_objects AS (\n            SELECT\n                o.name AS obj_name,\n                o.id AS obj_id,\n                o.updated_at AS obj_updated_at,\n                o.created_at AS obj_created_at,\n                o.last_accessed_at AS obj_last_accessed_at,\n                o.metadata AS obj_metadata,\n                storage.get_common_prefix(o.name, $1, '/') AS common_prefix\n            FROM storage.objects o\n            WHERE o.bucket_id = $2\n              AND o.name COLLATE \"C\" LIKE $1 || '%%'\n        ),\n        -- Aggregate common prefixes (folders)\n        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior\n        aggregated_prefixes AS (\n            SELECT\n                rtrim(common_prefix, '/') AS name,\n                NULL::uuid AS id,\n                MIN(obj_created_at) AS updated_at,\n                MIN(obj_created_at) AS created_at,\n                NULL::timestamptz AS last_accessed_at,\n                NULL::jsonb AS metadata,\n                TRUE AS is_prefix\n            FROM raw_objects\n            WHERE common_prefix IS NOT NULL\n            GROUP BY common_prefix\n        ),\n        leaf_objects AS (\n            SELECT\n                obj_name AS name,\n                obj_id AS id,\n                obj_updated_at AS updated_at,\n                obj_created_at AS created_at,\n                obj_last_accessed_at AS last_accessed_at,\n                obj_metadata AS metadata,\n                FALSE AS is_prefix\n            FROM raw_objects\n            WHERE common_prefix IS NULL\n        ),\n        combined AS (\n            SELECT * FROM aggregated_prefixes\n            UNION ALL\n            SELECT * FROM leaf_objects\n        ),\n        filtered AS (\n            SELECT *\n            FROM combined\n            WHERE (\n                $5 = ''\n                OR ROW(\n                    date_trunc('milliseconds', %I),\n                    name COLLATE \"C\"\n                ) %s ROW(\n                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),\n                    $5\n                )\n            )\n        )\n        SELECT\n            split_part(name, '/', $3) AS key,\n            name,\n            id,\n            updated_at,\n            created_at,\n            last_accessed_at,\n            metadata\n        FROM filtered\n        ORDER BY\n            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,\n            name COLLATE \"C\" %s\n        LIMIT $4\n    $sql$,\n        p_sort_column,\n        v_cursor_op,\n        p_sort_column,\n        p_sort_order,\n        p_sort_order\n    );\n\n    RETURN QUERY EXECUTE v_query\n    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "search_legacy_v1",
    "definition": "CREATE OR REPLACE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)\n RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)\n LANGUAGE plpgsql\n STABLE\nAS $function$\ndeclare\n    v_order_by text;\n    v_sort_order text;\nbegin\n    case\n        when sortcolumn = 'name' then\n            v_order_by = 'name';\n        when sortcolumn = 'updated_at' then\n            v_order_by = 'updated_at';\n        when sortcolumn = 'created_at' then\n            v_order_by = 'created_at';\n        when sortcolumn = 'last_accessed_at' then\n            v_order_by = 'last_accessed_at';\n        else\n            v_order_by = 'name';\n        end case;\n\n    case\n        when sortorder = 'asc' then\n            v_sort_order = 'asc';\n        when sortorder = 'desc' then\n            v_sort_order = 'desc';\n        else\n            v_sort_order = 'asc';\n        end case;\n\n    v_order_by = v_order_by || ' ' || v_sort_order;\n\n    return query execute\n        'with folders as (\n           select path_tokens[$1] as folder\n           from storage.objects\n             where objects.name ilike $2 || $3 || ''%''\n               and bucket_id = $4\n               and array_length(objects.path_tokens, 1) <> $1\n           group by folder\n           order by folder ' || v_sort_order || '\n     )\n     (select folder as \"name\",\n            null as id,\n            null as updated_at,\n            null as created_at,\n            null as last_accessed_at,\n            null as metadata from folders)\n     union all\n     (select path_tokens[$1] as \"name\",\n            id,\n            updated_at,\n            created_at,\n            last_accessed_at,\n            metadata\n     from storage.objects\n     where objects.name ilike $2 || $3 || ''%''\n       and bucket_id = $4\n       and array_length(objects.path_tokens, 1) = $1\n     order by ' || v_order_by || ')\n     limit $5\n     offset $6' using levels, prefix, search, bucketname, limits, offsets;\nend;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "search_v2",
    "definition": "CREATE OR REPLACE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text)\n RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)\n LANGUAGE plpgsql\n STABLE\nAS $function$\nDECLARE\n    v_sort_col text;\n    v_sort_ord text;\n    v_limit int;\nBEGIN\n    -- Cap limit to maximum of 1500 records\n    v_limit := LEAST(coalesce(limits, 100), 1500);\n\n    -- Validate and normalize sort_order\n    v_sort_ord := lower(coalesce(sort_order, 'asc'));\n    IF v_sort_ord NOT IN ('asc', 'desc') THEN\n        v_sort_ord := 'asc';\n    END IF;\n\n    -- Validate and normalize sort_column\n    v_sort_col := lower(coalesce(sort_column, 'name'));\n    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN\n        v_sort_col := 'name';\n    END IF;\n\n    -- Route to appropriate implementation\n    IF v_sort_col = 'name' THEN\n        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))\n        RETURN QUERY\n        SELECT\n            split_part(l.name, '/', levels) AS key,\n            l.name AS name,\n            l.id,\n            l.updated_at,\n            l.created_at,\n            l.last_accessed_at,\n            l.metadata\n        FROM storage.list_objects_with_delimiter(\n            bucket_name,\n            coalesce(prefix, ''),\n            '/',\n            v_limit,\n            start_after,\n            '',\n            v_sort_ord\n        ) l;\n    ELSE\n        -- Use aggregation approach for timestamp sorting\n        -- Not efficient for large datasets but supports correct pagination\n        RETURN QUERY SELECT * FROM storage.search_by_timestamp(\n            prefix, bucket_name, v_limit, levels, start_after,\n            v_sort_ord, v_sort_col, sort_column_after\n        );\n    END IF;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "update_updated_at_column",
    "definition": "CREATE OR REPLACE FUNCTION storage.update_updated_at_column()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    NEW.updated_at = now();\n    RETURN NEW; \nEND;\n$function$\n"
  },
  {
    "schema": "vault",
    "function_name": "_crypto_aead_det_decrypt",
    "definition": "CREATE OR REPLACE FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea DEFAULT '\\x7067736f6469756d'::bytea, nonce bytea DEFAULT NULL::bytea)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE\nAS '$libdir/supabase_vault', $function$pgsodium_crypto_aead_det_decrypt_by_id$function$\n"
  },
  {
    "schema": "vault",
    "function_name": "_crypto_aead_det_encrypt",
    "definition": "CREATE OR REPLACE FUNCTION vault._crypto_aead_det_encrypt(message bytea, additional bytea, key_id bigint, context bytea DEFAULT '\\x7067736f6469756d'::bytea, nonce bytea DEFAULT NULL::bytea)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE\nAS '$libdir/supabase_vault', $function$pgsodium_crypto_aead_det_encrypt_by_id$function$\n"
  },
  {
    "schema": "vault",
    "function_name": "_crypto_aead_det_noncegen",
    "definition": "CREATE OR REPLACE FUNCTION vault._crypto_aead_det_noncegen()\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE\nAS '$libdir/supabase_vault', $function$pgsodium_crypto_aead_det_noncegen$function$\n"
  },
  {
    "schema": "vault",
    "function_name": "create_secret",
    "definition": "CREATE OR REPLACE FUNCTION vault.create_secret(new_secret text, new_name text DEFAULT NULL::text, new_description text DEFAULT ''::text, new_key_id uuid DEFAULT NULL::uuid)\n RETURNS uuid\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\nDECLARE\n  rec record;\nBEGIN\n  INSERT INTO vault.secrets (secret, name, description)\n  VALUES (\n    new_secret,\n    new_name,\n    new_description\n  )\n  RETURNING * INTO rec;\n  UPDATE vault.secrets s\n  SET secret = encode(vault._crypto_aead_det_encrypt(\n    message := convert_to(rec.secret, 'utf8'),\n    additional := convert_to(s.id::text, 'utf8'),\n    key_id := 0,\n    context := 'pgsodium'::bytea,\n    nonce := rec.nonce\n  ), 'base64')\n  WHERE id = rec.id;\n  RETURN rec.id;\nEND\n$function$\n"
  },
  {
    "schema": "vault",
    "function_name": "update_secret",
    "definition": "CREATE OR REPLACE FUNCTION vault.update_secret(secret_id uuid, new_secret text DEFAULT NULL::text, new_name text DEFAULT NULL::text, new_description text DEFAULT NULL::text, new_key_id uuid DEFAULT NULL::uuid)\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\nDECLARE\n  decrypted_secret text := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = secret_id);\nBEGIN\n  UPDATE vault.secrets s\n  SET\n    secret = CASE WHEN new_secret IS NULL THEN s.secret\n                  ELSE encode(vault._crypto_aead_det_encrypt(\n                    message := convert_to(new_secret, 'utf8'),\n                    additional := convert_to(s.id::text, 'utf8'),\n                    key_id := 0,\n                    context := 'pgsodium'::bytea,\n                    nonce := s.nonce\n                  ), 'base64') END,\n    name = coalesce(new_name, s.name),\n    description = coalesce(new_description, s.description),\n    updated_at = now()\n  WHERE s.id = secret_id;\nEND\n$function$\n"
  }
]

RLS policies details md

[
  {
    "policy_name": "Admins/Analyst can manage adjustments",
    "schema": "public",
    "table_name": "adjustments",
    "command": "*",
    "roles": [
      0
    ],
    "using_expression": "(workbench_id IN ( SELECT workbench_members.workbench_id\n   FROM workbench_members\n  WHERE ((workbench_members.user_id = auth.uid()) AND (workbench_members.role = ANY (ARRAY['founder'::text, 'ca'::text, 'analyst'::text])))))",
    "with_check_expression": null
  },
  {
    "policy_name": "Users can view adjustments of their workbenches",
    "schema": "public",
    "table_name": "adjustments",
    "command": "S",
    "roles": [
      0
    ],
    "using_expression": "(workbench_id IN ( SELECT workbench_members.workbench_id\n   FROM workbench_members\n  WHERE (workbench_members.user_id = auth.uid())))",
    "with_check_expression": null
  },
  {
    "policy_name": "Members can insert audit logs",
    "schema": "public",
    "table_name": "audit_logs",
    "command": "I",
    "roles": [
      0
    ],
    "using_expression": null,
    "with_check_expression": "is_workbench_member(workbench_id)"
  },
  {
    "policy_name": "Members can read audit logs",
    "schema": "public",
    "table_name": "audit_logs",
    "command": "S",
    "roles": [
      0
    ],
    "using_expression": "is_workbench_member(workbench_id)",
    "with_check_expression": null
  },
  {
    "policy_name": "Members can read budget items",
    "schema": "public",
    "table_name": "budget_items",
    "command": "S",
    "roles": [
      0
    ],
    "using_expression": "(EXISTS ( SELECT 1\n   FROM budgets\n  WHERE ((budgets.id = budget_items.budget_id) AND is_workbench_member(budgets.workbench_id))))",
    "with_check_expression": null
  },
  {
    "policy_name": "Members can read budgets",
    "schema": "public",
    "table_name": "budgets",
    "command": "S",
    "roles": [
      0
    ],
    "using_expression": "is_workbench_member(workbench_id)",
    "with_check_expression": null
  },
  {
    "policy_name": "Users can read own chat messages",
    "schema": "public",
    "table_name": "chat_messages",
    "command": "S",
    "roles": [
      0
    ],
    "using_expression": "(EXISTS ( SELECT 1\n   FROM chat_sessions\n  WHERE ((chat_sessions.id = chat_messages.session_id) AND (chat_sessions.user_id = auth.uid()))))",
    "with_check_expression": null
  },
  {
    "policy_name": "Users can read own chat sessions",
    "schema": "public",
    "table_name": "chat_sessions",
    "command": "S",
    "roles": [
      0
    ],
    "using_expression": "(auth.uid() = user_id)",
    "with_check_expression": null
  },
  {
    "policy_name": "Members can read compliances",
    "schema": "public",
    "table_name": "compliances",
    "command": "S",
    "roles": [
      0
    ],
    "using_expression": "is_workbench_member(workbench_id)",
    "with_check_expression": null
  },
  {
    "policy_name": "Admins and members can insert ledger entries",
    "schema": "public",
    "table_name": "ledger_entries",
    "command": "I",
    "roles": [
      0
    ],
    "using_expression": null,
    "with_check_expression": "(workbench_id IN ( SELECT workbench_members.workbench_id\n   FROM workbench_members\n  WHERE ((workbench_members.user_id = auth.uid()) AND (workbench_members.role = ANY (ARRAY['founder'::text, 'ca'::text, 'analyst'::text])))))"
  },
  {
    "policy_name": "Users can view ledger entries of their workbenches",
    "schema": "public",
    "table_name": "ledger_entries",
    "command": "S",
    "roles": [
      0
    ],
    "using_expression": "(workbench_id IN ( SELECT workbench_members.workbench_id\n   FROM workbench_members\n  WHERE (workbench_members.user_id = auth.uid())))",
    "with_check_expression": null
  },
  {
    "policy_name": "transactions_delete_ops",
    "schema": "public",
    "table_name": "transactions",
    "command": "D",
    "roles": [
      0
    ],
    "using_expression": "(EXISTS ( SELECT 1\n   FROM workbench_members wm\n  WHERE ((wm.workbench_id = transactions.workbench_id) AND (wm.user_id = auth.uid()) AND (wm.role = ANY (ARRAY['founder'::text, 'ca'::text, 'analyst'::text])))))",
    "with_check_expression": null
  },
  {
    "policy_name": "transactions_insert_ops",
    "schema": "public",
    "table_name": "transactions",
    "command": "I",
    "roles": [
      0
    ],
    "using_expression": null,
    "with_check_expression": "(EXISTS ( SELECT 1\n   FROM workbench_members wm\n  WHERE ((wm.workbench_id = transactions.workbench_id) AND (wm.user_id = auth.uid()) AND (wm.role = ANY (ARRAY['founder'::text, 'ca'::text, 'analyst'::text])))))"
  },
  {
    "policy_name": "transactions_select_all_members",
    "schema": "public",
    "table_name": "transactions",
    "command": "S",
    "roles": [
      0
    ],
    "using_expression": "(EXISTS ( SELECT 1\n   FROM workbench_members wm\n  WHERE ((wm.workbench_id = transactions.workbench_id) AND (wm.user_id = auth.uid()))))",
    "with_check_expression": null
  },
  {
    "policy_name": "transactions_update_ops",
    "schema": "public",
    "table_name": "transactions",
    "command": "U",
    "roles": [
      0
    ],
    "using_expression": "(EXISTS ( SELECT 1\n   FROM workbench_members wm\n  WHERE ((wm.workbench_id = transactions.workbench_id) AND (wm.user_id = auth.uid()) AND (wm.role = ANY (ARRAY['founder'::text, 'ca'::text, 'analyst'::text])))))",
    "with_check_expression": null
  },
  {
    "policy_name": "Users can read own profile",
    "schema": "public",
    "table_name": "user_profiles",
    "command": "S",
    "roles": [
      0
    ],
    "using_expression": "(auth.uid() = user_id)",
    "with_check_expression": null
  },
  {
    "policy_name": "Users can update own profile",
    "schema": "public",
    "table_name": "user_profiles",
    "command": "U",
    "roles": [
      0
    ],
    "using_expression": "(auth.uid() = user_id)",
    "with_check_expression": null
  },
  {
    "policy_name": "Members can read accounts",
    "schema": "public",
    "table_name": "workbench_accounts",
    "command": "S",
    "roles": [
      0
    ],
    "using_expression": "is_workbench_member(workbench_id)",
    "with_check_expression": null
  },
  {
    "policy_name": "Members can delete documents",
    "schema": "public",
    "table_name": "workbench_documents",
    "command": "D",
    "roles": [
      0
    ],
    "using_expression": "(EXISTS ( SELECT 1\n   FROM workbench_members\n  WHERE ((workbench_members.workbench_id = workbench_documents.workbench_id) AND (workbench_members.user_id = auth.uid()))))",
    "with_check_expression": null
  },
  {
    "policy_name": "Members can insert documents",
    "schema": "public",
    "table_name": "workbench_documents",
    "command": "I",
    "roles": [
      0
    ],
    "using_expression": null,
    "with_check_expression": "(EXISTS ( SELECT 1\n   FROM workbench_members\n  WHERE ((workbench_members.workbench_id = workbench_documents.workbench_id) AND (workbench_members.user_id = auth.uid()))))"
  },
  {
    "policy_name": "Members can read documents",
    "schema": "public",
    "table_name": "workbench_documents",
    "command": "S",
    "roles": [
      0
    ],
    "using_expression": "(EXISTS ( SELECT 1\n   FROM workbench_members\n  WHERE ((workbench_members.workbench_id = workbench_documents.workbench_id) AND (workbench_members.user_id = auth.uid()))))",
    "with_check_expression": null
  },
  {
    "policy_name": "Members can update documents",
    "schema": "public",
    "table_name": "workbench_documents",
    "command": "U",
    "roles": [
      0
    ],
    "using_expression": "(EXISTS ( SELECT 1\n   FROM workbench_members\n  WHERE ((workbench_members.workbench_id = workbench_documents.workbench_id) AND (workbench_members.user_id = auth.uid()))))",
    "with_check_expression": null
  },
  {
    "policy_name": "Members can read other members",
    "schema": "public",
    "table_name": "workbench_members",
    "command": "S",
    "roles": [
      0
    ],
    "using_expression": "is_workbench_member(workbench_id)",
    "with_check_expression": null
  },
  {
    "policy_name": "Non-investors can read parties",
    "schema": "public",
    "table_name": "workbench_parties",
    "command": "S",
    "roles": [
      0
    ],
    "using_expression": "is_workbench_member(workbench_id)",
    "with_check_expression": null
  },
  {
    "policy_name": "Members can insert records",
    "schema": "public",
    "table_name": "workbench_records",
    "command": "I",
    "roles": [
      0
    ],
    "using_expression": null,
    "with_check_expression": "is_workbench_member(workbench_id)"
  },
  {
    "policy_name": "Members can read records",
    "schema": "public",
    "table_name": "workbench_records",
    "command": "S",
    "roles": [
      0
    ],
    "using_expression": "is_workbench_member(workbench_id)",
    "with_check_expression": null
  },
  {
    "policy_name": "Members can update records",
    "schema": "public",
    "table_name": "workbench_records",
    "command": "U",
    "roles": [
      0
    ],
    "using_expression": "(EXISTS ( SELECT 1\n   FROM workbench_members\n  WHERE ((workbench_members.workbench_id = workbench_records.workbench_id) AND (workbench_members.user_id = auth.uid()))))",
    "with_check_expression": null
  },
  {
    "policy_name": "records_delete_ops",
    "schema": "public",
    "table_name": "workbench_records",
    "command": "D",
    "roles": [
      0
    ],
    "using_expression": "(EXISTS ( SELECT 1\n   FROM workbench_members wm\n  WHERE ((wm.workbench_id = workbench_records.workbench_id) AND (wm.user_id = auth.uid()) AND (wm.role = ANY (ARRAY['founder'::text, 'ca'::text, 'analyst'::text])))))",
    "with_check_expression": null
  },
  {
    "policy_name": "records_insert_ops",
    "schema": "public",
    "table_name": "workbench_records",
    "command": "I",
    "roles": [
      0
    ],
    "using_expression": null,
    "with_check_expression": "(EXISTS ( SELECT 1\n   FROM workbench_members wm\n  WHERE ((wm.workbench_id = workbench_records.workbench_id) AND (wm.user_id = auth.uid()) AND (wm.role = ANY (ARRAY['founder'::text, 'ca'::text, 'analyst'::text])))))"
  },
  {
    "policy_name": "records_select_all_members",
    "schema": "public",
    "table_name": "workbench_records",
    "command": "S",
    "roles": [
      0
    ],
    "using_expression": "(EXISTS ( SELECT 1\n   FROM workbench_members wm\n  WHERE ((wm.workbench_id = workbench_records.workbench_id) AND (wm.user_id = auth.uid()))))",
    "with_check_expression": null
  },
  {
    "policy_name": "records_update_ops",
    "schema": "public",
    "table_name": "workbench_records",
    "command": "U",
    "roles": [
      0
    ],
    "using_expression": "(EXISTS ( SELECT 1\n   FROM workbench_members wm\n  WHERE ((wm.workbench_id = workbench_records.workbench_id) AND (wm.user_id = auth.uid()) AND (wm.role = ANY (ARRAY['founder'::text, 'ca'::text, 'analyst'::text])))))",
    "with_check_expression": null
  },
  {
    "policy_name": "Members can read workbench",
    "schema": "public",
    "table_name": "workbenches",
    "command": "S",
    "roles": [
      0
    ],
    "using_expression": "is_workbench_member(id)",
    "with_check_expression": null
  },
  {
    "policy_name": "Authenticated users can read documents",
    "schema": "storage",
    "table_name": "objects",
    "command": "S",
    "roles": [
      16481
    ],
    "using_expression": "(bucket_id = 'workbench-documents'::text)",
    "with_check_expression": null
  },
  {
    "policy_name": "Authenticated users can upload documents",
    "schema": "storage",
    "table_name": "objects",
    "command": "I",
    "roles": [
      16481
    ],
    "using_expression": null,
    "with_check_expression": "(bucket_id = 'workbench-documents'::text)"
  },
  {
    "policy_name": "Users can upload documents to their workbenches",
    "schema": "storage",
    "table_name": "objects",
    "command": "I",
    "roles": [
      16481
    ],
    "using_expression": null,
    "with_check_expression": "((bucket_id = 'workbench-documents'::text) AND ((storage.foldername(name))[1] IN ( SELECT (workbench_members.workbench_id)::text AS workbench_id\n   FROM workbench_members\n  WHERE (workbench_members.user_id = auth.uid()))))"
  },
  {
    "policy_name": "Users can view documents in their workbenches",
    "schema": "storage",
    "table_name": "objects",
    "command": "S",
    "roles": [
      16481
    ],
    "using_expression": "((bucket_id = 'workbench-documents'::text) AND ((storage.foldername(name))[1] IN ( SELECT (workbench_members.workbench_id)::text AS workbench_id\n   FROM workbench_members\n  WHERE (workbench_members.user_id = auth.uid()))))",
    "with_check_expression": null
  },
  {
    "policy_name": "Workbench members can delete documents",
    "schema": "storage",
    "table_name": "objects",
    "command": "D",
    "roles": [
      16481
    ],
    "using_expression": "((bucket_id = 'workbench-documents'::text) AND ((storage.foldername(name))[1] IN ( SELECT (workbenches.id)::text AS id\n   FROM workbenches\n  WHERE (EXISTS ( SELECT 1\n           FROM workbench_members\n          WHERE ((workbench_members.workbench_id = workbenches.id) AND (workbench_members.user_id = auth.uid())))))))",
    "with_check_expression": null
  },
  {
    "policy_name": "Workbench members can read documents",
    "schema": "storage",
    "table_name": "objects",
    "command": "S",
    "roles": [
      16481
    ],
    "using_expression": "((bucket_id = 'workbench-documents'::text) AND ((storage.foldername(name))[1] IN ( SELECT (workbenches.id)::text AS id\n   FROM workbenches\n  WHERE (EXISTS ( SELECT 1\n           FROM workbench_members\n          WHERE ((workbench_members.workbench_id = workbenches.id) AND (workbench_members.user_id = auth.uid())))))))",
    "with_check_expression": null
  },
  {
    "policy_name": "Workbench members can update documents",
    "schema": "storage",
    "table_name": "objects",
    "command": "U",
    "roles": [
      16481
    ],
    "using_expression": "((bucket_id = 'workbench-documents'::text) AND ((storage.foldername(name))[1] IN ( SELECT (workbenches.id)::text AS id\n   FROM workbenches\n  WHERE (EXISTS ( SELECT 1\n           FROM workbench_members\n          WHERE ((workbench_members.workbench_id = workbenches.id) AND (workbench_members.user_id = auth.uid())))))))",
    "with_check_expression": null
  },
  {
    "policy_name": "Workbench members can upload documents",
    "schema": "storage",
    "table_name": "objects",
    "command": "I",
    "roles": [
      0
    ],
    "using_expression": null,
    "with_check_expression": "((bucket_id = 'workbench_documents'::text) AND (((storage.foldername(name))[1])::uuid IN ( SELECT workbench_members.workbench_id\n   FROM workbench_members\n  WHERE (workbench_members.user_id = auth.uid()))))"
  },
  {
    "policy_name": "Workbench members can view documents",
    "schema": "storage",
    "table_name": "objects",
    "command": "S",
    "roles": [
      0
    ],
    "using_expression": "((bucket_id = 'workbench_documents'::text) AND (((storage.foldername(name))[1])::uuid IN ( SELECT workbench_members.workbench_id\n   FROM workbench_members\n  WHERE (workbench_members.user_id = auth.uid()))))",
    "with_check_expression": null
  }
]