var express = require('express');
var config = require("./config")
var myUtil = require("./my_util")
var app = express();
var async = require("async");
var assceToken = null;
var wechat = require('wechat');

var config = {
  token: config.token,
  appid: config.appId,
  encodingAESKey: config.aesKey
};

var token = function(callback){
      myUtil.getAccessToken(function(data){
        assceToken = data
        callback()
      })
    }
app.set('port', process.env.PORT || 3000)

app.get('/', function (req, res) {
  async.waterfall([token,
    function(callback){
      console.log(assceToken)
      res.send(assceToken)
      callback()
    }], function(error, callback){
      // ?
  })
});

var server = app.listen(app.get('port'), function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});

