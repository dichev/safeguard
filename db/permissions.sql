CREATE USER 'safeguard'@'127.0.0.1'   IDENTIFIED BY '{{PASSWORD}}';

GRANT ALL PRIVILEGES ON `safeguard`.*            TO 'safeguard'@'127.0.0.1';
GRANT ALL PRIVILEGES ON `safeguard`.*            TO 'safeguard'@'127.0.0.1';
GRANT SELECT, SHOW DATABASES, SHOW VIEW ON *.*   TO 'safeguard'@'127.0.0.1';
