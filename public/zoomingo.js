
/**
 * Christopher Roy
 * 06/08/2020
 * Section AK: Austin Jenchi
 *
 * Zoomingo.js is the client side code used to run a game of zoomingo. It constructs a board
 * and allows the player to select cards in order to simulate a game of bingo while also
 * being able to save a players place for a later ocassion through database storage.
 */

"use strict";
(function() {

  let maxSize = 0;
  let trueSize = 0;
  let trueGameId = "";
  let gameId;
  let playerId;
  let cardSize = 0;
  const FONT_DIVIDEN = 13;
  const FONT_MODIFIER = 6;
  const CARD_MULTIPLIER = 620;
  const THREE_SECONDS = 3000;

  window.addEventListener("load", init);

  /**
   * The init function for zoomingo.js. Its purpose is it ensure that all code runs AFTER
   * zooming.html has loaded its DOM.
   */
  function init() {
    id("name").addEventListener("change", checkName);
    id("size-select").addEventListener("change", buildBoard);
    id("new-game").addEventListener("click", startGame);
    id("reset").addEventListener("click", resetBoard);
    id("bingo").addEventListener("click", checkBingo);
    id("resume").addEventListener("click", resumeGame);
  }

  function checkName() {
    id("resume").disabled = true;
    let name = id("name").value
    if (window.localStorage.getItem(name) !== null) {
      id("resume").disabled = false;
    }
  }

  /**
   * This function runs after the the new game button is pressed and has the primary purpose
   * of checking for potential errors in inputted data as well as calling app.js to retrieve
   * the data needed to create a new game.
   */
  function startGame() {
    let name = id("name").value;
    if (id("size-select").options[id("size-select").selectedIndex].value ===
       "--Please choose a board size--") {
      id("error").textContent = "Error: Please select a board size";
    } else if (name === "") {
      id("error").textContent = "Error: Please enter a name";
    } else {
      id("board").classList.remove("hidden");
      let selected = document.querySelectorAll(".selected");
      for (let i = 0; i < selected.length; i++) {
        selected[i].classList.remove("selected");
      }
      let url = "/newGame?name=" + name + "&size=" + trueSize;
      fetch(url)
        .then(checkStatus)
        .then(resp => resp.json())
        .then(fillBoard)
        .catch(handleError);
    }
  }

  /**
   * This function fills the board with randomly selected scenarios while also adding a click
   * event listener to every single "card" on the board which if pressed results in the card
   * being selected through a call to app.js. An error is thrown if the number of board values
   * in cardContents does not equal the size selected previously.
   * @param {JSON} cardContents - JSON needed to create a game of bingo (incldues board
   * Game ID, etc.).
   */
  function fillBoard(cardContents) {
    id("error").innerHTML = "";
    id("victory-message").innerHTML = "";
    id("name").disabled = true;
    id("size-select").disabled = true;
    id("board").style.fontSize = ((cardSize / FONT_DIVIDEN) + FONT_MODIFIER) + "px";
    trueGameId = cardContents.game_id;
    gameId = trueGameId;
    playerId = cardContents.player.id;
    let name = id("name").value;
    if(window.localStorage.getItem(name)) {
      window.localStorage.removeItem(name);
    }
    window.localStorage.setItem(name, JSON.stringify({"game_id": gameId,
    "player_id": playerId}));
    if (cardContents.player.board.length === maxSize) {
      let cards = document.querySelectorAll(".square");
      for (let i = 0; i < cards.length; i++) {
        let newCard = gen("p");
        newCard.textContent = cardContents.player.board[i].text;
        cards[i].innerHTML = "";
        cards[i].appendChild(newCard);
        newCard.parentNode.addEventListener("click", async function() {
          cards[i].classList.add("selected");
          let formData = new FormData();
          formData.append("scenario_id", cardContents.player.board[i].id);
          formData.append("game_id", cardContents.game_id);
          await selectCard(formData);
        });
      }
    } else {
      id("error").textContent = "Error: Not enough scenarios returned";
    }
  }

  /**
   * This function is used to select a card when a card is clicked by calling to app.js and
   * recording its data in the database zooming.db.
   * @param {FORM} formData - This cards scenario id and game Id. They will be used to
   * record the specific card selected for future use.
   * @return {Promise} - Returns the promise so that it can be awaited.
   */
  function selectCard(formData) {
    return fetch("/selectScenario", {
      method: "POST",
      body: formData
    })
      .then(checkStatus)
      .then(resp => resp.json())
      .catch(handleError);
  }

  /**
   * This function is used to build the board used for zoomingo. IT essentially creates
   * a certain amount of cards to fill it based off of a previously assigned size by the user.
   */
  function buildBoard() {
    id("board").innerHTML = "";
    id("board").classList.remove("hidden");
    let boardSize = id("size-select").options[id("size-select").selectedIndex].value;
    if (boardSize !== "--Please choose a board size--") {
      let size = parseInt(boardSize);
      trueSize = parseInt(boardSize);
      maxSize = size;
      cardSize = CARD_MULTIPLIER / Math.sqrt(parseInt(boardSize));
      id("board").innerHTML = "";
      for (let i = 0; i < size; i++) {
        let card = gen("div");
        card.classList.add("square");
        card.style.width = cardSize + "px";
        id("board").appendChild(card);
      }
    }
  }

  /**
   * This function is called when the reset button is pressed and essentially clears all the
   * board, error, and message sections so the player can make a clear new game.
   */
  function resetBoard() {
    id("victory-message").innerHTML = "";
    id("name").disabled = false;
    id("size-select").disabled = false;
    let cards = document.querySelectorAll(".square");
    for(let i = 0; i < cards.length; i++) {
      let trueCard = gen("div");
      if (cards[i].classList.contains("selected")) {
        trueCard.classList.remove("selected");
      }
      trueCard.classList.add("square");
      cards[i].parentNode.replaceChild(trueCard, cards[i]);
      cardSize = CARD_MULTIPLIER / Math.sqrt(cards.length);
      trueCard.style.width = cardSize + "px";

    }
    id("error").innerHTML = "";
  }

  /**
   * This function is called when the bingo button is pressed and makes a call to app.js
   * to determine whether the selected cards resulted in a victory or not.
   */
  function checkBingo() {
    let formData = new FormData();
    formData.append("game_id", trueGameId);
    fetch("/bingo", {
      method: "POST",
      body: formData
    })
      .then(checkStatus)
      .then(resp => resp.json())
      .then(finalizeBingo)
      .catch(handleError);
  }

  /**
   * This function determines whether the game was won or lost and accordingly removes event
   * listeners and display a victory message or displays a "loss" message.
   * @param {JSON} data - This JSON contains the answer as to whether hte palyer won or not
   * as well as the Games Id
   */
  function finalizeBingo(data) {
    if (data.winner) {
      id("name").disabled = false;
      id("size-select").disabled = false;
      id("victory-message").textContent = "WOOOHOOO!!!! YOU WON!!!";
      let cards = document.querySelectorAll(".square");
      for (let i = 0; i < cards.length; i++) {
        let text = cards[i].childNodes[0];
        let trueCard = gen("div");
        if (cards[i].classList.contains("selected")) {
          trueCard.classList.add("selected");
        }
        trueCard.classList.add("square");
        cards[i].parentNode.replaceChild(trueCard, cards[i]);
        cardSize = CARD_MULTIPLIER / Math.sqrt(cards.length);
        trueCard.style.width = cardSize + "px";

        trueCard.appendChild(text);
      }
      let buttons = id("buttons").children;
      for (let i = 0; i < buttons.length; i++) {
        buttons.disabled = false;
      }
    } else {
      id("victory-message").textContent = "You Lost D:";
      setTimeout(function() {
        id("victory-message").innerHTML = "";
      }, THREE_SECONDS);
    }
  }

  /**
   * This function is called when the resume button is pressed and makes a call to app.js
   * to return this players game (all data from new game essentially plus
   * selected values) in JSON format.
   */
  function resumeGame() {
    id("victory-message").innerHTML = "";
    let data = window.localStorage.getItem(id("name").value);
    let trueData = JSON.parse(data);
    fetch("/resumeGame?game_id=" + trueData.game_id + "&player_id=" + trueData.player_id)
      .then(checkStatus)
      .then(resp => resp.json())
      .then(rebeginGame)
      .catch(handleError);
  }

  /**
   * This function reconstructs the board and adds event listeners to them accordingly while
   * also adding selected values.
   * @param {JSON} data - This JSON contains the data needed to reconstruct the board
   * including but not limited to selected board values, Game Id, and Player Id.
   */
  function rebeginGame(data) {
    id("board").classList.remove("hidden");
    id("error").innerHTML = "";
    let board = JSON.parse(data.player.board);
    id("board").innerHTML = "";
    trueGameId = data.game_id;
    for (let i = 0; i < board.length; i++) {
      let card = gen("div");
      card.addEventListener("click", async function() {
        card.classList.add("selected");
        let formData = new FormData();
        formData.append("scenario_id", JSON.parse(data.player.board)[i].id);
        formData.append("game_id", data.game_id);
        await selectCard(formData);
      });
      card.classList.add("square");
      cardSize = CARD_MULTIPLIER / Math.sqrt(board.length);
      card.style.width = cardSize + "px";
      id("board").style.fontSize = ((cardSize / FONT_DIVIDEN) + FONT_MODIFIER) + "px";
      let cardVal = gen("p");
      cardVal.textContent = board[i].text;
      for (let f = 0; f < data.player.selected_scenarios.length; f++) {
        if (parseInt(board[i].id) === parseInt(data.player.selected_scenarios[f])) {
          card.classList.add("selected");
        }
      }
      card.appendChild(cardVal);
      id("board").appendChild(card);
    }

  }

  /**
   * This function takes an error that was caught and displays it in a special place made for
   * errors.
   * @param {ERROR} error -An error caught somewhere in a promise chain
   */
  function handleError(error) {
    id("error").textContent = error;
  }

  /**
   * This function accepts an id name and gets said elemeny from the html page index.html.
   * @param {String} idName - A name of an elements id in index.html.
   * @return {Element} - Returns an element with a specific ID.
   */
  function id(idName) {
    return document.getElementById(idName);
  }

  /**
   * This function accepts the name of an element type and then creates it.
   * @param {String} elName - The name of an element that is to be created.
   * @return {Element} gen - Returns a newly created element.
   */
  function gen(elName) {
    return document.createElement(elName);
  }

  /**
   * This function checks a promises status and depending on whether there is a resolved or
   * rejected state it will accordingly return the response or throw an error.
   * @param {Promise} response - A promise from a fetch which, in thise case, contains
   * data from the last.fm API.
   * @return {Promise} response - Returns the inputted parameter if there was no error
   * @throw {Error} error - A thrown error in string format
   */
  function checkStatus(response) {
    if (response.ok) {
      return response;
    }
    throw Error("Error in request: " + response.statusText);
  }

})();