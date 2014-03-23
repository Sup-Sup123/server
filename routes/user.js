var User = require('../model/user');
var Group = require('../model/group');
var passport = require('passport');
var ObjectId = require('mongoose').Types.ObjectId; 
var Errors = require('../model/errors');

// POST /login
// This is an alternative implementation that uses a custom callback to
// acheive the same functionality.
exports.loginPOST = function(req, res, next) {
  console.log('Logging in user');
  console.log('Info: ' + JSON.stringify(req.body, null, 4));
  passport.authenticate('local', function(err, user, info) {
    console.log('Error: ' + err);
    console.log('user: ' + user);
    console.log('INFO: ' + info);
    if (err) { return next(err) }
    if (!user) {
      return res.send(401, {'error' : 'Unknown user'});
    }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      
      ///
      /// Set session-token to DB, not session
      ///
      user.generateRandomToken(function(token) {
	user.set('accessToken', token);
	user.save( function(err) {
	  res.send( {'session-token': user.get('accessToken')} );
	});
      });
    });
  })(req, res, next);
};

// POST /register
exports.register = function(req, res) {
  console.log('Body: ' + JSON.stringify(req.body, null, 4));
  User.newUser(req.body.username, req.body.password, function(err, user) {
    if(err) {
      res.send(400, {'error' : Errors.parseRegisterError(err)});
    } else {
      res.send(201, user);
    }
  });
};

// Get /profile
exports.profile = function(req, res) {
  User.findOne( {'accessToken': req.headers['session-token'] })
    .populate('groups')
    .exec(function(err, usr) {
      if (err || !usr) return res.send(400, {'error' : 'The user was not found!'});
      
      res.send({'profile': usr});
  });
};

//Put Invites
exports.acceptInvite = function(req, res) {

  var inviteToAccept = req.body.invite;
  User.findOne( {'accessToken': req.headers['session-token']}, function(err, usr) {
    if (err || !usr) return res.send(400, {'error' : 'The user was not found!'});
    if (inviteToAccept >= usr.invites.length) return res.send(400, {'error': 'The invite was not found!'});
    
    // Get the group from the invite...
    // Remove the invite from the group
    // Remove the invite from the user
    // Add the user to the group
    // Add the group to the user.
    Group.findOne( {_id: usr.invites[inviteToAccept]}, function(err, group) {
      if (err || !group) return res.send(400, {'error': 'The Group was not found for the invite! Maybe it was deleted?'});
      
      var index = group.invites.indexOf(usr._id);
      if (index > -1) {
	group.invites.splice(index, 1);
	group.members.push(usr._id);

	group.save(function(err) {
	  if (err) return res.send(400, {'error' : 'Error adding the user to the goupr!'});
	  var index2 = usr.invites.indexOf(group._id);
	  if (index2 > -1) {
	    usr.invites.splice(index2, 1);
	    usr.groups.push(group._id);
	    usr.save(function(err) {
	      if (err) return res.send(400, {'error' : 'Error adding the user to the group!'});
	      res.send(200);
	    });
	  } else {
	    res.send(400, {'error' : 'Error adding the user to the group!'});
	  }
	});
      } else {
	res.send(400, {'error' : 'Error adding the user to the group!'});
      }
    });
  });
};

exports.logout = function(req, res){
  req.logout();
  User.findOne( {'accessToken': req.headers['session-token'] }, function(err, usr) {
    usr.set('accessToken', null);
    usr.save(function(err) {
      res.send(200);
    });
  });
};
