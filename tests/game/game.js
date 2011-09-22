var gal = new GameAssetLoader('gal.manifest');

// When gal initializes, download just the core
gal.init(function() {
  gal.download('core');
});

// When the core is loaded
gal.onLoaded('core', function(result) {
  if (result.success) {
    // Place some stuff on the page
    document.querySelector('img').src = gal.get('loading.jpg');
  }
});

// When level 1 is loaded
gal.onLoaded('level1', function(result) {
  if (result.success) {
    var audio = document.querySelector('audio');
    audio.src = gal.get('L1/blip.wav');
    audio.play();
  }
});

gal.onLoaded('level2', function(result) {
  if (result.success) {
    var video = document.querySelector('video');
    video.src = gal.get('L2/intro.mov');
    video.play();
  }
});
