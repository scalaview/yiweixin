var express = require('express');
var admin = express.Router();
var models  = require('../../models')
var helpers = require("../../helpers")
var async = require("async")
var _ = require('lodash')

admin.get("/extractorders", function(req, res) {
  var result;
  async.waterfall([function(next) {
    var params = {}
    if(req.query.phone !== undefined && req.query.phone.present()){
      params = _.merge(params, { phone: { $like: "%{{phone}}%".format({ phone: req.query.phone }) } })
    }
    if(req.query.state !== undefined && req.query.state.present()){
      params = _.merge(params, { state: req.query.state })
    }
    if(req.query.exchangerType !== undefined && req.query.exchangerType.present()){
      params = _.merge(params, { exchangerType: req.query.exchangerType })
    }
    models.ExtractOrder.findAndCountAll({
      where: params,
      limit: req.query.perPage || 15,
      offset: helpers.offset(req.query.page, req.query.perPage || 15),
      order: [
        ['updatedAt', 'DESC']
      ]
    }).then(function(extractOrders) {
      result = extractOrders
      next(null, extractOrders.rows)
    }).catch(function(err) {
      next(err)
    })
  }, function(extractOrders, outnext) {
    var i = 0
    async.map(extractOrders, function(extractOrder, next) {
      i = i + 1
      extractOrder.getExchanger().then(function(exchanger){
        extractOrder.exchanger = exchanger
        if(exchanger.className() === "TrafficPlan"){
          extractOrder.trafficPlan = exchanger
        }else if(exchanger.className() === "FlowTask"){
          extractOrder.flowtask = exchanger
        }
        next(null, extractOrder)
      }).catch(function(err) {
        next(err)
      })
    }, function(err, extractOrders){
      if(err){
        outnext(err)
      }else{
        outnext(null, extractOrders)
      }
    })
  }], function(err, extractOrders) {
    if(err){
      console.log(err)
      res.send(500)
    }else{
      var stateOptions = { name: 'state', class: "select2 col-lg-12 col-xs-12", includeBlank: true },
          stateCollection = [],
          exchangerTypeOptions = { name: 'exchangerType', class: "select2 col-lg-12 col-xs-12", includeBlank: true },
          exchangerTypeCollection = [ [ 'TrafficPlan', '充值' ], [ 'FlowTask', '流量任务' ] ]

      for (var key in models.ExtractOrder.STATE) {
        stateCollection.push([models.ExtractOrder.STATE[key] , key])
      };

      result.rows = extractOrders
      result = helpers.setPagination(result, req)
      res.render('admin/extractorders/index', {
        extractOrders: result,
        query: req.query,
        stateOptions: stateOptions,
        stateCollection: stateCollection,
        exchangerTypeOptions: exchangerTypeOptions,
        exchangerTypeCollection: exchangerTypeCollection
      })
    }
  })
})


admin.get("/extractorders/new", function(req, res) {
  async.waterfall([function(next){
    models.TrafficPlan.scope("forSelect").findAll().then(function(trafficPlans) {
      next(null, trafficPlans)
    }).catch(function(err) {
      next(err)
    })
  }, function(trafficPlans, outnext) {
    async.map(trafficPlans, function(trafficPlan, next) {
      next(null, [trafficPlan.id, trafficPlan.name])
    }, function(err, trafficPlanCollection) {
      outnext(null, trafficPlanCollection)
    })
  }], function(err, trafficPlanCollection) {
    var extractOrder = models.ExtractOrder.build({}),
        trafficPlanOptions = { name: 'trafficPlanId', id: 'trafficPlanId', class: 'select2 col-lg-12 col-xs-12' }
    res.render("admin/extractorders/new", {
      extractOrder: extractOrder,
      trafficPlanOptions: trafficPlanOptions,
      trafficPlanCollection: trafficPlanCollection,
      path: '/admin/extractorder'
    })
  })
})

