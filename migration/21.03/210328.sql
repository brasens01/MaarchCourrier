-- *************************************************************************--
--                                                                          --
--                                                                          --
-- Model migration script - 21.03.27 to 21.03.28                            --
--                                                                          --
--                                                                          --
-- *************************************************************************--


UPDATE doctypes SET action_current_use = 'sae_copy' WHERE action_current_use = 'copy';

UPDATE parameters SET param_value_string = '21.03.28' WHERE id = 'database_version';
