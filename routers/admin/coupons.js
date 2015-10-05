var express = require('express');
var admin = express.Router();
var models  = require('../../models')
var helpers = require("../../helpers")
var async = require("async")

admin.get("/coupons", function(req, res) {
  async.waterfall([function(next) {
    models.DataPlan.findAll().then(function(dataPlans) {
      next(null, dataPlans)
    }).catch(function(err) {
      next(err)
    })
  }, function(dataPlans, next){
    models.Coupon.findAndCountAll().then(function(result) {
      var coupons = result.rows
      for (var i = coupons.length - 1; i >= 0; i--) {
        for (var j = dataPlans.length - 1; j >= 0; j--) {
          if(dataPlans[j].id == coupons[i].dataPlanId){
            coupons[i].dataPlan = dataPlans[j]
          }
        };
      };
      next(null, dataPlans, result)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, dataPlans, result) {
    if(err){
      console.log(err)
    }else{
      result = helpers.setPagination(result, req)
      res.render("admin/coupons/index", {
        coupons: result
      })
    }
  })
})


admin.get('/coupons/new', function(req, res) {
  async.waterfall([function(next){
    models.DataPlan.findAll().then(function(dataPlans){
      var dataPlanCollection = []
      for (var i = 0; i < dataPlans.length; i++ ) {
        dataPlanCollection.push([dataPlans[i].id, dataPlans[i].name])
      };
      next(null, dataPlanCollection)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, dataPlanCollection) {
    var coupon = models.Coupon.build(),
        dataPlanOptions = { name: 'dataPlanId', class: "select2 col-lg-12 col-xs-12" }
    res.render('admin/coupons/new', {
      coupon: coupon,
      dataPlanOptions: dataPlanOptions,
      dataPlanCollection: dataPlanCollection,
      path: "/admin/coupon"
    })
  })
})

admin.post('/coupon', function(req, res) {
  var params = req.body
  params['isActive'] = params['isActive'] === 'on'
  params['ignoreLevel'] = params['ignoreLevel'] === 'on'
  models.Coupon.build(params).save().then(function(coupon) {
    if(coupon.id){
      req.flash('info', "create success")
      res.redirect('/admin/coupons/' + coupon.id + '/edit')
    }
  }).catch(function(err) {
    console.log(err)
    req.flash('err', "create fails")
    res.redirect('/admin/coupons/new')
  })
})

admin.get('/coupons/:id/edit', function(req, res) {
  async.waterfall([function(next) {
    models.Coupon.findById(req.params.id).then(function(coupon) {
      next(null, coupon)
    }).catch(function(err) {
      next(err)
    })
  }, function(coupon, next){
    models.DataPlan.findAll().then(function(dataPlans){
      var dataPlanCollection = []
      for (var i = 0; i < dataPlans.length; i++ ) {
        if(dataPlans[i].id  === coupon.dataPlanId){
          coupon.dataPlan = dataPlans[i]
        }
        dataPlanCollection.push([dataPlans[i].id, dataPlans[i].name])
      };
      next(null, coupon, dataPlanCollection)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, coupon, dataPlanCollection) {
    if(err){
      console.log(err)
      res.redirect('/500')
    }else{
      var dataPlanOptions = { name: 'dataPlanId', class: "select2 col-lg-12 col-xs-12" }
      res.render('admin/coupons/edit', {
        coupon: coupon,
        dataPlanOptions: dataPlanOptions,
        dataPlanCollection: dataPlanCollection,
        path: "/admin/coupons/" + coupon.id + '/edit'
      })
    }
  })
})

admin.post('/coupons/:id', function(req, res) {
  var params = req.body
  params['isActive'] = params['isActive'] === 'on'
  params['ignoreLevel'] = params['ignoreLevel'] === 'on'
  async.waterfall([function(next) {
    models.Coupon.findById(req.params.id).then(function(coupon) {
      next(null, coupon)
    }).catch(function(err) {
      next(err)
    })
  }, function(coupon, next) {
    coupon.updateAttributes(params).then(function(coupon) {
      next(null, coupon)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, coupon) {
    if(err){
      console.log(err)
      req.flash('err', "update fails")
    }else{
      req.flash('info', "update success")
    }
    res.redirect('/admin/coupons/' + coupon.id + '/edit')
  })
})

module.exports = admin;