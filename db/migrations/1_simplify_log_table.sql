ALTER TABLE `log`
CHANGE COLUMN `timeStarted` `time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) AFTER `result`,
DROP COLUMN `timeEnded`,
DROP INDEX `timeStarted`,
ADD INDEX `time` (`time`),
DROP INDEX `operator_timeStarted`;
