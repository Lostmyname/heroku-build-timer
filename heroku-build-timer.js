if (Meteor.isClient) {
  Session.setDefault('data', []);
  Session.setDefault('currentApp', "");

  var chart;

  function fetchAndSetApp (appName) {
    Meteor.call('getHerokuData', appName, function (error, result) {
      if (!error) {
        Session.set('currentApp', appName);
        Session.set('data', result);
      }
    });
    Meteor.call('getGraphData', appName, function (error, result) {
      if (!error) {
        if (!chart) {
          var ctx = $("#build-time-chart").get(0).getContext("2d");
          chart = new Chart(ctx);
        }
        chart.Bar(result, {
          scaleShowVerticalLines: false
        });
      }
    });
  }

  Template.main.helpers({
    data: function () {
      return Session.get('data');
    },
    primaryApp: function () {
      return Meteor.settings.public.primaryApp
    },
    currentApp: function () {
      return Session.get('currentApp');
    }
  });

  Template.main.onCreated(function () {
    fetchAndSetApp(Meteor.settings.public.primaryApp);
  });

  Template.main.events({
    'click #fetch-primary-app' : function (event, template) {
      fetchAndSetApp(Meteor.settings.public.primaryApp);
    },
    'click #fetch-secondary-app' : function (event, template) {
      var appName = template.find('#secondary-app-name').value;
      fetchAndSetApp(appName);
    }
  });

  Template.build.helpers({
    createdAtHumanized: function () {
      return moment(this.created_at).format("dddd, MMMM Do YYYY, h:mm:ss a");
    },
    buildTime: function () {
      var start = moment(this.created_at);
      var end = moment(this.updated_at);
      var duration = moment.duration(end.diff(start));
      return duration.minutes() + "m " + duration.seconds() + "s";
    }
  });
}

if (Meteor.isServer) {
  Meteor.methods({
    getHerokuData: function (appName) {
      var response = herokuBuildsAPI(appName, 10);

      return response.data;
    },
    getGraphData: function (appName) {
      var response = herokuBuildsAPI(appName, 50);

      var graphData = response.data.map(function (obj) {
        return (moment(obj.updated_at).diff(moment(obj.created_at)) / 60000)
      });
      graphData.reverse();
      var data = {
        labels: Array(50).join(".").split("."),
        datasets: [
          {
            fillColor: "rgba(0,0,0,1)",
            strokeColor: "rgba(0,0,0,1)",
            data: graphData
          }
        ]
      };

      return data;
    }
  });

  function herokuBuildsAPI (appName, numberOfResults) {
    var response = HTTP.get('https://api.heroku.com/apps/' + appName + '/builds',
      {
        headers: {
          accept: 'application/vnd.heroku+json; version=3',
          range: 'started_at ..; order=desc,max=' + numberOfResults + ';',
          authorization: 'Bearer ' + Meteor.settings.herokuToken
        }
      }
    );

    return response;
  }
}
