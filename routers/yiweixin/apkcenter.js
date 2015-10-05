var express = require('express');
var app = express.Router();
var models  = require('../../models')
var helpers = require("../../helpers")
var async = require("async")
var requireLogin = helpers.requireLogin

app.get('/apkcenter', requireLogin, function(req, res) {
  var customer = req.customer
  models.Apk.activeList(function(apks) {
    res.render("yiweixin/apkcenter/index", { apks: apks, customer: customer  })
  }, function(err) {
    console.log(err)
  })
})

app.get('/apkcenter/:id', function(req, res) {
  if(! req.params.id.match(/\d/)){
    res.redirect('/404');
    return
  }
  async.waterfall([function(next){
    if(req.query.c){
      models.Customer.findOne({
        where: {
          password_hash: req.query.c
        }
      }).then(function(customer){
        if(customer){
          next(null, customer)
        }else{
          next(null, null)
        }
      }).catch()
    }else{
      next(null, null)
    }
  }, function(customer, next){
     models.Apk.findById(req.params.id).then(function(apk){
      next(null, apk, customer)
    }).catch(function(err){
      next(err)
    })
  }], function(err, apk, customer) {
    if(err){
      console.log(err)
      res.redirect('/apkcenter')
    }else{
      res.render('yiweixin/apkcenter/show', { apk: apk, customer: customer })
    }
  })
})

app.get('/apkcenter/download/:id', function(req, res) {
  if(! req.params.id.match(/\d/)){
    res.redirect('/404');
    return
  }
  async.waterfall([function(next){
    models.Customer.findOne({
      where: {
        password_hash: req.query.c
      }
    }).then(function(customer) {
      if(customer){
        next(null, customer)
      }else{
        next(null, null)
      }
    }).catch()
  }, function(customer, next) {
    models.Apk.findById(req.params.id).then(function(apk){
      next(null, customer, apk)
    }).catch(function(err){
      next(err)
    })
  }, function(customer, apk, next){
    res.download( helpers.fullPath(apk.apkPath), apk.apk, function(err){
      if (err) {
        next(err)
      } else {
        next(null, customer, apk)
      }
    });
  }, function(customer, apk, next){
    if(customer){
      customer.getFlowHistories({
        where: {
          state:  models.FlowHistory.STATE.ADD,
          type: "Apk",
          typeId: apk.id
        }
      }).then(function(existFlowHistories){
        if(existFlowHistories instanceof Array && existFlowHistories[0] ){  // no update
          next(null, customer, apk, existFlowHistories[0])
        }else{
          next(null, customer, apk, null)
        }
      })
    }else{
      next(null, customer, apk, null)
    }
  }, function(customer, apk, existFlowHistory, next) {
    if(customer && !existFlowHistory && apk.isActive){
      customer.updateAttributes({
        remainingTraffic: customer.remainingTraffic + apk.reward
      }).then(function(customer) {
        next(null, customer, apk, true)
      })
    }else{
      next(null, customer, apk, false)
    }
  }, function(customer, apk, isUpdated, next){
    if(customer && isUpdated){
      customer.takeFlowHistory(models, apk, apk.reward, "首次下载app" + app.name, models.FlowHistory.STATE.ADD, function(flowHistory){
        next(null, customer, apk, flowHistory)
      }, function(err){})
    }else{
      next(null, customer, apk, null)
    }
  }, function(customer, apk, flowHistory, next) {
    apk.updateAttributes({
      downloadTime: apk.downloadTime+1
    }).then(function(apk) {
      next(null, customer. apk, flowHistory)
    }).catch(function(err){})
  }], function(err, customer, apk, flowHistory){
    if(err){
      console.log(err)
      res.send(404);
    }
  })
})

module.exports = app;