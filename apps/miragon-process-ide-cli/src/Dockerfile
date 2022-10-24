FROM node:16

RUN mkdir -p /app

COPY main.js package.json /app/
WORKDIR /app
RUN npm install tslib && \
    npm install

CMD ["node", "/app/main.js"]
