# Heroku Build Timer

A small Meteor app to analyse how the build time of your Heroku app changes over time.

You'll need to add in a settings.json file with two keys for this to work. Something like
```
{
  "herokuToken": [SOME TOKEN HERE],
  "primaryApp": [SOME HEROKU APP NAME HERE]
}
```
where the Heroku token is gained by running `heroku auth:token` and the app name is your Heroku app name.

To run this yourself you'll need [Meteor](http://meteor.com). You can run the site locally by running `meteor --settings settings.json`.