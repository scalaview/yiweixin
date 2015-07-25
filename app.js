var express = require('express')
var config = require("./config")
var myUtil = require("./my_util")
var menu = require("./menu")
var sign = require("./sign")
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()
var urlencodedParser = bodyParser.urlencoded({ extended: false })
var app = express()
var async = require("async")
var parseString = require('xml2js').parseString;
var accessToken = null
var wechat = require('wechat')
var flash = require('connect-flash');
var cookieParser = require('cookie-parser')
var session = require('express-session')
var _ = require('lodash')


var handlebars = require('express-handlebars').create({defaultLayout: 'main'});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);

app.use(express.static(__dirname + '/public'));

var wechatConfig = {
  token: config.token,
  appid: config.appId,
  encodingAESKey: config.aesKey
}

var token = function(callback){
    if(accessToken != null && !accessToken.isExpired()){
      callback()
    }else{
      myUtil.getAccessToken(function(data){
        accessToken = data
        console.log(accessToken)
        callback()
      })
    }
  }

app.use(express.query());
app.use('/wechat', wechat(wechatConfig, function (req, res, next) {
  var menusKeys = config.menus_keys
  var message = req.weixin;
  if (message.EventKey === menusKeys.button1) {
    res.reply('hehe');
  }else{
    res.reply([
      {
        title: '你来我家接我吧',
        description: '这是女神与高富帅之间的对话',
        picurl: 'http://nodeapi.cloudfoundry.com/qrcode.jpg',
        url: 'http://nodeapi.cloudfoundry.com/'
      }
    ])
  }
}))
app.use(cookieParser())
app.use(urlencodedParser)
app.use(jsonParser)
app.use(session({secret: 'yiliuliang', saveUninitialized: true, resave: true}))
app.use(flash());
app.use(function(req, res, next){
  var err = req.session.error,
      msg = req.session.notice,
      success = req.session.success;

  delete req.session.error;
  delete req.session.success;
  delete req.session.notice;

  if (err) res.locals.error = err;
  if (msg) res.locals.notice = msg;
  if (success) res.locals.success = success;

  next();
})

//login filter

var skipUrls = ['/wechat', '/admin/login', '/admin/register']
app.use(function (req, res, next) {
    var url = req.originalUrl;
    if (!_.includes(skipUrls, url) && !req.session.user_id) {
        return res.redirect("/admin/login");
    }
    next();
});

var models  = require('./models');
var router  = express.Router();

app.get('/', function(req, res) {
  res.render('home')
})


app.get('/admin/login', function(req, res){
  res.render('login', { layout: 'sign' })
})

app.post('/admin/login', urlencodedParser, function(req, res) {
  models.User.findOne({ where: {username: req.body.username} }).then(function(user){
    if(user && user.verifyPassword(req.body.password)){
      req.session.user_id = user.id
      res.redirect('/')
    }else{
      var message
      if(user){
        message = 'password error'
        res.render('login', {
         locals: {message: message},
         layout: 'sign'
        })
      }else{
        message = 'register new user'
        res.render('register', {
          locals: {message: message},
          layout: 'sign'
        })
      }
    }
  })
})

app.get('/admin/register', function(req, res){
  res.render('register', { layout: 'sign' })
})

app.post('/admin/register', function(req, res, next){
  var user = models.User.build({
    username: req.body.username,
    password: req.body.password
  })

  user.save().then(function(result) {
    req.session.user_id = user.id
    res.redirect('/')
  }).catch(function(err) {
    req.flash('errors', err.errors)
    res.render('register', {
      locals: { user: user },
      layout: 'sign'
    })
  })
})

app.get('/create-menus', function(req, res) {
  async.waterfall([token,
    function(callback){
      menu.createMenus(accessToken.getToken(), config.menus, function(status, error){
        if(status){
          res.send("create success")
        }else{
          res.send("create fail: code [" + error.errcode + "], mesg: [" + error.errmsg + "] ")
        }
    })}], function(error, callback){
      console.log(error)
    })
})


var server = app.listen(app.get('port'), function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});

