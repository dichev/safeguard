# Safe Guard

### Install & run

```bash
npm install
node bin/safeguard --help
node bin/safeguard -o bede,rank
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