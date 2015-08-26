window.showDialog = function(msg){
  var $modal = $("#myModal"),
      $title = $("#my_title"),
      $msg = $("#popup_message")

  $title.html("易流量提醒")
  $msg.html(msg)
  $modal.modal('show')
}


window.doDelay = function(callback, second) {
  window.setTimeout(callback, second * 1000);
}

///手机验证
window.isMobile = function (mobile) {
    var reg = /^1\d{10}$/;
    return (mobile !== undefined && mobile !== '' && reg.test(mobile))
}

$(function(){
  $(".back").click(function() {
    $("#mask").hide()
  })
  $('.fulltext img').addClass('img-responsive')
})