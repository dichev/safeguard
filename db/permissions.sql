CREATE USER 'safeguard'@'%'   IDENTIFIED BY '{{PASSWORD}}';

GRANT ALL PRIVILEGES ON `safeguard`.*            TO 'safeguard'@'%';
GRANT ALL PRIVILEGES ON `safeguard`.*            TO 'safeguard'@'%';
GRANT SELECT, SHOW DATABASES, SHOW VIEW ON *.*   TO 'safeguard'@'%';
