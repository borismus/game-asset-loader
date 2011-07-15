var gal = new GameAssetLoader('gal.manifest');
gal.init(onGameLoaded);

function onGameLoaded() {
  // Right away, load the core
  gal.download('core', function(result) {
    if (result.success) {
      // Place some stuff on the page
      document.querySelector('img').src = gal.get('loading.jpg');
    }
  });
}


function onLevelPassed(nextLevel) {
  gal.download('level1', function(result) {
    if (result.success) {
      var audio = document.querySelector('audio');
      audio.src = gal.get('L1/blip.wav');
      audio.play();
    }
  });
}
