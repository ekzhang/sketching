cd models

wget http://graphics.stanford.edu/pub/3Dscanrep/bunny.tar.gz
wget http://graphics.stanford.edu/pub/3Dscanrep/dragon/dragon_recon.tar.gz
wget http://graphics.stanford.edu/pub/3Dscanrep/armadillo/Armadillo.ply.gz
wget https://graphics.stanford.edu/courses/cs148-10-summer/as3/code/as3/teapot.obj

tar xvzf bunny.tar.gz
tar xvzf dragon_recon.tar.gz
gzip -d Armadillo.ply.gz