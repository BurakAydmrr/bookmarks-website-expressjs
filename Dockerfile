FROM node:18
WORKDIR /opt/node-server/
COPY . . 
RUN npm install 
CMD ["node", "index.js"]
EXPOSE 5000