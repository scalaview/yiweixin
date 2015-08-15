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