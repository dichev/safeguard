ALTER TABLE `_blocked`
ADD COLUMN `triggerKey` VARCHAR(255) NOT NULL AFTER `jackpotGroup`,
ADD INDEX `triggerKey` (`triggerKey`),
ADD INDEX `time` (`time`);