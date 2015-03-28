User = require '../model/user'
ObjectId = require('mongoose-q')().Types.ObjectId
multiparty = require 'multiparty'
Boom = require 'boom'

# POST /login
# This is an alternative implementation that uses a custom callback to
# acheive the same functionality.
login = (req, reply)->
  console.log 'Logging in user', req.payload

  {username, password} = req.payload

  User.findByLowercaseUsername(username).then (user)->
    console.log 'Strategy Start 1'
    [user, user.comparePassword(password)]
  .spread (user, matched)->
    console.log 'Matched', matched
    token = user.generateRandomToken()
    user.accessToken.push token
    [token, user.saveQ()]
  .spread (token)->
    console.log 'token', token
    reply(access_token: token)
  .fail (err)->
    console.log 'FAILED', err
    reply(err)
  .done()

# POST /user
register = (req, reply)->
  console.log 'register', req.payload
  User.register(req.payload?.username, req.payload?.password)
  .then (user)->
    console.log 'Done', user
    reply(user).code(201)
  .fail (err)->
    console.log 'ERRROR', err
    reply(err)
  .done()


# GET /user
profile = (req, reply)->
  {user} = req.auth.credentials
  User.findOne(_id: user.id)
  .populate('groups', 'name')
  .populate('leftGroups', 'name')
  .populate('groupSettings')
  .execQ()
  .then (user)->
    reply(profile: user)
  .fail(reply)
  .done()


logout = (req, reply)->
  {user, token} = req.auth.credentials
  user.logout(token, req.query.all is 'true')
  .then ->
    reply({})
  .fail(reply)
  .done()


uploadAvatar = (req, reply)->
  {user} = req.auth.credentials
  user.uploadAvatar(req.payload.avatar).then ->
    reply({})
  .fail(reply)
  .done()


getAvatar = (req, reply)->
  idParam = req.params.id
  userId = new ObjectId(idParam)

  User.findOneQ(_id: userId)
  .then (user)->
    throw Boom.notFound() unless user
    user.getAvatar()
  .spread (meta, data)->
    reply(data).type(meta)
  .fail(reply)
  .done()


module.exports = [
  {
    method: 'POST'
    path: '/login'
    config:
      handler: login
      auth: false
  }
  {
    method: 'POST'
    path: '/user'
    config:
      handler: register
      auth: false
  }
  {
    method: 'GET'
    path: '/user'
    handler: profile
  }
  {
    method: 'DELETE'
    path: '/logout'
    handler: logout
  }
  {
    method: 'POST'
    path: '/user/{id}/avatar'
    config:
      handler: uploadAvatar
      payload:
        output: 'file'
  }
  {
    method: 'GET'
    path: '/user/{id}/avatar'
    handler: getAvatar
  }
]
