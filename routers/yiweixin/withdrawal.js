var express = require('express');
var app = express.Router();
var models  = require('../../models')
var helpers = require("../../helpers")
var async = require("async")
var WechatAPI = require('wechat-api');
var api = new WechatAPI(config.appId, config.appSecret);

app.get('/myaccount', function(req, res) {

  api.createLimitQRCode(100, callback);
  res.render('yiweixin/customer/myaccount')
})

module.exports = app;