var express = require('express');
var app = express.Router();
var models  = require('../../models')
var helpers = require("../../helpers")
var async = require("async")
var config = require("../../config")
var _ = require('lodash')
var WechatAPI = require('wechat-api');
var requireLogin = helpers.requireLogin

var api = new WechatAPI(config.appId, config.appSecret);

var maxDepth = config.max_depth

app.get('/myaccount', requireLogin, function(req, res) {
  var customer = req.customer

  async.waterfall([function(outnext) {
    var array = [0, 0, 0]
    var wrapped = array.map(function (value, index) {
                  return {index: index, value: value};
                });

    var depth = customer.ancestryDepth

    async.map(wrapped, function(item, next) {
      var index = item.index
      var _depth = (parseInt(depth) + parseInt(index) + 1)
      if (_depth <= wrapped.length){
        if(customer.ancestry){
          var ancestryParams = customer.ancestry + '%'
        }else{
          var ancestryParams = customer.id + '%'
        }
        var params = {
            ancestry: {
              $or: {
                $like: ancestryParams,
                $eq: customer.id + ""
              }
            }
          }

        if(index < (wrapped.length - 1) ){
          params = _.extend(params, { ancestryDepth: _depth })
        }else{
          params = _.extend(params, { ancestryDepth: { $gte: _depth } })
        }

        models.Customer.count({
          where: params
        }).then(function(c) {
          next(null, c)
        }).catch(function(err){
          next(err)
        })
      }else{
        next(null, 0)
      }
    }, function(err, result){
      if(err){
        outnext(err)
      }else{
        outnext(null, result)
      }
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


app.get('/myslaves', requireLogin, function(req, res){
  var customer = req.customer,
      depth = req.query.depth

  async.waterfall([function(next) {
    if(customer.ancestry){
      var ancestryParams = customer.ancestry + '%'
    }else{
      var ancestryParams = customer.id + '%'
    }
    var params = {
            ancestry: {
              $or: {
                $like: ancestryParams,
                $eq: customer.id
              }
            }
          }
    if(depth < maxDepth ){
      params = _.extend(params, { ancestryDepth: depth })
    }else{
      params = _.extend(params, { ancestryDepth: { $gte: depth } })
    }

    models.Customer.findAndCountAll({
      where: params
    }).then(function(customers) {
      next(null, customers)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, customers) {
    if(err){
      console.log(err)
      res.redirect('/500')
    }else{
      res.render('yiweixin/customer/myslaves', { customers: customers })
    }
  })
})

module.exports = app;