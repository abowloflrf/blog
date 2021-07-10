#!/bin/bash 
set -ex
mkdir -p bin
cd bin

HUGO_VERSION=0.85.0
wget https://github.com/gohugoio/hugo/releases/download/v$(HUGO_VERSION)/hugo_$(HUGO_VERSION)_Linux-64bit.tar.gz -O hugo.tar.gz
tar -xvzf ./hugo.tar.gz

./hugo version
cd ..

./bin/hugo -D