FROM node:20-alpine AS base
WORKDIR /usr/src/app

FROM base AS build
COPY package*.json ./
RUN npm install
RUN npm install -g typescript 
COPY src/ /usr/src/app/src/
COPY ./tsconfig.json .
RUN npm run build

FROM base AS publish
COPY --from=build /usr/src/app/build ./build
COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/src/tenants*.json ./
RUN npm install --only=prod

EXPOSE 8080
CMD [ "node", "build/index.js" ]
