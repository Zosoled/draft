# Movie Draft Happy Fun Time <>

This is meant to be a user friendly app to help groups draft movies. It's meant to do as much of the busy work for you as it can. This is rather U.S. centric.

## What is a movie draft
First, full credit to [Night Attack/NSFW Show](http://nightattack.tv/), [Diamond Club](http://diamondclub.tv/), and [Chat Relm](http://chatrelm.net). The idea of a movie draft is not my own I simply wrote some software to help my coworkers and I conduct our own.

A movie draft is something like a fantasy sports draft... or so I'm told. Generally there are two drafts per year, the Summer Block Buster Season and the Winter Oscar Bait Season. A group of people get together with equal amounts of fake money to "buy" movies in the upsoming season. Roughly 30 movies are generally included in the draft and the group bids to own them. The goal is, two weeks after the last movies is released, to have the highest income from your owned movies using US domestic grosses.

## General Info
* There are 2 drafts per year
    * Summer Blockbuster - Usually kicking off in May
    * Winter Oscar Bait - Usually kicking off in October
* Approximately 30 movies should be chosen per draft
* Teams of 4 to 6 are best given that number of movies
* Drafting will usually happen in the 2 weeks prior to the first film's release.
* The order of movies is randomized prior to drafting
* Each week the (domestic) film grosses will be tracked using Box Office Mojo 
* The game ends 2 weeks (14 days) after the last movie is released

## Rules Per Team
* Teams should expect the drafting to take 60 - 90 minutes
* Each player gets 100 IDX Bucks - these are totally imaginary moneys that can be used to "buy" a major film studio release from the current season.
    * Each player has at most 100 IDX Bucks to spend on all their combined purchases. Meaning they can not exceed a total of $100.
* Films are put up for auction to all players one film at a time in the pre-randomized order
* Generally the film trailer is played before bidding begins.
* Vigorous discussion is encouraged (and is a lot of the fun).
* Should the bidding for any movie (Star Wars) exceed 100 IDX Bucks those involved can choose to continue the bidding for a lower percentage of that film's gross
This is rare.
    * Players must reach 100 IDX bucks before bidding down the percentage.
    * "I bid 100 at 70%" - would mean that the domestic gross would be multiplied by 0.7 before being applied to the players total.
* If multiple teams end up playing (each an independent draft) the winners of each group will be compared by their efficiency (total Adjusted Gross per IDX Buck spent). The team winner with the best efficiency will get bragging rights.
* If a large group (8 - 12) wants to participate people could split into pairs

## TODO
* impliment actual error/exception handling especially in the cli scripts
* make it not look like a 3rd grader wrote the stylesheet

# Installation
```
git clone <...>
cd draft
npm install
```

# Setup
Right now inserting draft and movie information is done through cli scripts

## create_draft.js
This creates a draft. You'll need to enter the season (summer or winter), the year, and the dates that the different phases start and stop.

## add_movies.js
This adds all the movies to the draft you created above. This is the most time consuming. Eventually I would like to at least add some hints to the process. You'll need to know each film's title, release date, imdb id, box office mojo id, the yourube id for the film's trailer, and a url for the poster (I recomment using "orginal" sized posters from themoviedb).

## edit_movies.js
Similar to add_moves.js but this will have movies that are already in a given draft prepopulated as default values in the prompts.

#### Special Note
NEDB persists in memory so you may need to restart the app (provided it was running) after using this CLI scripts.

# Running
You can launch the server using

```
npm start
```

This is an app build on express so like most express apps it defaults to port 3000 for development. To run on port 80 for prod you'll need to be root and run the server as
```
PORT=80 npm start
```

I also recommend using nodemon to keep the app running and automatically restarting when monitored files are edited.
