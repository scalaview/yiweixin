var express = require('express');
var admin = express.Router();
var models  = require('../../models')
var helpers = require("../../helpers")
var formidable = require('formidable')
var async = require("async")

// login filter
var skipUrls = [ '^\/wechat[\/|\?|\#]\?.*', '^\/admin\/login[\/|\?|\#]\?.*', '^\/admin\/register[\/|\?|\#]\?.*']

admin.all("*", function(req, res, next) {
  var url = req.originalUrl
  if(req.session.user_id){
    next()
    return
  }else{
    for (var i = skipUrls.length - 1; i >= 0; i--) {
      var match = req.originalUrl.match(skipUrls[i]);
      if(match !== null){
        next()
        return
      }
    };
    var encodeUrl = new Buffer(url).toString('base64');
    return res.redirect("/admin/login?to=" + encodeUrl);
  }
})


admin.get('/affiliateconfigs', function(req, res) {

  async.map([1, 2, 3], function(level, next) {
    models.AffiliateConfig.findOrCreate({
      where: {
        level: level,
        dataPlanId: null
      },
      defaults: {
        level: level
      }
    }).spread(function(aConfig) {
      next(null, aConfig)
    }).catch(function(err) {
      next(err)
    })
  }, function(err, result) {
    if(err){
      console.log(err)
      res.redirect('/500')
    }else{
      res.render('admin/affiliateconfigs/index', { affiliateconfigs: result })
    }
  })

})


admin.get('/affiliateconfigs/:id/edit', function(req, res) {
  models.AffiliateConfig.findById(req.params.id).then(function(aConfig) {
    res.render('admin/affiliateconfigs/show', { aConfig: aConfig })
  }).catch(function(err) {
    console.log(err)
    res.redirect('/500')
  })
})

admin.post('/affiliateconfig/:id', function(req, res) {

  async.waterfall([function(next) {
    models.AffiliateConfig.findById(req.params.id).then(function(aConfig) {
      next(null, aConfig)
    }).catch(function(err) {
      next(err)
    })
  }, function(aConfig, next) {
    aConfig.updateAttributes({
      percent: req.body.percent
    }).then(function(aConfig) {
      next(null, aConfig)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, aConfig) {
    if(err){
      console.log(err)
      res.redirect('/500')
    }else{
      req.flash("info", "update succes")
      res.redirect('/admin/affiliateconfigs/' + aConfig.id + '/edit')
    }
  })

})

admin.get('/affiliateconfig/dataplan/:id/edit', function(req, res) {

  async.waterfall([function(next) {
    models.DataPlan.findById(req.params.id).then(function(dataplan) {
      next(null, dataplan)
    }).catch(function(err){
      next(err)
    })
  }, function(dataplan, pass) {
    async.map([1, 2, 3], function(level, next) {
      models.AffiliateConfig.findOrCreate({
        where: {
          level: level,
          dataPlanId: dataplan.id
        },
        defaults: {
          level: level,
          dataPlanId: dataplan.id
        }
      }).spread(function(aConfig) {
        next(null, aConfig)
      }).catch(function(err) {
        next(err)
      })
    }, function(err, result) {
      if(err){
        pass(err)
      }else{
        pass(null, result, dataplan)
      }
    })

  }], function(err, result, dataplan) {
    if(err){
      console.log(err)
      res.redirect('/500')
    }else{
      res.render('admin/affiliateconfigs/edit', { result: result, dataplan: dataplan } )
    }
  })


})

admin.post('/affiliateconfig/dataplan/:id', function(req, res) {
  console.log(req.body)
  async.waterfall([function(next) {
    models.DataPlan.findById(req.params.id).then(function(dataplan) {
      next(null, dataplan)
    }).catch(function(err) {
      next(err)
    })
  }, function(dataplan, next) {

    models.AffiliateConfig.findAll({
      where: {
        dataPlanId: dataplan.id
      }
    }).then(function(aConfigs) {
      next(null, aConfigs, dataplan)
    }).catch(function(err) {
      next(err)
    })

  }, function(aConfigs, dataplan, pass) {

    async.each(aConfigs, function(aConfig, next) {
      aConfig.updateAttributes({
        percent: req.body['percent[' + aConfig.level + ']']
      }).then(function(aConfig) {
        next(null, aConfig)
      }).catch(function(err) {
        next(err)
      })
    }, function(err, result) {
      if(err){
        pass(err)
      }else{
        pass(null, result, dataplan)
      }
    })

  }], function(err, result, dataplan) {
    if(err){
      console.log(err)
      res.redirect('/500')
    }else{
      req.flash("info", "update succes")
      res.redirect('/admin/affiliateconfig/dataplan/' + dataplan.id + '/edit')
    }
  })

})



module.exports = admin;