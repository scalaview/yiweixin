function phoneValidateTip(){
  var $modal = $("#myModal"),
      $title = $("#my_title"),
      $msg = $("#popup_message")

  $title.html("易流量提醒")
  $msg.html('请输入正确的手机号码')
  $modal.modal('show')
}

function validatePhone(phone){
  if(phone === undefined || phone === ''){
    return true
  }else {
    return false
  }
}

function sendMsgSuccess(){
  showDialog('验证码已经发送成功，请注意查收')
}

function sendMsgFail(){
  showDialog('验证码发送失败')
}

function codeEmptyTip(){
  showDialog('请输入验证码')
}

$(function(){
  $("#get_code").click(function(){
    var $this = $(this),
        phone = $("#phone").val()

    if(validatePhone(phone)){
      phoneValidateTip()
    }else{
      $.ajax({
        url: 'getcode',
        method: "GET",
        data: {
          phone: phone
        },
        dataType: 'json'
      }).done(function(data) {
        console.log(data)
        if(data.code == 1){
          sendMsgSuccess()
        }else if(data.code == 2){
          showDialog("短信已发送，1 分钟后重试")
        }else{
          sendMsgFail()
        }
      }).fail(function(data) {
        console.log(data)
        sendMsgFail()
      })
    }
  })

  $("#submit-btn").click(function(){
    var $this = $(this),
        url = '/register',
        method = 'POST',
        phone = $("#phone").val(),
        code = $("#code").val()
        data = {
          phone: phone,
          code: code
        }
    if(code === undefined || code === ''){
      codeEmptyTip()
      return
    }
    if(validatePhone(phone)){
      phoneValidateTip()
    }else{
      $.ajax({
        url: url,
        method: method,
        dataType: "json",
        data: data
      }).done(function(data){
        console.log(data)
        if(data.code !== undefined && data.code){
          window.location.href = '/profile'
        }else{
          showDialog('创建用户失败' + data.msg)
        }
      }).fail(function(err){
        console.log(err)
        showDialog('创建用户失败')
      })
    }
  })
})