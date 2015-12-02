var express = require('express');
var app = express.Router();
var models  = require('../../models')
var helpers = require("../../helpers")
var async = require("async")
var config = require("../../config")
var _ = require('lodash')
var WechatAPI = require('wechat-api');
var requireLogin = helpers.requireLogin
var images = require("images");
// var api = new WechatAPI(config.appId, config.appSecret);

var api = new WechatAPI(config.appId, config.appSecret, function (callback) {
  // 传入一个获取全局token的方法
  fs.readFile(process.env.PWD + '/access_token.txt', 'utf8', function (err, txt) {
    if (err) {return callback(err);}
    callback(null, JSON.parse(txt));
  });
}, function (token, callback) {
  // 请将token存储到全局，跨进程、跨机器级别的全局，比如写到数据库、redis等
  // 这样才能在cluster模式及多机情况下使用，以下为写入到文件的示例
  fs.writeFile(process.env.PWD + '/access_token.txt', JSON.stringify(token), callback);
});

var request = require("request")
var fs        = require('fs');

var maxDepth = config.max_depth

app.get('/myaccount', requireLogin, function(req, res) {
  var customer = req.customer

  async.waterfall([function(next) {
    next(null, customer)
  }, helpers.getSlaves, function(customer, result, next) {
    var list = customer.getAncestry()
    if(list.length > 0){
      models.Customer.findById(list[list.length - 1]).then(function(parent) {
        next(null, result, parent)
      })
    }else{
      next(null, result, {})
    }

  }], function(err, result, parent) {
    if(err){
      console.log(err)
      res.redirect('/500')
    }else{
      var sum = 0
      for (var i = result.length - 1; i >= 0; i--) {
        sum = sum + parseInt(result[i].count)
      };
      res.render('yiweixin/customer/myaccount', { customer: customer, result: result, parent: parent, sum: sum })
    }
  })
})

app.get('/myticket', requireLogin,function(req, res) {
  var customer = req.customer
  if(customer.myticket){
    res.render('yiweixin/withdrawal/myticket', { url: customer.myticket })
    return
  }

  async.waterfall([function(next) {
    if(customer.ticket){
      var url = api.showQRCodeURL(customer.ticket);
      next(null, url)
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
  }, function(url, next) {
    var filename = customer.id + (Math.round((new Date().valueOf() * Math.random()))) +'.png'
    var tmp_file = __dirname + "/../../public/uploads/tmp/" + filename
    var save_file_path =  __dirname + "/../../public/uploads/tickets/" + filename
    console.log(tmp_file)
    var file = fs.createWriteStream(tmp_file)

    request(url).pipe(file)
    file.on('finish', function() {
      images(__dirname + "/../../public/images/myticket-bg.JPG").draw(images(tmp_file).size(211), 82, 177).save(save_file_path, {quality : 30 });

      fs.unlink(tmp_file, function(err) {
          if (err){
            next(err)
          }else{
            next(null, filename)
          }
      });
    });

  }, function(myticket, next) {
    customer.updateAttributes({
      myticket: myticket
    }).then(function(customer){
      next(null, myticket, customer)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, url) {
    if(err){
      console.log(err)
      res.redirect('/myaccount')
    }else{
      res.render('yiweixin/withdrawal/myticket', { url: url })
    }
  })
})


app.get('/myslaves', requireLogin, function(req, res){
  var customer = req.customer,
      depth = parseInt(req.query.depth) + 1 + ( parseInt(customer.ancestryDepth) || 0 )

  async.waterfall([function(next) {

    if( (depth - customer.ancestryDepth) == 1 ){
      var params = {
        ancestry: (customer.ancestry) ? customer.ancestry + '/' + customer.id : customer.id + ''
      }
    }else{
      var params = {
        ancestry: {
          $like: (customer.ancestry) ? customer.ancestry + '/' + customer.id + '/%' : customer.id + '/%'
        }
      }
    }

    params = _.extend(params, { ancestryDepth: depth })

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
      res.render('yiweixin/customer/myslaves', { customers: customers, customer: customer })
    }
  })
})

app.get('/apply', requireLogin, function(req, res) {
  var customer = req.customer
  models.DConfig.findOrCreate({
    where: {
      name: "exchangeRate"
    },
    defaults: {
      value: '1'
    }
  }).spread(function(dConfig, created) {
    res.render('yiweixin/withdrawal/apply', { customer: customer, dConfig: dConfig })
  })
})

app.post('/apply', requireLogin, function(req, res) {
  var w = req.body,
      customer = req.customer
      params = req.body

      params = _.extend(params, { customerId: customer.id })

  async.waterfall([function(next) {
    models.DConfig.findOrCreate({
      where: {
        name: "exchangeRate"
      },
      defaults: {
        value: '1'
      }
    }).spread(function(dConfig, created) {
      next(null, dConfig)
    })
  }, function(dConfig, next) {
    var fix = parseFloat(dConfig.value) * parseFloat(params.amount)
    params = _.extend(params, { cost: fix })
    if( parseFloat(customer.salary) >= fix ){
      models.Withdrawal.build(params).save().then(function(withdrawal) {
        if(withdrawal){
          next(null, withdrawal, dConfig)
        }else{
          next(new Error("提现出错"))
        }
      })
    }else{
      next(new Error('not enought'))
    }
  },function(withdrawal, dConfig, next) {

    customer.updateAttributes({
      salary: customer.salary - withdrawal.cost
    }).then(function(customer) {

      customer.takeFlowHistory(models, withdrawal, withdrawal.cost, "提取￥" + withdrawal.amount + "，花费" + withdrawal.cost + "E币", models.FlowHistory.STATE.REDUCE , function() {
            }, function(err) {
            }, models.FlowHistory.TRAFFICTYPE.SALARY)

      next(null, withdrawal, dConfig, customer)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, withdrawal) {
    if(err){
      console.log(err)
      res.redirect('/errmsg')
    }else{
      res.redirect('/successmsg')
    }
  })

})


app.get('/slave', requireLogin, function(req, res) {
  var customer = req.customer

  async.waterfall([function(next) {
    models.Customer.findById(req.query.id).then(function(one) {
      next(null, one)
    })
  }, getSlaves], function(err, one, result) {
    if(err){
      console.log(err)
      res.redirect('/500')
    }else{
      res.render('yiweixin/customer/slave', { customer: customer, one: one, result: result })
    }
  })
})


app.get('/withdrawals', requireLogin, function(req, res) {
  var customer = req.customer

  models.Withdrawal.findAll({
    where: {
      customerId: customer.id
    },
    order: [
      ['createdAt', "DESC"]
    ]
  }).then(function(withdrawals) {
    res.render('yiweixin/withdrawal/index', { withdrawals: withdrawals, Withdrawal: models.Withdrawal })
  }).catch(function(err) {
    res.redirect('/500')
  })

})

module.exports = app;