CREATE USER 'safeguard'@'%'   IDENTIFIED BY '{{PASSWORD}}';

GRANT ALL PRIVILEGES ON `safeguard`.*            TO 'safeguard'@'%';
GRANT SELECT, SHOW DATABASES, SHOW VIEW ON *.*   TO 'safeguard'@'%';

-- grant to all operator databases: ---
GRANT SELECT, INSERT ON `{{OPERATR_PREFIX}}_platform`.`_blocked` TO 'safeguard'@'%'
