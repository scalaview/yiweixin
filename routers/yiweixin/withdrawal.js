var express = require('express');
var app = express.Router();
var models  = require('../../models')
var helpers = require("../../helpers")
var async = require("async")


app.get('/myaccount', function(req, res) {
  res.render('yiweixin/customer/myaccount')
})

module.exports = app;