sudo docker build -t docker-coturn .

sudo docker tag docker-algotrading gcr.io/livestreaming-241004/docker-algotrading:pro

gcloud auth print-access-token | sudo docker login -u oauth2accesstoken --password-stdin https://gcr.io/livestreaming-241004

sudo docker push gcr.io/livestreaming-241004/docker-algotrading:pro