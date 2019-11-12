# SafeGuard

A service that watches for anomalies in game transactions, and blocks (or alerts) anything that goes over configurable limits (based on historical data and simulations). 

### Usage

```bash
node bin/safeguard --help
node bin/safeguard -o bede,rank
node bin/safeguard -o bede,rank --serve
node bin/safeguard -o bede,rank --history 2019-04-01..2019-04-18

```


### Monitoring
Safeguard could be tracked from three places:
1) everything is exposed in stdout/stderr, so it is recommended to be redirected to a log file
2) safeguard stores logs/alerts/bans details in its own local mysql database
3) safeguard exposes prometheus metrics via simple http server here
```bash
curl http://localhost:4444/heartbeat
curl http://localhost:4444/metrics
```
If you want to run locally Prometheus server with Grafana, see [test/monitoring/README.md](test/monitoring/README.md) 

### Install
```bash
npm install

# Prepare local database
mysql -uroot -e "CREATE DATABASE `safeguard`;"
mysql -uroot safeguard < db/schema.sql

# note on production this schema is included in platform schema
mysql -uroot safeguard < db/schema_platform.sql

# On production create restricted mysql user with these permissions (you must set the password inside):
mysql -uroot safeguard < db/permissions.sql

# Override db credentials in this file (always excluded from the repo)
cp src/config/custom.config.js-MIRROR src/config/custom.config.js
```


### Deploy
```bash
# the safeguard repo must be stored exactly in this directory
cd /opt/dopamine/safeguard

# activate safeguard as systemd service
systemctl enable /opt/dopamine/safeguard/safeguard.service
systemctl start safeguard
systemctl status safeguard | head -n 3

# to see the logs
journalctl -f -u safeguard
```

### Scope
Here is a draft of the protection scope. The values are chosen randomly, they will tune based on history data and potentials

#### v1 (current)
##### Limits
```
jackpots
  ✓ daily jackpot won two times in same day
    jackpot won 2 times in N minutes (exclude small jackpots)
    jackpot reset above the expected initial size
    jackpot reserve is bellow N

users
  ✓ £500,000 from games for last 24 hours
  ✓ £10,000 from games for last 24 hours excluding wins above £10,000
  ✓ £2,000,000 from jackpots for last 24 hours
  ✓ £100,000 from bonuses for last 24 hours
  ✓ x10,000 cumulative mplr for last 24 hours


games
  ✓ £500,000 for last 24 hours
  ✓ £10,000 for last 24 hours excluding wins above £10,000
  ✓ £2,000,000 from jackpots for last 24 hours
  ✓ £100,000 from bonuses for last 24 hours
  ✓ x10,000 cumulative mplr for last 24 hours
    Game win above expected game max win

operator
    £500,000 for last 48 hours
  ✓ £500,000 for last 24 hours
  ✓ £10,000 for last 24 hours excluding wins above £10,000
  ✓ £2,000,000 from jackpots for last 24 hours
  ✓ £100,000 from bonuses for last 24 hours
  ✓ x10,000 cumulative mplr for last 24 hours

```
#####  Actions (currently disabled)
```
Block user
Block game
Block bonuses
Block jackpots
Block operator

Block tournaments
Lock payments
```

#### Future Roadmap


```
# Actions ----------------
Block tournaments
Lock payments

# Trends detection ----------------
users
    Win 90 from 100 consecutive rounds (win>stake)
    Balance keep increasing in 90 from 100 consecutive rounds (in case of issue by operator side)
    All time (or from last negative hold) have cummulative positive trend
    Profit moving average
    Detect anomaly between balance and patouts/bets

operator
    losses every day
```

will be implemented in monitoring
```
RTP
    Games RTP
    Operator RTP
    Jackpot RTP
    Bonuses RTP
    User RTP?
Users
    Single win above £100,000
    Single win mplr above x1000
    Total wins above £100,000 for last 24 hours
    Total mplr above 1000x for last 24 hours
    Balance changes of VIP users (with stake > £100)
    Balance changes of VIP users (with initial balance > £200,000)
    Incremental serial winners
    Jackpot abusers
Bonuses
    ...
```

scope issues:
```
demo play risks
differences between our transaction data and actual operator data
```

#### TODO list

##### Safeguard
- currently, when there are extreme jackpots loss are blocked users/games/operators, but it will be better to block the jackpots
- currently when there are extreme bonus losses are blocked users/games/operators, but it will be better to block the bonus campaign
- protect from the tournaments (currently may be the fit in bonus checks)
- detect when there is no data in segments and mark the guard as inactive
- there are 2 cayetano games with maxMplr = 50000 causing potential issue with the thresholds
- cappedPureLossFromGames sounds interesting

##### Other systems
- platform: set in manual the win transactions above math.maxMultiplier
- platform: limit game max pays and jackpot pays during bonuses
- monitoring: track limited wins
