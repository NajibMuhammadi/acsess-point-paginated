FROM node:18-alpine

# 1️⃣ Sätt arbetsmapp
WORKDIR /app

# 2️⃣ Kopiera package.json först (för cache)
COPY package*.json ./

# 3️⃣ Installera dependencies
RUN npm install

# 4️⃣ Kopiera resten av projektet
COPY . .

# 5️⃣ Bygg Next.js för produktion
RUN npm run build

# 6️⃣ Exponera port
EXPOSE 3000

# 7️⃣ Starta servern i production mode
CMD ["npm", "start"]
