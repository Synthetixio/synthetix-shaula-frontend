run: node_modules
	@yarn start

deploy:
	@yarn build
	@surge -d https://synthetix.surge.sh -p build

deploy-staging:
	@yarn build
	@surge -d https://synthetix-staging.surge.sh -p build

deploy-ipfs:
	@yarn build
#	@ipfs-deploy -p pinata build
	@ipfs-deploy build

node_modules:
	@yarn

networks:
	@node bin/$@.js 

.PHONY: \
	run \
	deploy \
	deploy-ipfs \
	networks
