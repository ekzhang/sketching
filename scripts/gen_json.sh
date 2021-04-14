cd scripts
python taubin.py --source model --input ../models/dragon_recon/dragon_vrip_res4.ply --output ../models/dragon.json
python taubin.py --source model --input ../models/Armadillo.ply --output ../models/armadillo.json
python taubin.py --source model --input ../models/teapot.obj --output ../models/teapot.json
python taubin.py --source model --input ../models/bunny_1k.obj --output ../models/bunny_1k.json
python taubin.py --source model --input ../models/bunny_1k_2_sub.obj --output ../models/bunny_1k_2_sub.json

python taubin.py --source sdf --example 1 --resolution 160 --output ../models/torus.json
python taubin.py --source sdf --example 2 --resolution 160 --output ../models/csg.json

#too large
python taubin.py --source model --input ../models/bunny/reconstruction/bun_zipper.ply --output ../models/bunny_large.json --no-simplify