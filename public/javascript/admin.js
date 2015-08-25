$(function(){
  $(".select2").each(function(i, e) {
    $(e).select2()
  })

  $('.remove').each(function(i, e) {
    $(e).click(function() {
      var $this = $(e),
          el = $this.data('el'),
          targer = '#remove'+el,
          $checkBox = $(targer)
      $checkBox.prop('checked', true)
      $this.parents('.help-block').remove()
    })
  })

})