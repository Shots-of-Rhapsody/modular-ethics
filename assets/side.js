// assets/site.js — shared tiny helpers

// Set footer year if present
(function setYear(){
  var y = document.getElementById('y');
  if (y) y.textContent = (new Date()).getFullYear();
})();

// (Optional) simple theme toggle hook if you later add a button with data-theme-toggle
document.addEventListener('click', function(e){
  var t = e.target.closest('[data-theme-toggle]');
  if (!t) return;
  document.documentElement.classList.toggle('theme-dark');
});
