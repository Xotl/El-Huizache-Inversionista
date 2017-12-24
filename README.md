# El Huizache Inversionista


## How to run it

### Build it
`docker build -t el-huizache-inversionista .`

### Run it
`docker run -it --rm --name huizache -e SLACK_CHANNEL="Slack channel id" -e OAUTH_TOKEN="Slack Bearer token" -v ${PWD}/src:/home/node/app/src el-huizache-inversionista`