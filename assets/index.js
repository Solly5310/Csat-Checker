var ticket_analysis = [];

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
  var client = ZAFClient.init();

  startPrompt();
});

// First function that will initially prompt user
function startPrompt() {
  $("#top").append("<h1 class='u-semibold u-fs-xl' >CSAT Checker</h1>");
}

function furtherTicketAnalysis(event) {
  var client = ZAFClient.init();

  var buttonId = event.target.id;

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
      $(`#t${buttonId}`).append(
        `<div class="chart-container"> <canvas id="chart${buttonId}" height="0px" width="opx"></canvas></div>`
      );

      displayGraph(dateResponses, scoreList, buttonId);
      $(`#t${buttonId}`).append(
        `<div class="responseDiv" id="r${buttonId}"></div>`
      );
      $(`#r${buttonId}`).append(`<h4>Response Log:</h4>`);
      z = 1;
      for (x in response.comments) {
        $(`#r${buttonId}`).append(
          `<p class="responseP">Response ${z++}: ${
            response.comments[x].body
          }</p>`
        );
      }
      $(`#r${buttonId}`).append(`<p>Total Score: ${responseScore}</p>`);
    })
    .then(function (response) {
      $(`#${buttonId}`).remove();
    }),
    function (response) {
      console.error(response.responseText);
    };
}

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
      $("#test").empty();
      ticket_analysis = [];
      return response;
    })
    .then(
      function (tickets) {
        var result = tickets.results;
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
        for (x in ticket_analysis) {
          //if (ticket_analysis[x].ticketScore < 0) {

          $("#list").append(
            `<div class="ticketDiv" id="t${x}"><table class="container-fluid div" ><tr><th>Ticket Subject:</th><th>Ticket ID:</th><th>Submitter ID:</th><th>Ticket Score:</th></tr> <tr> <td> ${ticket_analysis[x].subject}</td><td>${ticket_analysis[x].ticketID}</td><td>${ticket_analysis[x].submitterID}</td><td>${ticket_analysis[x].ticketScore}</td></tr></table></div>`
          );
          $(`#t${x}`).append(
            `<div ><a href="${ticket_analysis[x].url}" target="_blank"> <button class="tableButtons" type="button">Ticket</button></a><button class="tableButtons" id=${x} value=${x} type="button">Analysis</button></div>`
          );
          $(`#t${x}`).append(``);

          const element = document.getElementById(`${x}`);
          element.addEventListener("click", furtherTicketAnalysis);
        }
      },
      function (response) {
        console.error(response.responseText);
      }
    );
}

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

  const myChart = new Chart(document.getElementById(`chart${id}`), config);
}

//event listener for the form submit
const form = document.getElementById("form");
form.addEventListener("submit", (event) => {
  var parentNode = document.getElementById("list");
  Promise.resolve().then((_) => (parentNode.innerHTML = ""));

  event.preventDefault();
  var dateStart = document.getElementById("start").value;
  var dateEnd = document.getElementById("datefield").value;
  console.log(dateEnd);
  var dateEnd = new Date(dateEnd);
  //
  dateEnd.setDate(dateEnd.getDate() + 1);
  dateEnd = dateEnd.toISOString().split("T")[0];
  $("#test").append(
    `<p>The date range chosen was ${dateStart} to ${dateEnd}</p>`
  );
  checkTickets(dateStart, dateEnd);
});

// Unused --------------------------------------------

//remove duplicates function
function removeDuplicates(data) {
  return [...new Set(data)];
}

/*
const obtainCustomerInfo = (user) => {
  var client = ZAFClient.init();
  //resolve will mark the functino as successful
  return new Promise((resolve, reject) => {
    client.request(`/api/v2/users/${user}.json`).then((data) => {
      resolve(data);
    });
  });
};
*/

/*
  client.request({
    url: "/api/v2/tickets.json",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      ticket: {
        subject: "Test ticket #3000",
        comment: { body: "This is a test ticket" },
      },
    }),
  });
  */
