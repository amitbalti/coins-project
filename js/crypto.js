// Debounce function to limit the rate at which a function is executed
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/* 
    Since the API is constantly blocked, and since not all the coins have rates, 
    and since not all the coins are able to display in the live reports, 
    I have created a JSON file with all the coins that do have the relevant and needed data, 
    and attached them so that the application will work properly 
  
    In case you want to use the actual api, I will leave the code in comment.
  */

const coinsUrl = "js/data.json";
const coinsRateUrl = "https://api.coingecko.com/api/v3/coins";
// const coinsUrl = "https://api.coingecko.com/api/v3/coins/list"; // Real API code

// local memory cache of the coins data
let data = null;

// Save selected coins to local storage
const saveSelectedCoins = () => {
  const selectedCoins = $("input[type=checkbox]:checked")
    .map(function () {
      return this.id;
    })
    .get();
  localStorage.setItem("selectedCoins", JSON.stringify(selectedCoins));
};

// Load selected coins from local storage
const loadSelectedCoins = () => {
  const selectedCoins = JSON.parse(localStorage.getItem("selectedCoins")) || [];
  selectedCoins.forEach((coin) => {
    $(`#${coin}`).prop("checked", true);
  });
};

async function getAllCoins() {
  $("#progress-bar").show(); // show progress bar
  return await $.get(coinsUrl, {
    beforeSend: function () {
      $("#progress-bar").show();
    },
    complete: function () {
      $("#progress-bar").hide();
    },
  });
}

async function getAllCoinsRate() {
  try {
    return await new Promise(function (resolve, reject) {
      $("#progress-bar").show(); // show progress bar
      myPromise.then(() => {
        $("#progress-bar").show();
        $.ajax({
          url: coinsRateUrl,
          dataType: "json",
          method: "GET",
          success: function (data_1) {
            $("#progress-bar").hide();
            resolve(data_1);
          },
          error: function () {
            $("#progress-bar").hide();
            reject();
          },
        });
      });
    });
  } catch (error) {
    // Handle the error
    $("#progress-bar").hide();
  }
}

/* 
    This function shows every coin in a different box, which will include the coin symbol, 
    coin name, a button with 'More Info' which will include the coin rate, and a switch 
    button which after will be selected will be also displayed in the 'Live report section'
  */
const getCoinsData = async (data) => {
  $("#allCoins").html("");
  // Show coins up to 100
  for (let i = 0; i < Math.min(100, data.length); i++) {
    let coin = data[i];

    $("#allCoins").append(
      `<div class="custom-control custom-switch switchBtn">
                      <label class="switch">
                          <input type="checkbox" id="${coin.symbol}" onchange="saveSelectedCoins()"/>
                          <span class="slider round"></span>
                      </label>
                      
                      <h2>${coin.symbol}</h2>
                      <h5>${coin.name}</h5>
                      
                      <button type="button" class="btn btn-primary moreInfoBtn" data-toggle="collapse" data-target="#collapseExample_${i}" aria-expanded="false" aria-controls="collapseExample_${i}">
                          More Info
                      </button>
                      <div class="collapse border-light" id="collapseExample_${i}">
                          <div class="border-info" id="currentPrice_${i}">
                          </div>
                      </div>
              </div>`
    );
    displayCoinRate(coin, i);
  }
  howMany();
  loadSelectedCoins(); // Load the user's previous selections
};

