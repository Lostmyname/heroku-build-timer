Slugs = new Meteor.Collection("slugs");

if (Meteor.isClient) {
  Meteor.subscribe("slugs");
  Session.setDefault('builds', []);
  Session.setDefault('currentApp', "");

  var chart;

  function fetchAndSetApp (appName) {
    Meteor.call('getHerokuBuildData', appName, function (error, result) {
      if (!error) {
        Session.set('currentApp', appName);
        Session.set('builds', result);
        result.forEach(function (build) {
          if (build.slug.id && !Slugs.findOne({ appName: appName, slugId: build.slug.id })) {
            Meteor.call('getHerokuSlugData', appName, build.slug.id);
          }
        });
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
    builds: function () {
      return Session.get('builds');
    },
    primaryApp: function () {
      return Meteor.settings.public.primaryApp
    },
    primaryAppButtonClass: function () {
      return Meteor.settings.public.primaryApp == Session.get('currentApp') ? "active" : ""
    },
    secondaryAppButtonClass: function () {
      return Meteor.settings.public.primaryApp == Session.get('currentApp') ? "" : "active"
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
    },
    slugSize: function () {
      var slug = Slugs.findOne({ appName: Session.get('currentApp'), slugId: this.slug.id });
      return slug ? parseInt(slug.slugSize / (1024 * 1024)) : "-";
    }
  });
}

if (Meteor.isServer) {
  Meteor.publish("slugs", function () {
    return Slugs.find();
  });

  Meteor.methods({
    getHerokuBuildData: function (appName) {
      var response = herokuBuildsAPI(appName, 10);

      return response.data;
    },
    getHerokuSlugData: function (appName, slugId) {
      var response = herokuSlugAPI(appName, slugId);
      Slugs.upsert(
        {
          appName: appName,
          slugId: slugId
        },
        {
          appName: appName,
          slugId: slugId,
          slugSize: response.data.size
        }
      )
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

  function herokuSlugAPI (appName, slugId) {
    var response = HTTP.get('https://api.heroku.com/apps/' + appName + '/slugs/' + slugId,
      {
        headers: {
          accept: 'application/vnd.heroku+json; version=3',
          authorization: 'Bearer ' + Meteor.settings.herokuToken
        }
      }
    );

    return response;
  }
}
