var express = require('express');
var app = express.Router();
var models  = require('../../models')
var helpers = require("../../helpers")
var async = require("async")
var requireLogin = helpers.requireLogin

app.get('/profile', requireLogin, function(req, res) {
  var customer = req.customer
  if(!customer){
    res.redirect('/auth')
    return
  }
  async.waterfall([function(next) {
    models.Banner.findAll({
      where: {
        active: true
      },
      order: [
          'sortNum', 'id'
      ]
    }).then(function(banners) {
      next(null, banners)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, banners) {
    res.render('yiweixin/customer/show', { customer: customer, banners: banners })
  })
})

app.get('/extractflow', requireLogin, function(req, res){
  res.render('yiweixin/orders/extractflow', { customer: req.customer })
})

app.post("/extractFlow", requireLogin, function(req, res){
  var customer = req.customer
  if(!req.body.phone){
    res.json({ err: 1, msg: "请输入手机号码" })
    return
  }
  async.waterfall([function(next){
    models.TrafficPlan.findById(req.body.flowId).then(function(trafficPlan){
      if(trafficPlan){
        next(null, trafficPlan)
      }else{
        res.json({ err: 1, msg: "请选择正确的流量包" })
      }
    })
  }, function(trafficPlan, next) {
    if(req.body.chargetype ===  'balance'){
      var enough = (customer.remainingTraffic > trafficPlan.cost)
    }else{
      var enough = (customer.salary > trafficPlan.cost)
    }

    if(enough){
      next(null, trafficPlan)
    }else{
      next(new Error("没有足够流量币"))
    }
  }, function(trafficPlan, next){
    var chargetype = (req.body.chargetype == "balance" ) ? models.Customer.CHARGETYPE.BALANCE : models.Customer.CHARGETYPE.SALARY

    models.ExtractOrder.build({
      exchangerType: trafficPlan.className(),
      exchangerId: trafficPlan.id,
      phone: req.body.phone,
      cost: trafficPlan.cost,
      value: trafficPlan.value,
      bid: trafficPlan.bid,
      customerId: customer.id,
      chargeType: chargetype
    }).save().then(function(extractOrder) {
      next(null, trafficPlan, extractOrder)
    }).catch(function(err) {
      next(err)
    })
  }, function(trafficPlan, extractOrder, next) {
    extractOrder.autoRecharge().then(function(res, data) {
      console.log(data)
      if(trafficPlan.bid){  // 正规空中充值
        if(data.status == 1 || data.status == 2){
          next(null, trafficPlan, extractOrder)
        }else{
          extractOrder.updateAttributes({
            state: models.ExtractOrder.STATE.FAIL
          })
          next(new Error(data.msg))
        }
      }else{
        if(data.state == 1){
          extractOrder.updateAttributes({
            state: models.ExtractOrder.STATE.SUCCESS
          }).then(function(extractOrder){
            next(null, trafficPlan, extractOrder)
          }).catch(function(err) {
            next(err)
          })
        }else{
          extractOrder.updateAttributes({
            state: models.ExtractOrder.STATE.FAIL
          })
          next(new Error(data.msg))
        }
      }
    }).catch(function(err){
      next(err)
    }).do()
  }, function(trafficPlan, extractOrder, next){
    //
    customer.reduceTraffic(models, extractOrder, function(customer, extractOrder, trafficPlan, flowHistory) {
      next(null, customer, extractOrder)
    }, function(err) {
      next(err)
    })
  }], function(err, result){
    if(err){
      console.log(err)
      res.json({ err: 1, msg: err.message })
    }else{
      res.json({ err: 0, msg: "充值成功，请注意查收短信", url: "/profile" })
    }
  })
})

app.get('/getTrafficplans', requireLogin, function(req, res){
  if(models.TrafficPlan.Provider[req.query.catName] !== undefined){
    var providerId = models.TrafficPlan.Provider[req.query.catName]
    async.waterfall([function(outnext) {
      models.TrafficGroup.findAll({
        where: {
          providerId: providerId,
          display: true
        },
        order: [
          'sortNum', 'id'
         ]
      }).then(function(trafficgroups) {
        async.map(trafficgroups, function(trafficgroup, next) {
          console.log(trafficgroup)
          trafficgroup.getTrafficPlans({
            where: {
              display: true
            }
          }).then(function(trafficplans) {
            var data = null
            if(trafficplans.length > 0){
              data = {
                name: trafficgroup.name,
                trafficplans: trafficplans
              }
            }
            next(null, data)
          }).catch(function(err) {
            next(err)
          })
        }, function(err, result) {
          if(err){
            outnext(err)
          }else{
            var data = []
            for (var i = 0; i < result.length; i++) {
              if(result[i])
                data.push(result[i])
            };
            outnext(null, data)
          }
        })
      })
    }], function(err, result) {
      if(err){
        console.log(err)
        res.json({ err: 1, msg: "server err" })
      }else{
        res.json(result)
      }
    })
  }else{
    res.json({ err: 1, msg: "phone err" })
  }
})

app.get("/income", requireLogin, function(req, res){
  var customer = req.customer
  models.FlowHistory.incomeHistories({
    where: {
      customerId: customer.id
    }
  }, function(flowHistories){
    res.render('yiweixin/flowhistories/income', { flowHistories: flowHistories })
  }, function(err){
    console.log(err)
  })
})


app.get("/spend", requireLogin, function(req, res){
  var customer = req.customer
  models.FlowHistory.reduceHistories({
    where: {
      customerId: customer.id
    }
  }, function(flowHistories){
    res.render('yiweixin/flowhistories/spend', { flowHistories: flowHistories })
  }, function(err){
    console.log(err)
  })
})


app.get('/salary', requireLogin, function(req, res) {
  var customer = req.customer
  models.FlowHistory.findAll({
    where: {
      customerId: customer.id,
      trafficType: models.FlowHistory.TRAFFICTYPE.SALARY
    }
  }).then(function(flowhistories) {
    res.render('yiweixin/flowhistories/salary', { flowhistories: flowhistories })
  }).catch(function(err) {
    console.log(err)
  })
})


module.exports = app;