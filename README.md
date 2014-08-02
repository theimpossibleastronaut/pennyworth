Voice recognition based home assistant.
This is a work in progress, no support is given.

Uses CMU PocketSphinx. Requires handbuilt version on OS X. Don't use homebrew here.

wget http://downloads.sourceforge.net/project/cmusphinx/sphinxbase/0.8/sphinxbase-0.8.tar.gz
wget http://downloads.sourceforge.net/project/cmusphinx/pocketsphinx/0.8/pocketsphinx-0.8.tar.gz
tar -zxvf sphinxbase-0.8.tar.gz
tar -zxvf pocketsphinx-0.8.tar.gz

cd ~/sphinxbase-0.8/
./configure --enable-fixed
make
sudo make install

cd ~/pocketsphinx-0.8/
./configure
make
sudo make install

Other platforms may use a package manager, your milage may vary.
