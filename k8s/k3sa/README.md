First we need to install crds
kubectl apply -k https://github.com/argoproj/argo-cd/manifests/crds\?ref\=stable
Then we need to install argocd
kubectl apply -k sets