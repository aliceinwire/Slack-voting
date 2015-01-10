// Generated by CoffeeScript 1.8.0
(function() {
  var Slackbot, active, app, db, introMessage, newUsersMessage, request, slackbot, users, ws, _;

  ws = require("nodejs-websocket");

  app = require('express')();

  app.use(require('body-parser').json());

  app.use(require('body-parser').urlencoded({
    extended: true
  }));

  db = require('mongojs')('frontDev');

  _ = require('underscore');

  request = require('request');

  Slackbot = require('slackbot');

  slackbot = new Slackbot('frontendDevelopers', 'iyQlHBBGvOh49to0aydHT5lY');

  active = null;

  users = 0;

  newUsersMessage = "Welcome! This channel is for admin announcements. Feel free to introduce yourself in #_intro and then speak openly in #_generaldiscussion.\n\nYou can join rooms under *Channels* on the left bar. We encourage you to share your work and participate in conversations. If you're an up-and-coming developer feel free to join #mentors. Ask within #regions if you're looking for a specific location's private group. General knowledge and ideas generally flow out of #knowledge.\n\nNotifications can be controlled through the down arrow next to the title. Also, Slack has a pretty amazing desktop application, if you're not already using it.\n\nIf you'd like to update the website or logo feel free to fork and and make a pull request. This is a community driven project so you're welcome to change or add anything to our site and community. You can find them at https://github.com/frontenddevelopers\n\nGlad you're here. ";

  introMessage = "Welcome, if you haven't already, please introduce yourself here. You're welcome to unsubscribe from the channel afterward if you'd rather not see group requests.";

  request('https://slack.com/api/rtm.start?token=xoxp-3331214327-3349545555-3365091811-9c50c8', function(e, res, body) {
    var conn;
    conn = ws.connect(JSON.parse(body).url);
    return conn.on('text', function(val) {
      if (val.type = 'accounts_changed') {
        return request('https://slack.com/api/users.list?token=xoxp-3331214327-3349545555-3365091811-9c50c8', function(e, res, body) {
          !users && (users = JSON.parse(body).members.length);
          if (JSON.parse(body).members.length - users >= 5) {
            users = 0;
            slackbot.send('#_announcements', newUsersMessage);
            return slackbot.send('#_intro', introMessage);
          }
        });
      }
    });
  });

  app.post('/region', function(req, res) {
    if (req.body.text.length <= 1) {
      return res.send('Please use `/region list` to view a list of all regions.');
    } else if (req.body.text.split(' ')[0] === 'list' || req.body.text === 'list') {
      return request('https://slack.com/api/groups.list?token=xoxp-3331214327-3349545555-3365091811-9c50c8&exclude_archived=1', function(e, response, body) {
        return res.send('Use `/region [group name]` to join.\nCurrent region groups:\n' + JSON.parse(body).groups.filter(function(a) {
          return a.name.split('_')[0] === 'reg';
        }).map(function(val) {
          return val.name;
        }).join(', '));
      });
    } else if (req.body.text.split(' ')[0] === 'create' || req.body.text === 'create') {
      console.log(req.body.text.split(' ')[1]);
      return request('https://slack.com/api/groups.create?token=xoxp-3331214327-3349545555-3365091811-9c50c8&name=reg_' + req.body.text.split(' ')[1], function(e, response, body) {
        if (JSON.parse(body).error) {
          return res.send(JSON.parse(body).error);
        } else {
          slackbot.send('#regions', 'New region created: reg_' + req.body.text.split(' ')[1]);
          return res.send('Group created!\nView groups using `/region list`');
        }
      });
    } else {
      return request('https://slack.com/api/groups.list?token=xoxp-3331214327-3349545555-3365091811-9c50c8&exclude_archived=1', function(e, response, body) {
        return request('https://slack.com/api/groups.invite?token=xoxp-3331214327-3349545555-3365091811-9c50c8&user=' + req.body.user_id + '&channel=' + (JSON.parse(body).groups.filter(function(val) {
          return val.name === req.body.text;
        })[0] || {}).id, function(e, response, body) {
          if (JSON.parse(body).error) {
            return res.send(JSON.parse(body).error);
          } else {
            return res.send('You have been invited.');
          }
        });
      });
    }
  });

  app.post('/announce', function(req, res) {
    console.log(req.body.text);
    return request('https://slack.com/api/channels.list?token=xoxp-3331214327-3349545555-3365091811-9c50c8&exclude_archived=1', function(e, response, body) {
      return JSON.parse(body).channels.forEach(function(val) {
        return slackbot.send('#' + val.name, req.body.text);
      });
    });
  });

  app.post('/vote', function(req, res) {
    if (active) {
      db.collection('votes').update({
        user_id: req.body.user_id
      }, {
        $set: {
          user_id: req.body.user_id,
          poll: active,
          vote: req.body.text,
          date: new Date()
        }
      }, {
        upsert: true
      });
      slackbot.send('#' + req.body.channel_name, req.body.user_name + ' just voted!\nYou can vote using\n> /vote [vote]');
      return res.send('Your vote has been counted/updated.');
    } else {
      return res.send('There are no open polls.');
    }
  });

  app.post('/poll', function(req, res) {
    if (active) {
      return db.collection('votes').find({
        poll: active
      }, function(e, docs) {
        return db.collection('polls').findOne({
          _id: active
        }, function(e, poll) {
          return res.send([
            'Poll Name: ' + poll.name, 'Poll Description: ' + poll.desc || 'N/A', 'Votes:', ((_.uniq(docs.map(function(val) {
              return val.vote;
            })).map(function(val) {
              return docs.filter(function(filt) {
                return filt.vote === val;
              }).map(function(val, index, arr) {
                return [val.vote, arr.length].join(': ');
              });
            })).map(function(val) {
              return val[0];
            })).join('\n')
          ].join('\n'));
        });
      });
    } else {
      return res.send('There are no open polls.');
    }
  });

  app.post('/openPoll', function(req, res) {
    return db.collection('polls').insert({
      name: req.body.text,
      user_id: req.body.user_id,
      date: new Date()
    }, function(e, doc) {
      if (!e) {
        active = doc._id;
        request.post('http://frontenddevelopers.org:3766/announce', {
          text: [req.body.user_name + ' just opened poll ' + req.body.text, 'Use `/poll` to view more information.', 'Use `/vote [yes no maybe]` to vote.'].join('\n')
        });
        return res.send(['New poll', req.body.text, 'has been created.'].join(' '));
      }
    });
  });

  app.post('/closePoll', function(req, res) {
    if (active) {
      return db.collection('polls').findOne({
        _id: active
      }, function(e, doc) {
        if (req.body.user_id === doc.user_id) {
          active = null;
          return res.send('The poll has been closed.');
        } else {
          return res.send('You do not have permsision to close this poll.');
        }
      });
    } else {
      return res.send('There is no active poll.');
    }
  });

  app.post('/pollEnd', function(req, res) {
    if (active) {
      return db.collection('polls').findOne({
        _id: active
      }, function(e, doc) {
        if (req.body.user_id === doc.user_id) {
          setTimeout((function() {
            return active = null;
          }), parseInt(req.body.text) * 1000 * 60);
          return res.send('The poll will close in ' + parseInt(req.body.text) + ' minutes!');
        } else {
          return res.send('You do not have permsision to close this poll.');
        }
      });
    } else {
      return res.send('There is no active poll.');
    }
  });

  app.listen(3766);

}).call(this);