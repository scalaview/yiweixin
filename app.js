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

var wechatConfig = {
  token: config.token,
  appid: config.appId,
  encodingAESKey: config.aesKey
};

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
  }
}));

app.set('port', process.env.PORT || 3000)

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

