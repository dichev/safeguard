ALTER TABLE `blocked`
	ADD COLUMN `periodFrom` DATETIME NOT NULL AFTER `time`,
	ADD COLUMN `periodTo` DATETIME NOT NULL AFTER `periodFrom`,
	ADD INDEX `periodFrom_periodTo` (`periodFrom`, `periodTo`);
	
ALTER TABLE `alerts`
	ADD COLUMN `periodFrom` DATETIME NOT NULL AFTER `time`,
	ADD COLUMN `periodTo` DATETIME NOT NULL AFTER `periodFrom`,
	ADD INDEX `periodFrom_periodTo` (`periodFrom`, `periodTo`);
