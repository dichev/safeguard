# TODO list

#### Safeguard
- currently when there are extreme jackpots loss are blocked users/games/operators, but will be better to block the jackpots
- currently when there are extreme bonus loss are blocked users/games/operators, but will be better to block the bonus campaign
- protect from the tournaments (currently may be the fit in bonus checks)
- detect when there is no data in segments and mark the guard as inactive
- alert when jackpot seed is above 900k (currently we will see the alert to late because it waits the wins)
- there are 2 cayetano games with maxMplr = 50000 causing potential issue with the thresholds
- cappedPureLossFromGames sounds interesting

#### Other systems
- platform: set in manual the win transactions above math.maxMultiplier
- platform: limit game max pays and jackpot pays during bonuses
- monitoring: track limited wins
