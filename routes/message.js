var User = require('../model/user');
var Message = require('../model/message');
var GroupSetting = require('../model/groupSetting');
var ObjectId = require('mongoose').Types.ObjectId;
var PER_PAGE = 30;

exports.getMessages = function(req, res) {

  var idParam = req.params.id.toString();
  var groupId = new ObjectId(idParam);
  var page = req.query.page;
  var usr = req.user;

  if (!page) page = 0;  
  
  //MyModel.find(query, fields, { skip: 10, limit: 5 }, function(err, results) { ... });
  Message.find( {group: groupId}, {}, {sort: {sent: -1}, skip: page * PER_PAGE, limit: PER_PAGE}, function(err, messages) {
    console.log('ERR: ' + err);
    
    if (err) return res.send(404, {error: 'Group not found!'});

    ///
    /// Assuming we found the messages, we should also clear the 'unread' count for this group
    ///
    GroupSetting.find({'user': usr._id}, function(err, gses) {
      
      var thisGs = GroupSetting.forGroup(gses, groupId);
      if (thisGs) {
	thisGs.unread = 0;
	usr.push(null, null, GroupSetting.totalUnread(gses), true);
	thisGs.save();
      }
    });

    res.send(messages);
  });
};




