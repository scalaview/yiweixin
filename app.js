var express = require('express');
var config = require("./config")
var app = express();
var wechat = require('wechat');
var config = {
  token: config.token,
  appid: config.appId,
  encodingAESKey: config.aesKey
  
  
};

app.set('port', process.env.PORT || 3000)

app.get('/', function (req, res) {
  res.send(req.query.echostr);
});

var server = app.listen(app.get('port'), function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});