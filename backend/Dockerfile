# Use the official lightweight Node.js 20 image.
# https://hub.docker.com/_/node
FROM node:20-slim

# Set the working directory to /app
WORKDIR /app

# Copy the package.json and package-lock.json files
COPY package.json package-lock.json ./

# Install production dependencies.
RUN npm install

# Copy the rest of your backend application code
COPY . .

# Build the Next.js application (if applicable, for production deployments)
# This assumes your 'build' script generates the necessary output
# For Next.js, 'next build' generates the .next folder
RUN npm run build

# Expose the port on which your Next.js app will run
# Next.js applications typically run on port 3000 by default, 
# but Cloud Run will use the PORT environment variable.
EXPOSE 3000

# Start the Next.js application.
# Use 'npm start' which usually runs 'next start' or a custom script from package.json
CMD ["npm", "start"]
