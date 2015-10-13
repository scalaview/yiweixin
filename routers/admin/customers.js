var express = require('express');
var admin = express.Router();
var models  = require('../../models')
var helpers = require("../../helpers")
var async = require("async")
var _ = require('lodash')


admin.get('/customers', function(req, res) {
  var params = {}
  if(req.query.phone !== undefined && req.query.phone.present()){
    params = _.merge(params, { phone: { $like: "%{{phone}}%".format({ phone: req.query.phone }) } })
  }
  models.Customer.findAndCountAll({
    where: params,
    limit: req.query.perPage || 15,
    offset: helpers.offset(req.query.page, req.query.perPage || 15)
  }).then(function(customers) {
    var result = helpers.setPagination(customers, req)
    res.render('admin/customers/index', { customers: result, query: req.query })
  })
})

admin.get("/customers/:id", function(req, res) {
  async.waterfall([function(next) {
    models.Customer.findById(req.params.id).then(function(customer) {
      if(customer){
        next(null, customer)
      }else{
        res.send(404)
      }
    }).catch(function(err) {
      next(err)
    })
  }, function(customer, next){
    models.Level.findAll().then(function(levels) {
      var levelCollection = []
        for (var i = 0; i < levels.length; i++) {
          levelCollection.push([ levels[i].id, levels[i].name ])
          if(customer.levelId != undefined && levels[i].id === customer.levelId){
            customer.level = levels[i]
          }
        };

      next(null, customer, levelCollection)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, customer, levelCollection) {
    if(err){
      console.log(err)
      res.send(500)
    }else{
      var levelOptions = { name: 'levelId', class: 'select2 col-xs-12 col-lg-12' }
      res.render("admin/customers/show", {
          customer: customer,
          levelCollection: levelCollection,
          levelOptions: levelOptions
        })
    }
  })

})

admin.post("/customer/:id", function(req, res) {
  async.waterfall([function(next) {
    models.Customer.findById(req.params.id).then(function(customer) {
      if(customer){
        next(null, customer)
      }else{
        next(new Error("not found"))
      }
    }).catch(function(err) {
      next(err)
    })
  }, function(customer, next) {
    customer.updateAttributes({
      levelId: req.body.levelId
    }).then(function(customer) {
      next(null, customer)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, customer) {
    if(err){
      console.log(err)
      res.redirect('/500')
    }else{
      req.flash('info', "update success")
      res.redirect('/admin/customers/' + customer.id)
    }
  })
})

admin.post("/customer/traffic/:id", function(req, res) {
  var type = req.body.type,
      amount = parseInt(req.body.num)
  async.waterfall([function(next) {
    models.Customer.findById(req.params.id).then(function(customer) {
      if(customer){
        models.FlowHistory.build({
          customerId: customer.id,
          state: type,
          amount: amount,
          comment: req.body.comment
        }).save().then(function(flowhistory) {
          next(null, customer, flowhistory)
        }).catch(function(err) {
          next(err, customer)
        })

      }else{
        next(new Error('no customer found'))
      }
    })
  }, function(customer, flowhistory, next) {
    if(type == '1') {
      var value = customer.remainingTraffic + amount
    }else if (customer.remainingTraffic >= amount){
      var value = customer.remainingTraffic - amount
    }
    customer.updateAttributes({
      remainingTraffic: value
    }).then(function(customer) {
      next(null, customer)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, customer, flowhistory) {
    if(err){
      console.log(err)
      req.flash('err', err.message)
      res.redirect('/admin/customers/' + customer.id)
    }else{
      req.flash('info', "update success")
      res.redirect('/admin/customers/' + customer.id)
    }
  })
})

module.exports = admin;