gcloud compute scp ./index.js ./package.json ./stage-build ./tag-build ./finish-stage.sh ./update-git-element.sh ci:/var/ci/server --zone europe-west1-c
gcloud compute scp ./lib/* ci:/var/ci/server/lib --zone europe-west1-c
