# Zoomingo API Documentation
This API provides data and information needed to create a game of bingo (or in this case
"zoomingo") by connecting the client to a database full of user data and scenarios.

## Return all data needed to start of a game of Zoomingo
**Request Format:** /newGame/:name/:size

**Request Type:** GET

**Returned Data Format**: JSON

**Description:** Returns the newly created games Game Id, Player Id, Player Name, and Board
which can then be used to initilize a Bingo game. Game Id is an into and directly inside
the JSON, but everything else is a subdivision of the field player with id being an int, name
being a string, and board being an array with JSON values containing a scenarios text (string)
and id (int).

**Example Request:** /newGame/Charlie/9X9

**Example Response:**
```json
{
  "game_id": 123,
  "player": {
    "id": 123,
    "name": "abc",
    "board": [
      {"id": 123, "text": "abc"},
      // ...
    ]
  }
}
```

**Error Handling:**
-N/A

## Selects a scenario based off of id and saves it in zoomingo.db
**Request Format:** /selectedScenario

**Request Type:** POST

**Returned Data Format**: JSON
spaces and capitalized via the UpperCamelCase scheme. An optional quotes parameter may be
passed in with the number of q
**Description:** Returns the Game Id and Scenario Id (in integer form) of the current game
and scenario being selected in order to better record data.

**Example Request:** /selectedScenario with the post parameters gameId and scenarioId

**Example Response:**
```json
{
  "game_id": 123,
  "scenario_id": 123
}
```

**Error Handling:**
Possible 400 (invalid request) error (JSON):

- Possible 400 (invalid request) errors (all plain text):
   * If this `scenario_id` is **not** in their list of given scenarios, this player **cannot**
    select this scenario, and no change to the database is made.
    * If this `scenario_id` is **already** in their list of selected scenarios, no change to the
     database is made, as they've already selected it.
  - If passed in an invalid pony name, returns an error with the message: `Given name {name}
  is not a valid
  Returns {"error": "Could not select scenario ID: " + scenarioId}

## Determines whether the currently selected cards you have results in a bingo (win) or not
**Request Format:** /bingo with the post paramter of gameId

**Request Type**: POST

**Returned Data Format**: JSON

**Description:** Returns a JSON object containing a Game Id(int) and a Winner(String) field with
  that is null if the player didn't win. Essentially states whether the player is a victor or not.

**Example Request:** /bingo with the post paramter of gameId

**Example Response:**
```json
{
  "game_id": 123,
  "winner": "abc"
}
```

**Error Handling:**

* If the game already has a winner (`winner` column for this `game_id` is not null), a 400 error is returned, as the game has already been won, and sends the JSON:
```json
{
  "error": "Game has already been won."
}
```

## Return all the data from the previous game and rebuilds the board
**Request Format:** /resumeGame/:game_id/:player_id

**Request Type:** GET

**Returned Data Format**: JSON

**Description:** Similar to the newGame endpoint, returns data in the same format except with
an additional field inside of the player field called selected_scenarios. This is used
to rebuild a board from a previous game.

**Example Request:** "/resumeGame/123/123"

**Example Response:**
```json
{
  "game_id": 123,
  "player": {
    "id": 123,
    "name": "abc",
    "board": [
      {"id": 123, "text": "abc"},
      // ...
    ],
    "selected_scenarios": [
      123,
      456,
      // ...
    ]
  }
}
```

**Error Handling:**
* If the `player_id` given in the parameters is not in the `game_state` data, then a 400 error is returned as JSON:
```json
{
  "error": "Cannot resume game: Player <id> was not part of game <id>"
}
```