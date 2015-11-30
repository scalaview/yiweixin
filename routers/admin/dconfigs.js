var express = require('express');
var admin = express.Router();
var models  = require('../../models')
var helpers = require("../../helpers")
var async = require("async")

// 配置信息

function initDConfig(req, res, pass){
  var dConfigs = [{
    name: 'vipLimit',
    value: '1'
  },{
    name: 'exchangeRate',
    value: '1'
  },{
    name: 'affiliate',
    value: '1'
  }]

  async.each(dConfigs, function(DC, next) {
    models.DConfig.findOrCreate({
      where: {
        name: DC.name
      },
      defaults: DC
    }).spread(function(one) {
       next(null, one)
    }).catch(function(err){
      next(err)
    })
  }, function(err) {
    if(err){
      console.log(err)
    }
    pass()
  })

}

admin.get('/configs', initDConfig, function(req, res) {
  models.DConfig.findAll({}).then(function(dconfigs){
    var result = {}

    for (var i = 0; i < dconfigs.length ; i++) {
      if(dconfigs[i].name == 'vipLimit'){
        result['vipLimit'] = {
            name: "自动升级VIP限制",
            key: 'vipLimit',
            value: dconfigs[i].value
        }
      }

      if(dconfigs[i].name == 'exchangeRate'){
        result['exchangeRate'] = {
          name: '兑换汇率(1元等于多少E币)',
          key: 'exchangeRate',
          value: dconfigs[i].value
        }
      }

      if(dconfigs[i].name == 'affiliate'){
        result['affiliate'] = {
          name: '分销商限制',
          key: 'affiliate',
          value: dconfigs[i].value
        }
      }

    };

    res.render('admin/dconfigs/show', { result: result })

  })
})


admin.post('/configs', function(req, res) {
  models.DConfig.findAll({}).then(function(dconfigs) {

    async.map(dconfigs, function(dconfig, next){
      if(dconfig.name == 'vipLimit'){
        dconfig.updateAttributes({
          value: req.body.vipLimit
        }).then(function(dconfig) {
          next(null, dconfig)
        }).catch(function(err) {
          next(err)
        })
      }
      if(dconfig.name == 'exchangeRate' ){
        dconfig.updateAttributes({
          value: req.body.exchangeRate
        }).then(function(dconfig) {
          next(null, dconfig)
        }).catch(function(err) {
          next(err)
        })
      }
      if(dconfig.name == 'affiliate' ){
        dconfig.updateAttributes({
          value: req.body.affiliate
        }).then(function(dconfig) {
          next(null, dconfig)
        }).catch(function(err) {
          next(err)
        })
      }

    }, function(err, result) {
      if(err){
        console.log(err)
        req.flash("err", "update fail")
        res.redirect('/500')
      }else{
        req.flash("info", "update succes")
        res.redirect('/admin/configs')
      }
    })

  })
})

module.exports = admin;
