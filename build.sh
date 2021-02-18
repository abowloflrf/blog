#!/bin/bash 
set -ex
mkdir -p bin
cd ~/bin
wget https://github.com/gohugoio/hugo/releases/download/v0.80.0/hugo_0.80.0_Linux-64bit.tar.gz
tar -xvzf ./hugo_0.80.0_Linux-64bit.tar.gz

./hugo version
cd ..

./bin/hugo -D