/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;

CREATE TABLE IF NOT EXISTS `found` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` enum('ALERT','BLOCK') NOT NULL,
  `blocked` enum('YES','NO') NOT NULL,
  `percent` decimal(10,2) NOT NULL,
  `value` decimal(10,2) NOT NULL,
  `threshold` decimal(10,2) NOT NULL,
  `operator` varchar(15) NOT NULL,
  `userId` int(10) unsigned DEFAULT NULL,
  `gameId` varchar(50) DEFAULT NULL,
  `message` varchar(255) NOT NULL,
  `details` json DEFAULT NULL,
  `time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `log` (
  `id` int(1) unsigned NOT NULL AUTO_INCREMENT,
  `operator` varchar(20) NOT NULL,
  `command` varchar(50) NOT NULL,
  `status` enum('PROGRESS','DONE','ERROR','SKIP') NOT NULL DEFAULT 'PROGRESS',
  `result` json DEFAULT NULL,
  `duration` time(3) DEFAULT NULL,
  `timeStarted` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `timeEnded` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `command` (`command`),
  KEY `timeStarted` (`timeStarted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IF(@OLD_FOREIGN_KEY_CHECKS IS NULL, 1, @OLD_FOREIGN_KEY_CHECKS) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
