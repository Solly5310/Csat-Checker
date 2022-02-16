var ticket_analysis = [];
var ticket_list;
var numberPerPage;
var currentPage;
var numberOfItems;
var numberOfPages;

//We need pagination to occur now

$(function () {
  //setting max paremeter to todays date
  var today = new Date();
  var dd = today.getDate();
  var mm = today.getMonth() + 1; //January is 0!
  var yyyy = today.getFullYear();

  if (dd < 10) {
    dd = "0" + dd;
  }

  if (mm < 10) {
    mm = "0" + mm;
  }

  today = yyyy + "-" + mm + "-" + dd;
  document.getElementById("datefield").setAttribute("max", today);
  document.getElementById("start").setAttribute("max", today);
  // The code here initialises the zendesk session with the app
  // There are many functions which can be applied to the client variable
});

//Event listener for the form submit
//First step in form submission
const form = document.getElementById("form");
form.addEventListener("submit", (event) => {
  var parentNode = document.getElementsByTagName("content");
  Promise.resolve().then((_) => (parentNode.innerHTML = ""));

  event.preventDefault();
  var dateStart = document.getElementById("start").value;
  var dateEnd = document.getElementById("datefield").value;
  console.log(dateEnd);
  var dateEnd = new Date(dateEnd);
  //
  dateEnd.setDate(dateEnd.getDate() + 1);
  dateEnd = dateEnd.toISOString().split("T")[0];

  checkTickets(dateStart, dateEnd);
});

function checkTickets(dateS, dateE) {
  var client = ZAFClient.init();
  console.log(typeof dateE);
  //initial scan of first 1000 available tickets (can revise)
  client
    .request(
      `/api/v2/search.json?query=type:ticket  created>=${dateS}  created<=${dateE}`
    )
    .then(function (response) {
      $(".div").empty();
      $(".div").remove();

      ticket_analysis = [];
      ticket_list = [];
      return response;
    })
    .then(function (tickets) {
      var result = tickets.results;

      console.log("here is the result");
      console.log(result);

      numberOfItems = result.length;
      numberPerPage = 5;
      currentPage = 1;

      // Number of pages
      numberOfPages = Math.ceil(numberOfItems / numberPerPage);
      console.log(numberOfPages);
      for (x in result) {
        let ticket_data = {
          subject: result[x].subject,
          description: result[x].description,
          ticketID: result[x].id,
          submitterID: result[x].submitter_id,
          //apply ticket analysis function, remember that you are just taking the general ticket score for now
          ticketScore:
            ticketAnalysis(result[x].description).score +
            ticketAnalysis(result[x].subject).score,
          url: returnTicketUrl(result[x].url, result[x].id),
        };
        ticket_analysis.push(ticket_data);
      }
      ticket_analysis.sort((a, b) => {
        return a.ticketScore > b.ticketScore ? 1 : -1;
      });
      //lets create a new list
      ticket_list = [];
      for (x in ticket_analysis) {
        //if (ticket_analysis[x].ticketScore < 0) {
        // we need to get this into an array to then display as needed
        var ticket_details = {
          list: `<div class="ticketDiv" id="c${x}"><table class="container-fluid div" ><tr><th>Ticket Subject:</th><th>Ticket ID:</th><th>Submitter ID:</th><th>Ticket Score:</th></tr> <tr> <td> ${ticket_analysis[x].subject}</td><td>${ticket_analysis[x].ticketID}</td><td>${ticket_analysis[x].submitterID}</td><td>${ticket_analysis[x].ticketScore}</td></tr></table></div>`,
          t: `<div ><a href="${ticket_analysis[x].url}" target="_blank"> <button class="tableButtons" type="button">Ticket</button></a><button class="tableButtons d${x}" id="c${x}" value=${x} type="button">Analysis</button></div>`,
        };
        ticket_list.push(ticket_details);
      }
    })
    .then(function (response) {
      buildPage(currentPage, numberPerPage, ticket_list);
      buildPagination(1);
    }),
    function (response) {
      console.error(response.responseText);
    };
}

