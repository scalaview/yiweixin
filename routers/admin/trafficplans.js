var express = require('express');
var admin = express.Router();
var models  = require('../../models')
var helpers = require("../../helpers")
var formidable = require('formidable')
var async = require("async")


admin.get('/trafficplans', function(req, res) {
  async.waterfall([function(next) {
    models.TrafficPlan.findAndCountAll({
      offset: helpers.offset(req.query.page, req.query.perPage || 15)
    }).then(function(trafficPlans) {
      next(null, trafficPlans)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, trafficPlans) {
    if(err){
      console.log(err)
      res.redirect('/500')
    }else{
      result = helpers.setPagination(trafficPlans, req)
      res.render('admin/trafficplans/index', { trafficPlans: result})
    }
  })
})

admin.get('/trafficplans/new', function(req, res) {
  async.waterfall([function(next) {
    models.TrafficGroup.findAll().then(function(trafficgroups) {
      var trafficgroupsCollection = [];
      for (var i = 0; i < trafficgroups.length; i++) {
        trafficgroupsCollection.push([ trafficgroups[i].id, trafficgroups[i].name ])
      };
      next(null, trafficgroupsCollection)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, trafficgroupsCollection) {
    if(err){
      console.log(err)
      res.redirect('/500')
    }else{
      var trafficPlan = models.TrafficPlan.build(),
          providerOptions = { name: "providerId", class: 'select2 col-lg-12 col-xs-12' },
          providerCollection = [ [0, '中国移动'], [1, '中国联通'], [2, '中国电信'] ],
          typeOptions = { name: "type", class: 'select2 col-lg-12 col-xs-12' },
          typeCollection = [ [0, '非正式'], [1, '正式']],
          trafficgroupsOptions = { name: "trafficGroupId", class: 'select2 col-lg-12 col-xs-12', includeBlank: true }

      res.render('admin/trafficplans/new', {
        trafficPlan: trafficPlan,
        providerOptions: providerOptions,
        providerCollection: providerCollection,
        typeOptions: typeOptions,
        typeCollection: typeCollection,
        trafficgroupsOptions: trafficgroupsOptions,
        trafficgroupsCollection: trafficgroupsCollection,
        path: '/admin/trafficplan'
      })
    }
  })
})


admin.post('/trafficplan', function(req, res) {
  var params = req.body
  if(params['display'] == 'on'){
    params['display'] = true
  }else{
    params['display'] = false
  }

  async.waterfall([function(next) {
    models.TrafficPlan.build(params).save().then(function(trafficplan) {
      if(trafficplan){
        next(null, trafficplan)
      }else{
        next(new Error("err"))
      }
    }).catch(function(err) {
      next(err)
    })
  }], function(err, trafficplan) {
    if(err){
      console.log(err)
      req.flash("err", "update fail")
      res.redirect('/500')
    }else{
      req.flash("info", "update success")
      res.redirect('/admin/trafficplans/' + trafficplan.id + '/edit')
    }
  })
})


admin.get('/trafficplans/:id/edit', function(req, res) {
  async.waterfall([function(next) {
    models.TrafficPlan.findById(req.params.id).then(function(trafficPlan) {
      next(null, trafficPlan)
    }).catch(function(err) {
      next(err)
    })
  }, function(trafficplan, next) {
    models.TrafficGroup.findAll().then(function(trafficgroups) {
      var trafficgroupsCollection = [];
      for (var i = 0; i < trafficgroups.length; i++) {
        trafficgroupsCollection.push([ trafficgroups[i].id, trafficgroups[i].name ])
      };
      next(null, trafficplan, trafficgroupsCollection)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, trafficPlan, trafficgroupsCollection) {
    if(err){
      console.log(err)
      res.redirect('/500')
    }else{
      var providerOptions = { name: "providerId", class: 'select2 col-lg-12 col-xs-12' },
          providerCollection = [ [0, '中国移动'], [1, '中国联通'], [2, '中国电信'] ],
          typeOptions = { name: "type", class: 'select2 col-lg-12 col-xs-12' },
          typeCollection = [ [0, '非正式'], [1, '正式']],
          trafficgroupsOptions = { name: "trafficGroupId", class: 'select2 col-lg-12 col-xs-12', includeBlank: true }

      res.render('admin/trafficplans/new', {
          trafficPlan: trafficPlan,
          providerOptions: providerOptions,
          providerCollection: providerCollection,
          typeOptions: typeOptions,
          typeCollection: typeCollection,
          trafficgroupsOptions: trafficgroupsOptions,
          trafficgroupsCollection: trafficgroupsCollection,
          path: '/admin/trafficplan/' + trafficPlan.id
        })
    }
  })
})

admin.post('/trafficplan/:id', function(req, res){
  var params = req.body
  if(params['display'] == 'on'){
    params['display'] = true
  }else{
    params['display'] = false
  }
  async.waterfall([function(next) {
    models.TrafficPlan.findById(req.params.id).then(function(trafficPlan) {
      next(null, trafficPlan)
    }).catch(function(err) {
      next(err)
    })
  }, function(trafficPlan, next) {
    trafficPlan.updateAttributes(params).then(function(trafficPlan) {
      next(null, trafficPlan)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, trafficPlan) {
    if(err){
      console.log(err)
      req.flash("info", "update fail")
      res.redirect('/500')
    }else{
      req.flash("info", "update success")
      res.redirect('/admin/trafficplans/' + trafficPlan.id + '/edit')
    }
  })
})

module.exports = admin;