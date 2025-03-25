FROM node:16-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies from package.json
RUN npm install

# Copy source code
COPY . .

# Create .env file from environment variables
ARG REACT_APP_API_URL
ARG REACT_APP_SUPABASE_URL
ARG REACT_APP_SUPABASE_ANON_KEY
ARG NODE_ENV

# Create .env file
RUN echo "REACT_APP_API_URL=$REACT_APP_API_URL" > .env && \
    echo "REACT_APP_SUPABASE_URL=$REACT_APP_SUPABASE_URL" >> .env && \
    echo "REACT_APP_SUPABASE_ANON_KEY=$REACT_APP_SUPABASE_ANON_KEY" >> .env && \
    echo "NODE_ENV=$NODE_ENV" >> .env

# Build TypeScript code
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
