#!/usr/bin/env bash

set -e
COMPONENT=$1
echo " "
echo "  Updating element in the build folder $COMPONENT"

if [ -z "$COMPONENT" -a "${COMPONENT+xxx}" = "xxx" ]; then
  echo "  Provide the component name"
  exit 1;
fi

cd ../
if [ ! -d build ]; then
  mkdir build
fi
cd build

# Ensures credentials on the server side.
GIT_original_email=`git config --global user.email`
GIT_original_name=`git config --global user.name`
GIT_restore_credentials=false
if [ GIT_original_email != "arc@mulesoft.com" ]; then
  git config --global --replace-all user.email "arc@mulesoft.com"
  git config --global --replace-all user.name "CI Agent"
  GIT_restore_credentials=true
fi

if [ ! -d $COMPONENT ]; then
  echo "Cloning component"
  repo_url="git@github.com:advanced-rest-client/${COMPONENT}.git";
  git clone $repo_url
  cd $COMPONENT
  git checkout stage
else
  cd $COMPONENT
  # For any previous errors
  git reset --hard
  currentBranch=`git rev-parse --abbrev-ref HEAD`
  if [ "$currentBranch" != "stage" ]; then
    git checkout stage
    git reset --hard origin/stage
  fi
  git pull origin stage
fi

bower update

if [ "$GIT_restore_credentials" == "true" ]; then
  git config --global --replace-all user.email $GIT_original_email
  git config --global --replace-all user.name $GIT_original_name
fi