admin.post("/extractorder", function(req, res) {  // 禁止新建
  if(!( req.body.phone !== undefined && req.body.phone.present() && req.body.trafficPlanId !== undefined &&  req.body.trafficPlanId.present() )){
    res.redirect("/admin/extractorders/new")
    return
  }
  async.waterfall([function(next) {
    models.TrafficPlan.findById(req.body.trafficPlanId).then(function(trafficPlan) {
      if(trafficPlan){
        next(null, trafficPlan)
      }else{
        next(new Error("请选择正确的流量包"))
      }
    }).catch(function(err) {
      next(err)
    })
  }, function(trafficPlan, next){
    models.ExtractOrder.build({
      exchangerType: trafficPlan.className(),
      exchangerId: trafficPlan.id,
      phone: req.body.phone,
      cost: req.body.cost,
      value: trafficPlan.value,
      bid: trafficPlan.bid,
      extend: req.body.extend
    }).save().then(function(extractOrder) {
      next(null, extractOrder)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, extractOrder) {
    if(err){
      console.log(err)
      req.flash('err', err.message)
      res.redirect("/admin/extractorders/new")
    }else{
      req.flash('info', "create success")
      res.redirect("/admin/extractorders/" + extractOrder.id + "/edit")
    }
  })

})


admin.get("/extractorders/:id/edit", function(req, res){
  async.waterfall([function(next) {
    models.ExtractOrder.findById(req.params.id).then(function(extractOrder) {
      next(null, extractOrder)
    }).catch(function(err){
      next(err)
    })
  }, function(extractOrder, next){
    if(extractOrder.exchangerType === "TrafficPlan"){
      models.TrafficPlan.scope("forSelect").findAll().then(function(trafficPlans) {
        next(null, extractOrder, trafficPlans)
      }).catch(function(err) {
        next(err)
      })
    }else{
      extractOrder.getExchanger().then(function(flowtask){
        extractOrder.flowtask = flowtask
        next(null, extractOrder, null)
      })
    }
  }, function(extractOrder, trafficPlans, outnext) {
    if(trafficPlans === null){
      outnext(null, extractOrder, null)
    }
    async.map(trafficPlans, function(trafficPlan, next) {
      next(null, [trafficPlan.id, trafficPlan.name])
    }, function(err, trafficPlanCollection) {
      outnext(null, extractOrder, trafficPlanCollection)
    })
  }], function(err, extractOrder, trafficPlanCollection) {
    var trafficPlanOptions = { name: 'trafficPlanId', id: 'trafficPlanId', class: 'select2 col-lg-12 col-xs-12' }
    res.render("admin/extractorders/edit", {
      extractOrder: extractOrder,
      trafficPlanOptions: trafficPlanOptions,
      trafficPlanCollection: trafficPlanCollection,
      path: '/admin/extractOrder/'+extractOrder.id
    })
  })
})

admin.post("/extractorder/:id", function(req, res) {
  if(!( req.body.phone !== undefined && req.body.phone.present() && req.body.trafficPlanId !== undefined &&  req.body.trafficPlanId.present() )){
    res.redirect("/admin/extractorders/" + req.params.id + "/edit")
    return
  }
  async.waterfall([function(next) {
    models.ExtractOrder.findById(req.params.id).then(function(extractOrder) {
      next(null, extractOrder)
    }).catch(function(err){
      next(err)
    })
  }, function(extractOrder, next) {
    models.TrafficPlan.findById(req.body.trafficPlanId).then(function(trafficPlan) {
      if(trafficPlan){
        next(null, extractOrder, trafficPlan)
      }else{
        next(new Error("请选择正确的流量包"))
      }
    }).catch(function(err) {
      next(err)
    })
  }, function(extractOrder, trafficPlan, next){
    extractOrder.updateAttributes({
      exchangerId: trafficPlan.id,
      phone: req.body.phone,
      cost: req.body.cost,
      value: trafficPlan.value,
      extend: req.body.extend
    }).then(function(extractOrder) {
      next(null, extractOrder)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, extractOrder) {
    if(err){
      console.log(err)
      req.flash('err', err.message)
    }else{
      req.flash('info', 'update success')
    }
    res.redirect("/admin/extractorders/" + extractOrder.id + "/edit")
  })
})

module.exports = admin;