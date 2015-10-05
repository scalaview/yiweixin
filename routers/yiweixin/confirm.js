var express = require('express');
var app = express.Router();
var models  = require('../../models')
var helpers = require("../../helpers")
var async = require("async")
var requireLogin = helpers.requireLogin

app.get("/taskconfirm/:id", function(req, res) {
  var id = req.params.id,
      token = req.query.token,
      phone = req.query.phone
  if(! id.match(/\d/)){
    res.redirect('/404');
    return
  }
  if(!(id && token && phone)) {
    res.json({ err: 1 , code: 1001, msg: "参数缺失"})
  }

  async.waterfall([function(next){
    models.Seller.findOne({
      where: {
        accessToken: token
      }
    }).then(function(seller) {
      next(null, seller)
    }).catch(function(err) {
      next(err)
    })
  }, function(seller, next) {
    models.FlowTask.findOne({
      where: {
        id: id,
        seller_id: seller.id,
        isActive: true,
        expiredAt: {
          $gt: (new Date()).begingOfDate()
        }
      }
    }).then(function(flowtask) {
      if(flowtask){
        next(null, seller, flowtask)
      }else{
        res.json({ err: 1, code: 1004, msg: "没有找到对应的任务"})
      }
    }).catch(function(err) {
      next(err)
    })
  }, function(seller, flowtask, next) {
    models.TrafficPlan.findById(flowtask.trafficPlanId).then(function(trafficPlan) {
      next(null, seller, flowtask, trafficPlan)
    }).catch(function(err) {
      next(err)
    })
  }, function(seller, flowtask, trafficPlan, next){
    models.ExtractOrder.build({
      exchangerType: flowtask.className(),
      exchangerId: flowtask.id,
      phone: phone,
      cost: 0,
      value: trafficPlan.value
    }).save().then(function(extractOrder) {
      next(null, seller, flowtask, trafficPlan, extractOrder)
    }).catch(function(err) {
      next(err)
    })
  }, function(seller, flowtask, trafficPlan, extractOrder, next) {
    // TODO
    extractOrder.updateAttributes({
      state: models.ExtractOrder.STATE.SUCCESS
    }).then(function(extractOrder) {
      next(null, seller, flowtask, trafficPlan, extractOrder)
    }).catch(function(err) {
      next(err)
    })
  }, function(seller, flowtask, trafficPlan, extractOrder, next) {
    // finishTime
    flowtask.updateAttributes({
      finishTime: flowtask.finishTime + 1
    }).then(function(flowtask) {
      next(null, seller, flowtask, trafficPlan, extractOrder)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, seller, flowtask, trafficPlan, extractOrder){
    if(err){
      console.log(err)
      res.json({ err: 1, code: 1003, msg: "参数错误"})
    }else{
      res.json({
        err: 0, msg: "confirm success"
      })
    }
  })

})

app.get('/extractflowconfirm', function(req, res) {
  var id = req.query.orderid,
      phone = req.query.phone
  if(id === undefined || id === '' || phone === undefined || phone === '' ){
    res.send('error')
    return
  }
  async.waterfall([function(next) {
    models.ExtractOrder.findOne({
      where: {
        id: id,
        phone: phone,
        state: models.ExtractOrder.STATE.INIT
      }
    }).then(function(extractorder) {
      if(extractorder){
        next(null, extractorder)
      }else{
        res.send('success')
        return
      }
    }).catch(function(err) {
      next(err)
    })
  }, function(extractorder, next) {
    extractorder.updateAttributes({
      state: models.ExtractOrder.STATE.SUCCESS
    }).then(function(extractorder) {
      next(null, extractorder)
    }).catch(function(err) {
      next(err)
    })
  }, function(extractorder, next) {
    extractorder.getExchanger().then(function(trafficPlan) {
      next(null, extractorder, trafficPlan)
    }).catch(function(err) {
      next(err)
    })
  }, function(extractorder, trafficPlan, next) {
    models.MessageQueue.sendRechargeMsg(models, trafficPlan, extractorder.phone, function(messageQueue) {
      next(null)
    }, function(err) {
      next(err)
    })
  }], function(err, extractorder) {
    if(err){
      console.log(err)
      res.send('err')
    }else{
      res.send('success')
    }
  })
})

app.post('/extractflowdefaultconfirm', function(req, res) {
  var body = req.rawBody
      console.log(body)
  var id = body.dorderid,
      phone = body.mobile
  if(id === undefined || id === '' || phone === undefined || phone === '' ){
    res.send('error')
    return
  }
  async.waterfall([function(next) {
    models.ExtractOrder.findOne({
      where: {
        id: id,
        phone: phone,
        state: models.ExtractOrder.STATE.INIT
      }
    }).then(function(extractorder) {
      if(extractorder){
        next(null, extractorder)
      }else{
        res.send(0)
        return
      }
    }).catch(function(err) {
      next(err)
    })
  }, function(extractorder, next) {
    var status = models.ExtractOrder.STATE.FAIL
    if(body.status === 1){
      status = models.ExtractOrder.STATE.SUCCESS
    }
    extractorder.updateAttributes({
      state: status
    }).then(function(extractorder) {
      next(null, extractorder)
    }).catch(function(err) {
      next(err)
    })
  }, function(extractorder, next) {
    extractorder.getExchanger().then(function(trafficPlan) {
      next(null, extractorder, trafficPlan)
    }).catch(function(err) {
      next(err)
    })
  }, function(extractorder, trafficPlan, next) {
    models.MessageQueue.sendRechargeMsg(models, trafficPlan, extractorder.phone, function(messageQueue) {
      next(null, extractorder)
    }, function(err) {
      next(err)
    })
  }], function(err, extractorder) {
    if(err){
      console.log(err)
      res.send('err')
    }else{
      res.send('0')
    }
  })
})

module.exports = app;