var express = require('express');
var app = express.Router();
var models  = require('../../models')
var helpers = require("../../helpers")
var async = require("async")
var config = require("../../config")
var WechatAPI = require('wechat-api');
var requireLogin = helpers.requireLogin

var api = new WechatAPI(config.appId, config.appSecret);

app.get('/myaccount', requireLogin, function(req, res) {
  var customer = req.customer

  async.waterfall([function(next) {
    var result = {
      first: 0,
      second: 0,
      third: 0
    }
    var depth = customer.ancestryDepth
    if ((parseInt(depth) + 1) < 3){
      models.Customer.count({
        where: {
          ancestryDepth: parseInt(depth) + 1,
          ancestry: {
            $or: {
              $like: '%/'+customer.id,
              $eq: customer.id
            }
          }
        }
      }).then(function(c) {
        result.third = c
        next(null, result)
      }).catch(function(err){
        next(err)
      })
    }
  }, function(result, next) {
    models.Customer.count({
      where: {
        secondAffiliateId: {
          $eq: null
        }
      }
    }).then(function(c) {
      result.second = c
      next(null, result)
    }).catch(function(err){
      next(err)
    })
  }, function(result, next) {
    models.Customer.count({
      where: {
        affiliateId: {
          $eq: null
        }
      }
    }).then(function(c) {
      result.first = c
      next(null, result)
    }).catch(function(err){
      next(err)
    })
  }], function(err, result) {
    if(err){
      console.log(err)
      res.redirect('/500')
    }else{
      res.render('yiweixin/customer/myaccount', { customer: customer, result: result })
    }
  })
})

app.get('/myticket', function(req, res) {
  var customer = req.customer
  async.waterfall([function(next) {
    if(customer.ticket){
      var url = api.showQRCodeURL(customer.ticket);
      next(null, ticket)
    }else{
      api.createLimitQRCode(customer.id, function(err, data, res){
        if(err){
          next(err)
        }else{
          console.log(data)
          customer.updateAttributes({
            ticket: data.ticket
          }).then(function(customer) {
            var url = api.showQRCodeURL(customer.ticket);
            next(null, url)
          }).catch(function(err) {
            next(err)
          })
        }
      });
    }
  }], function(err, url) {
    if(err){
      console.log(err)
      res.redirect('/myaccount')
    }else{
      res.redirect(url)
    }
  })
})


app.get('myslaves', function(req, res){
  req.query
})

module.exports = app;