ALTER TABLE `log`
    CHANGE COLUMN `result` `result` TEXT NULL DEFAULT NULL AFTER `status`;