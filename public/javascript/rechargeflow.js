var cusBalance = 0;
var lastSubmitdate = new Date().getTime();
//页面加载
$(document).ready(function () {
  extractConfirm()
  givenTo()
  withdrawal()
  $(".correct").html("");
  $(".correct").hide();
  var m = $("#mobile").val();
  $(".llb").on('click', 'a', function(){
    var $this = $(this)
    $this.parent().children().removeClass("selected");
    $(this).addClass("selected");
    var cost = $this.data("cost");
    $("#needmyflow").html(cost);
  })

  mobileBlur(function(result) {
    var source   = $("#trafficplans-template").html();
    if(source !== undefined && source !== ''){
      getTrafficplan(source, result.catName)
      submitIsEnable(true);
    }
  });
});


function givenTo(){
  $('#givento').click(function(){
    var phone = $('#mobile').val(),
        amountStr = $('#amount').val()
        totalStr = $('#balance').data('amount')
    if(totalStr !== undefined){
      var total = parseInt(totalStr)
    }

    var amount = 0
    try{
      amount = parseInt(amountStr)
      if(amount <= 0){
        showDialog("转赠数量必须是正数")
        return
      }
      if(!(amount % 10 == 0) ){
        showDialog("转赠数量必须是10的倍数")
        return
      }

      if(isNaN(amount) || amount > total) {
        showDialog("您的E币不足以支出转赠数量")
        return
      }
    }catch(e){
      console.log(e)
      showDialog("请输入正确的数量")
      return
    }
    $.ajax({
      url: '/givento',
      method: "POST",
      dataType: "JSON",
      data: {
        phone: phone,
        amount: amount
      }
    }).done(function(data) {
      console.log(data)
      if(data.code){
        showDialog(data.msg)
        doDelay(function(){
          window.location.href = data.url
        }, 2)
      }else{
        showDialog(data.msg)
      }
    }).fail(function(err) {
      console.log(err)
      showDialog("服务器异常")
    })
  })
}

function mobileBlur(successCallback){
  //手机号码失去焦点事件
  $("#mobile").bind("blur", function () {
      var mobile = $.trim($(this).val());
      if ($.trim(mobile) == "") {
          $(".correct").hide();
          $(".correct").html("");
          $(".llb").html("");
          // showDialog("请输入手机号码");
          return;
      }
      if (!isMobile(mobile)) {
          $(".correct").hide();
          $(".correct").html("");
          $(".llb").html("");
          showDialog("请输入正确的手机号码");
          return;
      }
      getCarrier(mobile, successCallback);
  });
}

///遮罩层
function maskShow(mobile, flow, code, isShow) {
  var isConfirmShow = isShow;
  $("#maskflow").data("flow", flow);
  $("#maskflow").data("code", code);
  $("#maskmobile").data("mobile", mobile);
  $("#maskmobile").html(mobile);
  $("#maskflow").html(flow + "MB");
  if (isConfirmShow === true) {
      $("#mask").show();
  } else {
      $("#mask").hide();
      $("#maskmobile").html("");
      $("#maskflow").html("");
  }
}

$("#mobile").bind("focus", function () {
    submitIsEnable(false);
});

//提交按钮可用设置
function submitIsEnable(isEnable) {
  if (!isEnable) {
    $(".btn-submit").data("enable", false);
    $(".btn-submit a").addClass("btn-gray");
  } else {
    $(".btn-submit").data("enable", true);
    $(".btn-submit a").removeClass("btn-gray");
  }
}

///验证数字
function isNumber(content) {
    var reg = /^\d*$/;
    return reg.test(content);
}

function getCarrier(phone, successCallback){
  $.ajax({
    url: 'https://tcc.taobao.com/cc/json/mobile_tel_segment.htm',
    method: 'GET',
    dataType: 'JSONP',
    data: {
      tel: phone
    }
  }).done(function(result){
    // areaVid: "30517"carrier: "广东移动"catName: "中国移动"ispVid: "3236139"mts: "1382846"province: "广东"
    if(result.catName){
      $("#phone-detail").html(result.catName + ' ' + result.carrier).data("provider", result.carrier).show()
      successCallback(result)
    }else{
      showDialog("请输入正确的手机号码");
    }
  }).fail(function(err) {
    showDialog("服务器错误")
  })
}

function getTrafficplan(source, catName){
  if(!source) return
  var template = Handlebars.compile(source);
  $.ajax({
    url: '/getTrafficplans',
    dataType: 'JSON',
    data: {
      catName: catName
    },
    method: "GET"
  }).done(function(data){
    var html = template({trafficgroups: data})
    $(".llb").html(html)
  }).fail(function(err){
    console.log(err)
    showDialog("服务器错误")
  })
}

