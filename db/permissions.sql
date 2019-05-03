-- local safeguard database --
CREATE USER 'safeguard'@'%'   IDENTIFIED BY '{{PASSWORD}}';
GRANT ALL PRIVILEGES ON `safeguard`.*          TO 'safeguard'@'%';
GRANT SELECT, INSERT ON `safeguard`.`_blocked` TO 'safeguard'@'%';


-- external operators databases --
GRANT SELECT, SHOW DATABASES, SHOW VIEW ON *.* TO 'safeguard'@'%';

-- grant to all operator databases: --
GRANT SELECT, INSERT ON `{{operator.dbPrefix}}platform`.`_blocked` TO 'safeguard'@'%';
