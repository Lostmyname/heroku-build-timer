if (Meteor.isClient) {
  Session.setDefault('data', []);
  Session.setDefault('currentApp', "");

  function fetchAndSetApp (appName) {
    Meteor.call('getHerokuData', appName, function (error, result) {
      if (!error) {
        Session.set('currentApp', appName);
        Session.set('data', result);
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
      response = HTTP.get('https://api.heroku.com/apps/' + appName + '/builds',
        {
          headers: {
            accept: 'application/vnd.heroku+json; version=3',
            range: 'started_at ..; order=desc,max=10;',
            authorization: 'Bearer ' + Meteor.settings.herokuToken
          }
        }
      );

      return response.data;
    }
  });
}
