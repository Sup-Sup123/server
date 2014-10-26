User = require('../model/user')
passport = require('passport')
ObjectId = require('mongoose-q')().Types.ObjectId
multiparty = require('multiparty')
Boom = require('boom')

# POST /login
# This is an alternative implementation that uses a custom callback to
# acheive the same functionality.
exports.loginPOST = (req, res, next)->
  console.log('Logging in user')
  (passport.authenticate 'local', (err, user, info)->
    return next(err) if err
    return next(401) unless user

    req.logIn user, (err)->
      return next(err) if err
      #
      # Set session-token to DB, not session
      #
      token = user.generateRandomToken()
      user.accessToken.push token
      user.saveQ().then ->
        res.json({'session-token': token})
      .catch(next)
      .done()
  )(req, res, next)

# POST /user
exports.register = (req, res, next)->
  username = req.body.username
  password = req.body.password

  User.register(username, password)
  .then (user)->
    res.status(201).json(user)
  .fail(next)
  .done()


# GET /user
module.exports.profile = (req, res, next)->
  User.findOne(_id: req.user.id)
  .populate('groups', 'name')
  .populate('leftGroups', 'name')
  .populate('groupSettings')
  .execQ()
  .then (user)->
    res.json profile: user
  .fail(next)
  .done()

module.exports.logout = (req, res, next)->
  user = req.user
  all = req.query.all is 'true'

  user.logout(req.headers['session-token'], all)
  .then ->
    req.user = null
    req.logout()
    res.json({})
  .fail(next)
  .done()


exports.postAvatar = (req, res, next)->
  user = req.user
  form = new multiparty.Form()

  form.parse req, (err, fields, files)->
    return next(err) if err

    user.uploadAvatar(files)
    .then ->
      res.status(200).json({})
    .fail(next)
    .done()


exports.getAvatar = (req, res, next)->
  idParam = req.params.id.toString()
  userId = new ObjectId(idParam)

  User.findOneQ(_id: userId)
  .then (user)->
    throw Boom.notFound() unless user
    user.getAvatar()
  .spread (meta, data)->
    res.contentType(meta) #this is lying
    res.write(data, encoding='binary')
    res.end()
  .fail(next)
  .done()
