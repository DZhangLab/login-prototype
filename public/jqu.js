var $inp = $(".passInput");

$inp.on({
 input: function(ev) {
  if(this.value) {
    $inp.eq($inp.index(this) + 1).focus();
  }
 },
 keydown: function(ev) {
  var i = $inp.index(this);
  if(ev.which===8 && !this.value && i) {
    $inp.eq(i - 1).focus();
  }
 }
});
