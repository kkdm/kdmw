_VER=v`cat package.json | jq -r .version`
build:
	docker build -t ghcr.io/kkdm/kdmw-site:$(_VER) .

push:
	docker push ghcr.io/kkdm/kdmw-site:$(_VER)
