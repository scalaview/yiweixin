var cusBalance = 0;
var lastSubmitdate = new Date().getTime();
//页面加载
$(document).ready(function () {
  extractConfirm()
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
    var html = template({trafficplans: data})
    $(".llb").html(html)
  }).fail(function(err){
    console.log(err)
    showDialog("服务器错误")
  })
}

function extractConfirm(){

  ///提取流量事件
  $("#exchanger").click(function() {
      ///转赠流量
      var selectedFlow = $(".llb a.selected");
      //if (selectedFlow.attr('class', 'mask01')) {
      //    alertMsg("您的余额不足，无法完成此项操作", false);
      //    return;
      //}
      var flowId = selectedFlow.data("value");
      if (!flowId || flowId == "") {
          showDialog("请选择流量包");
          return;
      }

      var flow = selectedFlow.data("flow"),
          phone = $.trim($("#mobile").val())
      $("#maskflow").html(flow)
      $("#maskmobile").html(phone)
      $("#mask").show()
  });


  $(".sure").click(function(){
    var selectedFlow = $(".llb a.selected"),
        phone = $.trim($("#mobile").val()),
        flowId = selectedFlow.data("value"),
        source   = $("#trafficplans-template").html();
    if(source === undefined || source == ''){
      return
    }
    if(isMobile(phone) && flowId !== undefined && flowId !== '' ){
       $.ajax({
        url: '/extractFlow',
        dataType: "JSON",
        data: {
          phone: phone,
          flowId: flowId
        },
        method: "POST"
       }).done(function(data){
        showDialog(data.msg)
        if(!data.err){
          doDelay(function(){
            window.location.href = data.url
          }, 1)
        }
       }).fail(function(err){
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
      $("#txtFlowCount").val(flowId);
      $("#txtPayMoney").html(parseInt(flowCount).toFixed(2));
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
        price = selectedFlow.data("price")
    $("#maskflow").html(flow)
    $("#maskmoney").html(price)
    $("#mask").show()
  });

  $(".sure").click(function(){
    var $this = $(this),
        dataPlanId = $("#txtFlowCount").val()

    if(dataPlanId !== undefined && dataPlanId !== ''){
      $.ajax({
        url: '/pay',
        method: 'POST',
        dataType: "JSON",
        data: {
          dataPlanId: dataPlanId,
          paymentMethod: 'WechatPay'
        }
      }).done(function(data) {
        showDialog(data.msg)
        if(!data.err){
          doDelay(function(){
           window.location.href = data.url
         }, 1)
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