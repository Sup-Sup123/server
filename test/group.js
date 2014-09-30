require('../index');
var should = require('chai').should(),
    supertest = require('supertest'),
    api = supertest('http://localhost:3000');
var async = require('async');

var mongoose = require('mongoose');
var User = require('../index').User;
var Group = require('../index').Group;
var Message = require('../index').Message;
var GroupSetting = require('../index').GroupSetting;
var tokens = [];
var users = [];
var group = null;

describe('Groups', function() {
  
  before(function(done) {
    mongoose.connect( 'mongodb://localhost/test' );
    var db = mongoose.connection;

    async.series([
      function(callback) {
	///
	/// Remove all users
	///
	db.once('open', function() {
	  User.remove({}, function(err) {
	    callback();
	  });
	});
      },
      function(callback) {
	///
	/// Add three users to seed our DB. We have to do it via the post request,
	/// because registering does a lot more than just create a DB record. Plus,
	/// this has already been tested, so we know it works.
	///
	api.post('/user')
	  .send({'username' : 'test1', 'password' : 'test'})
	  .end(function(err, res) {
	    users.push(res.body);
	    // Number 2
	    api.post('/user')
	      .send({'username' : 'test2', 'password' : 'test'})
	      .end(function(err, res) {
		users.push(res.body);
		// Number 3
		api.post('/user')
		  .send({'username' : 'test3', 'password' : 'test'})
		  .end(function(err, res) {
		    users.push(res.body);
		    callback();
		  });
	      });
	  });
      },
      function(callback) {
	api.post('/login')
	  .send({'username' : 'test1', 'password' : 'test'})
	  .end(function(err, res) {
	    tokens.push( res.body['session-token'] );
	    //login second user
	    api.post('/login')
	      .send({'username' : 'test2', 'password' : 'test'})
	      .end(function(err, res) {
		tokens.push( res.body['session-token'] );
		//login third user
		api.post('/login')
		  .send({'username' : 'test3', 'password' : 'test'})
		  .end(function(err, res) {
		    tokens.push( res.body['session-token'] );
		    callback();
		  });
	      });
	  });
      }
    ],
    // optional callback
    function(err, results){
      // Oh look, now we are done
      done();
    });
    
  }); // before

  it.skip('should be empty for a brand new user', function(done) {

    api.get('/group')
      .set('session-token', tokens[0])
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	res.body.should.be.empty;
	done();
      });
  });

  it.skip('should not allow a user to create a group with no information', function(done) {
    api.post('/group')
    .set('session-token', tokens[0])
    .send({})
    .expect(400)
    .expect('Content-Type', /json/)
    .end(function(err, res) {
      should.not.exist(err);
      should.exist(res.body);
      should.exist(res.body.error);
      done();
    });
  });

  it.skip('should not allow a user to create a group with no message', function(done) {

    var user1 = users[1];

    api.post('/group')
    .set('session-token', tokens[0])
    .send({'members' : [user1._id]})
    .expect(400)
    .expect('Content-Type', /json/)
    .end(function(err, res) {
      should.not.exist(err);
      should.exist(res.body);
      should.exist(res.body.error);
      done();
    });
  });

  it.skip('should not allow a user to create a group with no members', function(done) {
    api.post('/group')
      .set('session-token', tokens[0])
      .send({'text' : 'This is a test message!'})
      .expect(400)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	should.exist(res.body.error);
	done();
      });
  });

  it.skip('should not allow a group to be created if the only member invited is the caller', function(done) {
    var user0 = users[0];

    api.post('/group')
      .set('session-token', tokens[0])
      .send({'text' : 'This is a test message!', 'members' : [user0.username]})
      .expect(400)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	should.exist(res.body.error);
	done();
     });
  });

  it.skip('should not allow a user to create a group with no members', function(done) {
    api.post('/group')
      .set('session-token', tokens[0])
      .send({'text' : 'This is a test message!'})
      .expect(400)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	should.exist(res.body.error);
	done();
      });
  });

  it.skip('should not allow a user to create a group without an array', function(done) {
    api.post('/group')
      .set('session-token', tokens[0])
      .send({'text' : 'This is a test message!', 'members': {'test': 'test'}})
      .expect(400)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	should.exist(res.body.error);
	done();
      });
  });

  it.skip('should let a user to create a group with the proper info', function(done) {

    var user1 = users[1];

    api.post('/group')
      .set('session-token', tokens[0])
      .send({'text' : 'This is a test message!', 'members': [user1.username]})
      .expect(201)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);

	var created = res.body;

	should.not.exist(created.name);
	created.members.should.have.length(2);
	created.leftMembers.should.be.empty;
	should.exist(created._id);
	created.messages.should.have.length(1);
	created.members.should.have.length(2);

	group = created;
	///
	/// Verify Group Settings
	///
	GroupSetting.findOne({'user': users[0]._id}, function(err, gs) {
	  should.exist(gs);
	  should.not.exist(err);
	  gs.unread.should.equal(0);
	  gs.group.toString().should.equal(created._id);

	  GroupSetting.findOne({'user': users[1]._id}, function(err2, gs2) {
	    should.exist(gs2);
	    should.not.exist(err2);
	    gs2.unread.should.equal(0);
	    gs2.group.toString().should.equal(created._id);
	    
	    done();	    
	  });
	});
      });
  });

  it.skip('should be show the new group for the user who created it', function(done) {

    api.get('/group')
      .set('session-token', tokens[0])
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	res.body.should.not.be.empty;

	var g = res.body[0];
	should.exist(g.unread);
	g.unread.should.equal(0);
	g.members.should.have.length(2);
	done();
      });
  });

  it.skip('should not allow a user not in the group to change the name', function(done) {
    api.put('/group/' + group._id + '/settings')
      .set('session-token', tokens[2])
      .send({'name': 'New Group Name!'})
      .expect(404)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	should.exist(res.body.error);
	done();
      });
  });

  it.skip('should not let a user change a group name with a bad id', function(done) {

    var badId = group._id.toString() + '111111';

    api.put('/group/' + badId + '/settings')
      .set('session-token', tokens[0])
      .send({'name': 'New Group Name!'})
      .expect(404)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	should.exist(res.body.error);
	done();
      });
  });

  it.skip('should not let a user change a group name with a valid, but not found, id', function(done) {

    var anID = group._id;
    anID = anID.substr(0, anID.length - 4);
    anID = anID + '9999';

    api.put('/group/' + anID + '/settings')
      .set('session-token', tokens[0])
      .send({'name': 'New Group Name!'})
      .expect(404)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	should.exist(res.body.error);
	done();
      });
  });

  it.skip('should let a user in the group change the group name', function(done) {

    Message.find({'group': group._id}, function(err, messages) {
      should.not.exist(err);
      messages.should.have.length(1);

      api.put('/group/' + group._id + '/settings')
	.set('session-token', tokens[0])
	.send({'name': 'New Group Name!'})
	.expect(200)
	.expect('Content-Type', /json/)
	.end(function(err, res) {
	  should.not.exist(err);
	  should.exist(res.body);
	  should.not.exist(res.body.error);
	  
	  Group.findOne({_id: group._id}, function(err, group) {
	    should.not.exist(err);
	    should.exist(group);
	    group.name.should.equal('New Group Name!');

	    Message.find({'group': group._id}, {}, {sort: {sent: 1}}, function(err, messages) {
	      should.not.exist(err);
	      messages.should.have.length(2);
	      messages[1].text.should.equal('Group is now called New Group Name!');
	      messages[1].type.should.equal('system');
	      done();
	    });
	  });
	});
    });
  });

  it.skip('should not let you leave a group you are not in', function(done) {

    api.put('/group/' + group._id + '/leave')
      .set('session-token', tokens[2])
      .send()
      .expect(404)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	should.exist(res.body.error);
	done();
      });
  });

  it.skip('should let a user in the group leave', function(done) {

    Message.find({'group': group._id}, function(err, messages) {
      should.not.exist(err);
      messages.should.have.length(2);

      api.put('/group/' + group._id + '/leave')
	.set('session-token', tokens[1])
	.expect(200)
	.expect('Content-Type', /json/)
	.end(function(err, res) {
	  should.not.exist(err);
	  should.exist(res.body);
	  should.not.exist(res.body.error);

	  ///
	  /// And now... validate
	  ///
	  Group.findOne({_id: group._id}, function(err, aGroup) {
	    should.not.exist(err);
	    should.exist(aGroup);
	    aGroup.members.should.have.length(1);
	    aGroup.members.should.contain(users[0]._id.toString());
	    aGroup.leftMembers.should.have.length(1);
	    aGroup.leftMembers.should.contain(users[1]._id.toString());

	    User.findOne({_id: users[1]._id}, function(err, user) {
	      user.groups.should.be.empty;
	      user.leftGroups.should.have.length(1);
	      user.leftGroups.should.contain(aGroup._id);

	      Message.find({'group': aGroup._id}, {}, {sort: {sent: 1}}, function(err, messages) {
		should.not.exist(err);
		messages.should.have.length(3);
		messages[2].text.should.equal('test2 has left the group.');
		messages[2].type.should.equal('system');
		done();
	      });
	    });
	  });
	});
    });
  });

  it.skip('it should fail to add nothing to a group', function(done) {

    api.put('/group/' + group._id + '/add')
      .set('session-token', tokens[0])
      .send({})
      .expect(400)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	should.exist(res.body.error);
	done();
      });
  });

  it.skip('it should return OK if you add no one to a group', function(done) {

    api.put('/group/' + group._id + '/add')
      .set('session-token', tokens[0])
      .send({'invitees' : []})
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	should.not.exist(res.body.error);
	done();
      });
  });

  it.skip('it should not let a user add themselves', function(done) {
    api.put('/group/' + group._id + '/add')
      .set('session-token', tokens[0])
      .send({'invitees' : []})
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	should.not.exist(res.body.error);
	done();
      });
  });

  it.skip('Another user cannot add a user who has left a group', function(done) {

    Group.findOne({_id: group._id}, function(err, aGroup) {
      should.not.exist(err);
      should.exist(aGroup);
      aGroup.members.should.have.length(1);
      aGroup.members.should.contain(users[0]._id.toString());
      aGroup.leftMembers.should.have.length(1);
      aGroup.leftMembers.should.contain(users[1]._id.toString());

      api.put('/group/' + group._id + '/add')
	.set('session-token', tokens[0])
	.send({'invitees' : [users[1].username]})
	.expect(400)
	.expect('Content-Type', /json/)
	.end(function(err, res) {
	  should.not.exist(err);
	  should.exist(res.body);
	  should.exist(res.body.error);

	  Group.findOne({_id: group._id}, function(err, aGroup2) {
	    should.not.exist(err);
	    should.exist(aGroup2);
	    aGroup2.members.should.have.length(1);
	    aGroup2.members.should.contain(users[0]._id.toString());
	    aGroup2.leftMembers.should.have.length(1);
	    aGroup2.leftMembers.should.contain(users[1]._id.toString());
	    done();
	  });
	});
      });
    });


  it.skip('it should let you add a new user to the group', function(done) {
    var user2 = users[2];
    api.put('/group/' + group._id + '/add')
      .set('session-token', tokens[0])
      .send({'invitees' : [user2.username]})
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	should.not.exist(res.body.error);

	Group.findOne({_id: group._id}, function(err, aGroup2) {
	  should.not.exist(err);
	  should.exist(aGroup2);
	  aGroup2.members.should.have.length(2);
	  aGroup2.members.should.contain(users[0]._id.toString());
	  aGroup2.members.should.contain(users[2]._id.toString());
	  done();
	});
      });
  });

  after(function(done) {
    mongoose.disconnect();
    done();
  });

});

