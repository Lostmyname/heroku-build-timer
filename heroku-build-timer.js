if (Meteor.isClient) {
  Session.setDefault('data', []);

  Template.main.helpers({
    data: function () {
      return Session.get('data');
    }
  });

  Template.main.onCreated(function () {
    Meteor.call('getHerokuData', function (error, result) {
      if (!error) {
        Session.set('data', result);
      }
    });
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
    getHerokuData: function () {
      response = HTTP.get('https://api.heroku.com/apps/' + Meteor.settings.primaryApp + '/builds',
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