function furtherTicketAnalysis(event) {
  var client = ZAFClient.init();
  console.log(event);
  var buttonId = event.target.id;
  var buttonId = buttonId.replace(/[^\d.-]/g, "");
  console.log(buttonId);
  var tID = ticket_analysis[buttonId].ticketID;

  client
    .request(`/api/v2/tickets/${tID}/comments`)
    .then(function (response) {
      var responseScore = 0;
      var z = 1;
      var dateResponses = [];
      var scoreList = [];
      for (x in response.comments) {
        var singleResponseScore = ticketAnalysis(response.comments[x].body);
        responseDate = new Date(response.comments[x].created_at);
        responseTime = responseDate.toLocaleTimeString();
        responseDate = responseDate.toLocaleDateString();
        dateResponses.push("R" + z + " " + responseDate);

        scoreList.push(singleResponseScore.score);
        z += 1;
        responseScore += singleResponseScore.score;
      }
      $(`.d${buttonId}`).remove();
      //second one for pagination implementation
      $(`#c${buttonId}`).append(
        `<div class="chart-container"> <canvas id="chartl${buttonId}" height="0px" width="opx"></canvas></div>`
      );
      displayGraph(dateResponses, scoreList, buttonId);

      //second one for pagination implementation
      $(`#c${buttonId}`).append(
        `<div class="responseDiv" id="rp${buttonId}"></div>`
      );

      //second one for pagination
      $(`#rp${buttonId}`).append(`<h4>Response:</h4>`);
      z = 1;
      for (x in response.comments) {
        $(`#rp${buttonId}`).append(
          `<p class="responseP">Response ${z}: ${response.comments[x].body}</p>`
        );
        z++;
      }

      $(`#rp${buttonId}`).append(`<p>Total Score: ${responseScore}</p>`);
    })
    .then(function (response) {
      $(`#${buttonId}`).remove();
    }),
    function (response) {
      console.error(response.responseText);
    };
}

function buildPage(currPage, numberPerPage, listArray) {
  let trimStart = (currPage - 1) * numberPerPage;
  let trimEnd = trimStart + numberPerPage;
  listArray = listArray.slice(trimStart, trimEnd);

  $(".content").empty();
  for (x in listArray) {
    console.log(listArray);
    console.log(x);
    $(".content").append(listArray[x].list);
    $(`#c${trimStart}`).append(listArray[x].t);
    const element = document.getElementsByClassName(`d${trimStart}`);
    console.log(element);
    element[0].addEventListener("click", furtherTicketAnalysis);
    trimStart++;
  }
}

function buildPagination(clickedPage) {
  $(".paginator").empty();

  for (let i = 0; i < numberOfPages; i++) {
    $(".paginator").append(
      `<button class="btn btn-primary" value="${i + 1}">${i + 1}</button>`
    );
  }
}

$(".paginator").on("click", "button", function () {
  var clickedPage = parseInt($(this).val());
  console.log(this);
  console.log(123);
  buildPagination(clickedPage);
  console.log(`Page clicked on ${clickedPage}`);
  buildPage(clickedPage, numberPerPage, ticket_list);
});

function ticketAnalysis(ticketDescription) {
  var sentiment = require("../node_modules/sentiment");
  var sentimentObj = new sentiment();
  var score = sentimentObj.analyze(ticketDescription);
  return score;
}

function returnTicketUrl(url, ticketId) {
  var index = url.indexOf(".zendesk.com");
  var newUrl = url.substr(0, index);
  return newUrl + `.zendesk.com/agent/tickets/${ticketId}`;
}

function displayGraph(responses, sc, id) {
  // Need to put in number of responses here
  const labels = responses;

  //Need to put score data here
  const data = {
    labels: labels,
    datasets: [
      {
        label: "Sentiment Score",
        backgroundColor: "red",
        borderColor: "red",
        data: sc,
      },
    ],
  };

  const config = {
    options: {
      plugins: {
        legend: {
          position: "top",
          labels: {
            fontColor: "white",
            color: "white",
          },
        },
      },
      scales: {
        y: {
          grid: {
            color: "white",
          },
          ticks: {
            color: "white",
          },
        },
        x: {
          grid: {
            color: "white",
          },
          ticks: {
            color: "white",
          },
        },
      },
    },
    type: "line",
    data: data,
  };

  const myChartl = new Chart(document.getElementById(`chartl${id}`), config);
}