/* This function will show the coin rates */
const displayCoinRate = (coin, i) => {
  if (coin.market_data) {
    // Append current coin rate to the corresponding "currentPrice" div
    $(`#currentPrice_${i}`).append(`
        <h5><span class="infoBtnRate">USD: </span> ${coin.market_data.current_price.usd}$</h5>
        <h5><span class="infoBtnRate">EUR: </span>
         ${coin.market_data.current_price.eur}€</h5>
        <h5><span class="infoBtnRate">ILS: </span> ${coin.market_data.current_price.ils}₪</h5>
    `);
  } else {
    // Make API call to get current coin rate in USD, EUR, and ILS
    let coinRatesUrl = `${coinsRateUrl}/${coin.id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
    $.get(coinRatesUrl).then((coinRates) => {
      // Append current coin rate to the corresponding "currentPrice" div
      $(`#currentPrice_${i}`).append(`
        <h5><span class="infoBtnRate">USD: </span> ${coinRates.market_data.current_price.usd}$</h5>
        <h5><span class="infoBtnRate">EUR: </span>
         ${coinRates.market_data.current_price.eur}€</h5>
        <h5><span class="infoBtnRate">ILS: </span> ${coinRates.market_data.current_price.ils}₪</h5>
    `);
    });
  }
};

/* 
    This function is meant to limit the number of coins the user can choose.
    The user can choose up to 5 coins.
    If he will choose more than 5 coins, a modal will be shown with select box which
    will give us the option to remove one of the extra coins.
  */
const howMany = () => {
  let maxOptions = 5;
  let selected = $('input[type="checkbox"]');
  selected.change(function () {
    let checkedIds = $("input[type=checkbox]:checked")
      .map(function () {
        return this.id;
      })
      .get();
    if (checkedIds.length > maxOptions) {
      let optionsHtml = checkedIds
        .map((id) => `<option value="${id}">${id.toUpperCase()}</option>`)
        .join("");
      $(".modal-body").html(`
                <span class="modalStyle">Only 5 coins can be selected!</span><br/>
                Please select the coin to be <span class="removed">removed</span>: <br/><br/>
                <select id="removedCoin">${optionsHtml}</select>
              `);
      $("#coinModal").modal({ backdrop: "static", keyboard: false });
    }
  });
};

/* 
    This function will switch off the switch from coin that we selected to remove
*/
const removeCoin = () => {
  let removedId = $("#removedCoin").val();
  $("#" + removedId).prop("checked", false);
  saveSelectedCoins(); // Save the updated selections to local storage
  setTimeout(function () {
    $("#coinModal").modal("hide");
  }, 500);
};

/* 
    This function will help the user search for the coins using the search bar 
*/
const searchCoins = async () => {
  let searchTerm = $(".searchInp").val().toLowerCase();
  let data = await fetchCoins();
  let results = data.filter(function (coin) {
    return (
      coin.symbol.toLowerCase().includes(searchTerm) ||
      coin.name.toLowerCase().includes(searchTerm)
    );
  });
  getCoinsData(results);
};

/* 
    If data is empty then show the 'getAllCoins()' function, if not, 
    set timeout to two minutes and then try again. 
*/
const fetchCoins = async () => {
  if (data === null) {
    data = await getAllCoins();
    setTimeout(() => {
      data = null;
    }, 2 * 60 * 1000);
  }
  return data;
};

$(document).ready(async function () {
  let data = await fetchCoins();
  getCoinsData(data);
  getAllCoinsRate();

  $(".searchBtn").click(searchCoins);

  // Apply debounce to the search input
  $(".searchInp").on("input", debounce(searchCoins, 300));

  // Ensure the Home button calls showMain
  $("nav li:contains('Home')").click(showMain);
});

// Show home page using onclick on the 'Home' button
const showMain = async () => {
  $("#wrapper").removeClass().addClass("coins"); // remove former classes and add new class
  $(".searchInp").val(""); // clear search input
  let data = await fetchCoins();
  getCoinsData(data); // display all coins
  loadSelectedCoins(); // Load the user's previous selections
};

/*
    This function will call the 'Live Report' API, and will display the live coin rates
    with the settings that I set.
*/
const showLiveRepo = () => {
  $("#wrapper").removeClass().addClass("liveRepo"); // remove former classes and add new class

  // Will take the max 5 chosen coins
  let coins = $("input[type=checkbox]:checked")
    .map(function () {
      return this.id.toUpperCase();
    })
    .get();

  // Will add the max 5 chosen coins to the URL as queries
  const url =
    "https://min-api.cryptocompare.com/data/pricemulti?fsyms=" +
    coins.join(",") +
    "&tsyms=USD";

  let data_points = {}; // data_points will start as an empty object
  // Will map all the coins and will insert it into graphData
  let graphData = coins.map((coin) => {
    let dataPoints = []; // dataPoints will start as an empty object
    data_points[coin] = dataPoints; // For each data_point using specified coin, will add a new dataPoint

    return {
      type: "spline", // type of graph
      name: coin, // name of the coin
      showInLegend: true,
      xValueFormatString: "hh:mm:ss", // format of the time
      dataPoints,
    };
  });

  let options = {
    exportEnabled: true, // give option to the user to export the graph
    animationEnabled: true, // make animation every time we receive new data point

    axisX: {
      title: "Time",
    },
    axisY: {
      title: "Coin Rate (in USD $)",
      suffix: "$",
    },
    toolTip: {
      shared: true,
    },
    legend: {
      cursor: "pointer",
    },
    data: graphData,
  };

  $("#chartContainer").CanvasJSChart(options);

  /*
      This function is showing the current time and the coin with USD rate.
      After calling the coins rate api, it is updating (using 'setInterval') every two seconds, 
      and displaying the current coin rate and the 'newest' time
    */
  const displayGraph = () => {
    const now = new Date(); // give us the current time

    $.get(url, (data) => {
      coins.forEach((coin) => {
        const usdRate = data[coin]?.USD; // for each coin we are checking if it has USD rate

        const dataPoint = {
          x: now,
          y: usdRate,
        };

        data_points[coin].push(dataPoint);
      });

      $("#chartContainer").CanvasJSChart().render();
    });
  };

  displayGraph();
  setInterval(() => {
    displayGraph();
  }, 2000); // updating the rates every two seconds
};

// Show about using onclick on the 'About' button
const showAbout = () => {
  $("#wrapper").removeClass().addClass("about"); // remove former classes and add new class
};
