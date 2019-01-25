# Safe Guard

### Install & run

```bash
npm install

# Prepare local database
mysql -uroot -e "CREATE DATABASE `safeguard`;"
mysql -uroot safeguard < db/schema.sql

# On production create restricted mysql user with these permissions (you must set the password inside):
mysql -uroot safeguard < db/permissions.sql

# Override db credentials in this file (always excluded from the repo)
cp src/config/custom.config.js-MIRROR src/config/custom.config.js
```

Now you should be able to run it simply like that:
```bash
node bin/safeguard --help
node bin/safeguard -o bede,rank
```


### Monitoring
Safeguard could be tracked from 3 places
1) everything is exposed in stdout/stderr, so is recommended to be redirected to log file
2) safeguard stores logs/alerts/bans details in its own local mysql database
3) safeguard exposes prometheus metrics via simple http server here
```bash
curl http://localhost:4000/heartbeat
curl http://localhost:4000/metrics
```
If you want to run locally Prometheus server with Grafana, see [test/monitoring/README.md](test/monitoring/README.md) 


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
Here is a draft of the protection scope. The values are chosen randomly, they will tuned based on history data and potentials

#### Limits
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


#### Trends
notes:
```
users
    Win 90 from 100 consecutive rounds (win>stake)
    Balance keep increasing in 90 from 100 consecutive rounds (in case of issue by operator side)
    All time (or from last negative hold) have cummulative positive trend
    Profit moving average
    Detect anomaly between balance and patouts/bets

operator
    losses every day
```



####  Actions
```
Block user
Block game
Block bonuses
Block jackpots
Block operator

Block tournaments
Lock payments
```

----

#### Money Monitor
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
    grr
```

### Other
```
demo play risks
differences between our transaction data and actual operator data
```