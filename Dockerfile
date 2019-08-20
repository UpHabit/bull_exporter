FROM node:10-alpine as build-env

RUN mkdir -p /src
WORKDIR /src

COPY package.json .
COPY yarn.lock .
RUN yarn install --pure-lockfile

COPY . .
RUN node_modules/.bin/tsc -p .
RUN yarn install --pure-lockfile --production

FROM node:10-alpine
RUN apk --no-cache add tini bash
ENTRYPOINT ["/sbin/tini", "--"]

RUN mkdir -p /src
RUN chown -R nobody:nogroup /src
WORKDIR /src
USER nobody

COPY /setup/docker/main.sh /src/
COPY --chown=nobody:nogroup --from=build-env /src/node_modules /src/node_modules
COPY --chown=nobody:nogroup --from=build-env /src/dist /src/dist

CMD /src/main.sh
