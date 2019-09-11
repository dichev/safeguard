ALTER TABLE `log` CHANGE COLUMN `operator` `operator` VARCHAR(50) NOT NULL AFTER `id`;
ALTER TABLE `alerts` CHANGE COLUMN `operator` `operator` VARCHAR(50) NOT NULL AFTER `triggerKey`;