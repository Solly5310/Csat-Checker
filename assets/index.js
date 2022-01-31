$(function () {
  // The code here initialises the zendesk session with the app
  // There are many functions which can be applied to the client variable
  var client = ZAFClient.init();
  client.invoke("resize", { width: "100%", height: "300px" });
  startPrompt();
  //client call to get the user id for the current user
  //This is the code to receive the sentiment data
  //this code connects to the ZD API to collect ticket converstaion data
});

// First function that will initially prompt user
function startPrompt() {
  $("#test").append(
    "<h1 class='u-semibold u-fs-xl' >Welcome to the CSAT Checker</h1>"
  );
}

//event listener for the form submit
const form = document.getElementById("form");
form.addEventListener("submit", (event) => {
  event.preventDefault();
  var date = document.getElementById("start").value;
  $("#form").remove();
  $("#test").append(`<p>The date chosen was ${date}</p>`);
  checkTickets(date);
  console.log(ticketCheck);
});

function checkTickets(date) {
  var client = ZAFClient.init();
  var compareDate = new Date(date);
  //initial scan of first 1000 available tickets (can revise)
  client.request("/api/v2/search.json?query=type:ticket").then(
    function (tickets) {
      var ticket_analysis = [];
      console.log(tickets);
      console.log(tickets.results);
      var result = tickets.results;
      for (x in result) {
        console.log(result[x]);

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
        if (ticket_analysis[x].ticketScore < 0) {
          $("#list").append(
            `<p>Ticket Subject: ${ticket_analysis[x].subject}\tTicket ID:${ticket_analysis[x].ticketID}\tSubmitter ID: ${ticket_analysis[x].submitterID}\tTicket Score: ${ticket_analysis[x].ticketScore}\tURL:${ticket_analysis[x].url} </p>`
          );
        }
      }
    },
    function (response) {
      console.error(response.responseText);
    }
  );
}

const obtainCustomerInfo = (user) => {
  var client = ZAFClient.init();
  //resolve will mark the functino as successful
  return new Promise((resolve, reject) => {
    client.request(`/api/v2/users/${user}.json`).then((data) => {
      resolve(data);
    });
  });
};

//Show hide demonstration
$(document).ready(function () {
  $("#hide").click(function () {
    $("#form").hide();
  });
  $("#show").click(function () {
    $("#form").show();
  });
});
//remove duplicates function
function removeDuplicates(data) {
  return [...new Set(data)];
}

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
