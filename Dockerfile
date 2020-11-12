FROM node:latest

WORKDIR /app

RUN npm i -g typescript

RUN npm i -g gm

RUN apt-get update \
    && apt-get install -y graphicsmagick \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

RUN git clone https://github.com/chrisdruta/arch-linux-apple-emojis.git \
    && cd arch-linux-apple-emojis \
    && mkdir /usr/share/fonts/emojione \
    && mv ./emojione.ttf /usr/share/fonts/emojione \
    && fc-cache -f -v \
    && cd .. \
    && rm -rf arch-linux-apple-emojis

COPY ./package*.json ./

RUN npm i

COPY ./src ./src
COPY ./.env ./
COPY ./imageTemplates ./imageTemplates
COPY ./assets ./assets
COPY ./tsconfig.json ./

RUN npm run build:prod

EXPOSE 3000
CMD ["npm", "run", "start:prod"]