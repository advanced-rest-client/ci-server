#!/usr/bin/env bash

# File to execute after stage buid command finishes processing files.
# This assumes the component is on `stage` branch and there are files to commit.

set -e
COMPONENT_DIR=$1
cd $COMPONENT_DIR

# Ensures credentials on the server side.
GIT_original_email=`git config --global user.email`
GIT_original_name=`git config --global user.name`
GIT_original_signKey=`git config --global user.signingkey`
GIT_restore_credentials=false
if [ GIT_original_email != "arc@mulesoft.com" ]; then
  git config --global --replace-all user.email "arc@mulesoft.com"
  git config --global --replace-all user.name "CI Agent"
  git config --global user.signingkey 495D62C78DE8A670
  GIT_restore_credentials=true
  echo "  Will use 495D62C78DE8A670 to sign the commit"
fi

git add -A
git commit -S -m "[ci skip] Automated commit after stage build."
git push origin stage
git checkout master
git reset --hard origin/master
git pull origin master
git merge -m "[ci skip] Automated merge stage->master." --no-ff stage -X theirs
git push origin master
git checkout stage

if [ "$GIT_restore_credentials" == "true" ]; then
  git config --global --replace-all user.email $GIT_original_email
  git config --global --replace-all user.name $GIT_original_name
  git config --global --replace-all user.signingkey $GIT_original_signKey
fi
