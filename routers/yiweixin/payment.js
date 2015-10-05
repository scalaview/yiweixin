var express = require('express');
var app = express.Router();
var models  = require('../../models')
var helpers = require("../../helpers")
var async = require("async")
var requireLogin = helpers.requireLogin
var config = require("../../config")
var fs        = require('fs');
var Payment = require('wechat-pay').Payment;
var initConfig = {
  partnerKey: config.partnerKey,
  appId: config.appId,
  mchId: config.mchId,
  notifyUrl: "http://yiliuliang.net/paymentconfirm",
  pfx: fs.readFileSync(process.env.PWD + '/cert/apiclient_cert.p12')
};
var payment = new Payment(initConfig);

app.get('/payment', requireLogin, function(req, res) {
  var customer = req.customer
  async.waterfall([function(next){
    if(customer.levelId !== undefined){
        models.Level.findById(customer.levelId).then(function(level) {
          customer.level = level
        })
      }
      next(null, customer)
  }, function(customer, next) {
    models.Coupon.findAll({
      where: {
        isActive: true,
        expiredAt: {
          $gt: (new Date()).begingOfDate()
        }
      },
      order: [
              ['updatedAt', 'DESC']
             ]
    }).then(function(coupons) {
      next(null, coupons)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, coupons) {
    if(err){
      console.log(err)
    }else{
      models.DataPlan.allOptions(function(dataPlans){

        for (var i = coupons.length - 1; i >= 0; i--) {
          for (var j = dataPlans.length - 1; j >= 0; j--) {
            if(coupons[i].dataPlanId == dataPlans[j].id){
              if(dataPlans[j].coupon === undefined){
                dataPlans[j].coupon = coupons[i]
              }else if(dataPlans[j].coupon.updatedAt < coupons[i].updatedAt){
                dataPlans[j].coupon = coupons[i]
              }
            }
          };
        };
        res.render('yiweixin/orders/payment', { customer: customer, dataPlans: dataPlans })
      }, function(err) {
        console.log(err)
      })
    }
  })


})

app.get('/pay', requireLogin, function(req, res) {
    var customer = req.customer
    async.waterfall([function(next){
      if(customer.levelId !== undefined){
        models.Level.findById(customer.levelId).then(function(level) {
          customer.level = level
        })
      }
      next(null, customer)
    }, function(customer, next) {
      models.PaymentMethod.findOne({ where: { code: req.query.paymentMethod.toLowerCase() } }).then(function(paymentMethod) {
        if(paymentMethod){
          next(null, paymentMethod);
        }else{
          res.json({ err: 1, msg: "找不到支付方式" })
        }
      }).catch(function(err){
        next(err)
      })
    }, function(paymentMethod, next){
      models.DataPlan.findById(req.query.dataPlanId).then(function(dataPlan){
        if(dataPlan){
          next(null, paymentMethod, dataPlan)
        }else{
          res.json({ err: 1, msg: "请选择合适的套餐" })
        }
      }).catch(function(err) {
        next(err)
      })
    }, function(paymentMethod, dataPlan, next){
      models.Coupon.findAll({
        where: {
          dataPlanId: dataPlan.id,
          isActive: true,
          expiredAt: {
            $gt: (new Date()).begingOfDate()
          }
        },
        order: [
                ['updatedAt', 'DESC']
               ]
      }).then(function(coupons) {
        dataPlan.coupon = coupons[0]
        next(null, paymentMethod, dataPlan)
      }).catch(function(err) {
        next(err)
      })
    }, function(paymentMethod, dataPlan, next){
      var discount = 1.00
      if(dataPlan.coupon && dataPlan.coupon.ignoreLevel && dataPlan.coupon.discount > 0){
        discount = discount - dataPlan.coupon.discount
      }else if(customer.level && customer.level.discount > 0){
        discount = discount - customer.level.discount
      }
      models.Order.build({
        state: models.Order.STATE.INIT,
        customerId: customer.id,
        dataPlanId: dataPlan.id,
        paymentMethodId: paymentMethod.id,
        total: dataPlan.price * discount
      }).save().then(function(order){
        next(null, paymentMethod, dataPlan, order)
      }).catch(function(err){
        next(err)
      })
    }], function(error, paymentMethod, dataPlan, order){
      if(error){
        console.log(error)
        res.json({ err: 1, msg: "server error" })
      }else{
        var ipstr = req.ip.split(':'),
          ip = ipstr[ipstr.length -1]

        var orderParams = {
          body: '流量套餐 ' + dataPlan.name,
          attach: order.id,
          out_trade_no: 'yiliuliang' + (+new Date),
          total_fee:  Math.round(order.total * 100),
          spbill_create_ip: ip,
          openid: customer.wechat,
          trade_type: 'JSAPI'
        };

        console.log(orderParams)
        payment.getBrandWCPayRequestParams(orderParams, function(err, payargs){
          if(err){
            console.log("payment fail")
            console.log(err)
            res.json({err: 1, msg: 'payment fail'})
          }else{
            console.log(payargs)
            res.json(payargs);
          }
        });
      }
    })
})


var middleware = require('wechat-pay').middleware;
app.use('/paymentconfirm', middleware(initConfig).getNotify().done(function(message, req, res, next) {
  console.log(message)

  var orderId = message.attach

  async.waterfall([function(next) {
    models.Order.findById(orderId).then(function(order) {
      if(order){
        next(null, order)
      }else{
        next(new Error('order not found'))
      }
    }).catch(function(err) {
      next(err)
    })
  }, function(order, next){
    if(message.result_code === 'SUCCESS' && !order.isPaid()){
      order.updateAttributes({
        state: models.Order.STATE.PAID,
        transactionId: message.transaction_id
      }).then(function(order){
        next(null, order)
      })
    }else{
      next(new Error("pass"))
    }
  }, function(order, next) {
    models.Customer.findById(order.customerId).then(function(customer) {
      next(null, order, customer)
    }).catch(function(err) {
      next(err)
    })
  }, function(order, customer, next) {
    customer.addTraffic(models, order, function(customer, order, flowHistory){
      next(null, order, flowHistory)
    }, function(err) {
      next(err)
    })
  }], function(err, order, flowHistory){
    if(err){
      res.reply(err)
    }else{
      res.reply('success');
    }
  })
}));

module.exports = app;