function extractConfirm(){

  $(".llb").on('click', 'a.exchanger', function() {
    var $this = $(this)
    $(".dy-top a").removeClass('choose')
    var choose = $("#chooseMoney .btn.selected")
    var lessE = choose.data('less')

    if( parseFloat(lessE) < parseFloat($this.data('cost')) ){
      if(choose.data('id') == 'balance'){
        showDialog("账户剩余E币不足")
      }else{
        showDialog("账户返利E币不足")
      }
      return
    }
    $this.addClass('choose')

    phone = $.trim($("#mobile").val())
    $("#maskflow").html($this.data('name'))
    $("#maskmobile").html(phone)
    $("#mask").show()
  })

  $(".sure").click(function(){
    var selectedFlow = $(".dy-top a.choose")
        phone = $.trim($("#mobile").val()),
        flowId = selectedFlow.data("value"),
        source   = $("#trafficplans-template").html(),
        choose = $("#chooseMoney .btn.selected")


    if(source === undefined || source == ''){
      return
    }

    if(choose.data('id') === undefined || choose.data('id') == ''){
      return
    }

    if(isMobile(phone) && flowId !== undefined && flowId !== '' ){
      showLoadingToast();
       $.ajax({
        url: '/extractFlow',
        dataType: "JSON",
        data: {
          phone: phone,
          flowId: flowId,
          chargetype: choose.data('id')
        },
        method: "POST"
       }).done(function(data){
        hideLoadingToast()
        showDialog(data.msg)
        if(!data.err){
          doDelay(function(){
            window.location.href = data.url
          }, 1)
        }
       }).fail(function(err){
        hideLoadingToast()
        console.log(err)
        showDialog("服务器繁忙")
       })
    }else{
      showDialog("请输入电话和选择正确的套餐")
    }
  })

}

function RegistEvent() {
    // 选择流量币大小
  $("#buylist").on("click", "a", function (e) {
      var target = e.target;
      $(target).siblings().each(function () {
          $(this).removeClass("selected");
          if ($(this).children(".an").length > 0) {
              $(this).children(".an").remove();
          }
      });
      $(target).addClass("selected");
      $(target).append("<div class=\"an\"></div>");

      var flowId = $(target).data("id"),
          flowCount = $(target).data("price");
          flowDiscount = $(target).data('discount');
      $("#txtFlowCount").val(flowId);
      if(flowDiscount != ''){
        $("#txtPayMoneyDiscount").html(flowDiscount.toFixed(2)).parent().removeClass('hide');
        $("#txtPayMoney").attr('style', 'text-decoration: line-through;')
      }else{
        $("#txtPayMoney").removeAttr('style')
        $("#txtPayMoneyDiscount").parent().addClass('hide');
      }
      $("#txtPayMoney").html(parseFloat(flowCount).toFixed(2));
  });
  $("#buylist a:eq(0)").click()
}


function paymentConfirm(){

  $("#pay-now").click(function() {
    var selectedFlow = $(".llb a.selected");
    var flowId = selectedFlow.data("id");
    if (!flowId || flowId == "") {
        showDialog("请选择流量包");
        return;
    }

    var flow = selectedFlow.data("value"),
        price = selectedFlow.data("price"),
        flowDiscount = selectedFlow.data('discount');
    if(flowDiscount != ''){
      $("#maskmoney").html(flowDiscount.toFixed(2))
    }else{
      $("#maskmoney").html(price)
    }
    $("#maskflow").html(flow)
    $("#mask").show()
  });

  $(".sure").click(function(){
    var $this = $(this),
        dataPlanId = $("#txtFlowCount").val()
    if(dataPlanId !== undefined && dataPlanId !== ''){
      $.ajax({
        url: '/pay',
        method: "GET",
        dataType: "JSON",
        data: {
          dataPlanId: dataPlanId,
          paymentMethod: 'WechatPay'
        }
      }).done(function(payargs) {
        if(payargs.err){
          showDialog(payargs.msg)
        }else{
          WeixinJSBridge.invoke('getBrandWCPayRequest', payargs, function(res){
            if(res.err_msg == "get_brand_wcpay_request:ok"){
              alert("支付成功");
              // 这里可以跳转到订单完成页面向用户展示
              window.location.href = '/profile'
            }else{
              alert("支付失败，请重试");
            }
          });
        }
      }).fail(function(err) {
        console.log(err)
        showDialog("服务器繁忙")
      })
    }else{
      showDialog("请输入电话和选择正确的套餐")
    }
  })
}


function withdrawal(){
  $("#exchangeAmount").blur(function() {
    var amount = parseFloat($(this).val()),
        $exchange = $('#exchange'),
        exchangeValue = $exchange.data("exchange"),
        total = $exchange.data('total')

    if(!isNaN(amount)){
      if(amount > parseFloat(total) ){
        showDialog("你所拥有的E币不足")
      }
    }else{
      showDialog("请输入正确的数目")
    }
  })

  $("#exchangeSubmit").click(function(){
    var list = $("input[type='text']")
        for (var i = 0; i < list.length; i--) {
          if(list[i].value == ''){
            showDialog("请完整填写信息")
            break;
          }
        };
    if(i < list.length){
      return true
    }else{
      return false
    }
  })
}