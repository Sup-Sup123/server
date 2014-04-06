var mongoose = require('mongoose')
  , Schema = mongoose.Schema;
var apn = require('apn');
var gcm = require('node-gcm');

var apnConnection = new apn.Connection({});
var sender = new gcm.Sender('AIzaSyCmtVuvS3OlV801Mlq8IJDXOnsOXA502xA');

/**
 * Holds the information about a device. This is used to be able to run smart
 * notifications. We can send notifications to the "last active device" and
 * then wait to send to the rest.
 *
 * type Should be either 'ios' or 'android'. Used to send notifications to the
 * correct gateways. More can be added later.
 */
var Device = new Schema({
  user: {type: Schema.Types.ObjectId, ref: 'User'},
  accessToken: {type: String, default: ''},
  loggedIn: {type: Boolean, default: true},
  active: {type: Boolean, default: true},
  token: String,
  type: String,
  lastActiveDate: Date,
  failedAttempts: Number
});

/**
 * Sends a string to the device.
 * Sets some nice defaults, and takes care of sending to APN or GCM.
 *
 * @message A string to send to the user in a notification.
 */
Device.methods.send = function(message, badge, sound) {
  if (!this.active || !this.loggedIn) return;

  if (this.type === 'android') {

    var message = new gcm.Message({
      data: {
        text: message,
	alert: badge,
        sound: sound,
      }
    });

    var registrationIds = [];
    registrationIds.push(this.token); 

    console.log('Android Message: ' + JSON.stringify(message, null, 4));
    
    sender.send(message, registrationIds, 4, function (err, result) {
      console.log('GCM: ' + result + ' Err? ' + err);
    });

  } else {
    var options = { 
      //    'gateway': 'gateway.sandbox.push.apple.com'
    };

    if (!badge) badge = 0;
    
    var device = null;
    try {
      device = new apn.Device(this.token);
    } catch (err) {
      return;
    }

    var note = new apn.Notification();

    note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.

    note.badge = badge;
    note.sound = sound;
    note.alert = message;
    if (!message) {
      note.payload = {'content-available': 1};
    }

    console.log('FIRING AWAY: ' + JSON.stringify(note, null, 4) + ' TO: ' + this.token);

    apnConnection.pushNotification(note, device);
  }
};

module.exports = mongoose.model('Device', Device);
