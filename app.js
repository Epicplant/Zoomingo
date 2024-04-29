/**
 * Christopher Roy
 * 06/08/2020
 * Section AK: Austin Jenchi
 *
 * The zoomingo API. This API allows for the initilization and running of a bingo game.
 * It includes the ability to save many players games and data while also being able to construct
 * unique boards/scenarios for each individual user.
 */

"use strict";
const express = require("express");
const app = express();
const multer = require("multer");
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(multer().none());
const sqlite3 = require("sqlite3");
const sqlite = require("sqlite");
let boardSize = 0;
let playerId;
let ultimateBoard;

const INVALID_PARAM_ERROR = 400;
const SERVER_ERROR = 500;
const PORT_NUM = 8000;

app.use(express.static("public"));

app.get("/newGame", async function(req, res) {
  try {
    boardSize = req.query["size"];
    let db = await getDBConnection();
    let tempSize = boardSize;
    let menu = await db.all("SELECT id, text FROM scenarios" +
                      " WHERE NOT (text LIKE '%FREE%') ORDER BY RANDOM() LIMIT ?", (tempSize - 1));
    menu.splice((menu.length / 2), 0, {
      "id": 41,
      "text": "FREE"
    });

    let resultOne = await db.run("INSERT INTO games (winner) VALUES(?)", null);
    let resultTwo = await db.run("INSERT INTO players (name) VALUES(?)", req.query["name"]);
    playerId = resultTwo.lastID;
    await db.all("INSERT INTO game_state (game_id, player_id, " +
    "given_scenario_ids) VALUES(?, ?, ?)", resultOne.lastID, playerId,
    JSON.stringify(menu));
    await db.close();
    ultimateBoard = menu;
    res.json({
      "game_id": resultOne.lastID,
      "player": {
        "id":  resultTwo.lastID,
        "name": req.query["name"],
        "board": menu
      }
    });
  } catch (error) {
    res.status(SERVER_ERROR).send(error.message);
  }
});

app.post("/selectScenario", async function(req, res) {
  try {
    let gameId = req.body.game_id;
    let scenarioId = req.body.scenario_id;
    let db = await getDBConnection();
    let scenarios = await db.all("SELECT given_scenario_ids FROM game_state WHERE game_id = ? " +
    "AND selected_scenario_ids IS NULL", gameId);
    scenarios = scenarios[0].given_scenario_ids;
    scenarios = JSON.parse(scenarios);
    console.log(scenarios);
    let bool = false;
    for(let i = 0; i < scenarios.length; i++) {
      if (scenarios[i].id === parseInt(scenarioId)) {
        bool = true;
      }
    }
    let selectedScenario = await db.all("SELECT selected_scenario_ids FROM game_state WHERE " +
    "? = selected_scenario_ids AND ? = game_id", scenarioId, gameId);
    if (bool && (selectedScenario.length === 0)) {
      let board = await db.all("SELECT given_scenario_ids FROM game_state WHERE "+
      "selected_scenario_ids = 'null'")
      await db.all("INSERT INTO game_state (selected_scenario_ids, game_id, player_id, " +
      "given_scenario_ids) VALUES(?, ?, ?, ?)", scenarioId, gameId, playerId,
        board);
      res.json({
        "game_id": gameId,
        "scenario_id": scenarioId
      });
    } else {
      res.status(INVALID_PARAM_ERROR).json({"error": "Could not select scenario ID: " + scenarioId});
    }
    db.close();
  } catch (error){
    res.status(SERVER_ERROR).send(error.message);
  }
});

app.post("/bingo", async function(req, res) {
  try {
    let gameId = req.body.game_id;
    let db = await getDBConnection();
    let selected = await db.all("SELECT selected_scenario_ids FROM game_state " +
    "WHERE ? = game_id", gameId);
    let winner = await db.all("SELECT winner FROM games WHERE ? = id", gameId);
    if ((winner.length === 0 && winner[0].winner === null) &&
      ((selected.length - 1) >= Math.sqrt(boardSize))) {
      await db.all("INSERT INTO games (winner) VALUES(?)", playerId);
      db.close();
      res.json({
        "game_id": gameId,
        "winner": "" + playerId
      });
    } else if (winner.length === 0 && winner[0].winner !== null) {
      res.status(INVALID_PARAM_ERROR).json({
        "error": "Game has already been won."
      });
    } else {
      res.json({
        "game_id": gameId,
        "winner": null
      });
    }
  } catch (error) {
    res.status(SERVER_ERROR).send(error.message);
  }
});

app.get("/resumeGame", async function(req, res) {
  try {
    let gameId = req.query["game_id"];
    let db = await getDBConnection();
    let gameState = await db.all("SELECT given_scenario_ids FROM " +
    "game_state WHERE game_id = ? AND player_id = ?", gameId, req.query["player_id"]);
    let selected = await db.all("SELECT selected_scenario_ids FROM game_state WHERE game_id = ? " +
                                "AND player_id = ?", gameId, req.query["player_id"]);
    let finalSelected = [];
    if (selected.length !== 0) {
      for (let i = 0; i < selected.length; i++) {
        if(selected[i].selected_scenario_ids !== null) {
          finalSelected.push(selected[i].selected_scenario_ids);
        }
      }
    }
    db.close();
    if (gameState && gameState.length !== 0) {
      res.json({
        "game_id": gameId,
        "player": {
          "id": playerId,
          "board": gameState[0].given_scenario_ids,
          "selected_scenarios": finalSelected
        }
      });
    } else {
      res.status(INVALID_PARAM_ERROR).json({ "error": "Cannot resume game: Player " +
      parseInt(req.query["player_id"]) +  " was not part of game " + parseInt(gameId)});
    }
  } catch (error) {
    res.status(SERVER_ERROR).send(error.message);
  }
});

/**
 * This function is used to connect to the database zoomingo.db in order
 * to retrieve data necessary to run a zoomingo game.
 */
async function getDBConnection() {
  const db = await sqlite.open({
    filename: "zoomingo.db",
    driver: sqlite3.Database
  });
  return db;
}

const PORT = process.env.PORT || PORT_NUM;
app.listen(PORT);