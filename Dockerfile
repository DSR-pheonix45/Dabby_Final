# Stage 1: Build the React application
FROM node:22-alpine as build

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Set build arguments and environment variables for Vite at build time
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_APP_RECAPTCHA_SITE_KEY
ARG VITE_GROQ_API_KEY
ARG VITE_TAVILY_API_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_APP_RECAPTCHA_SITE_KEY=$VITE_APP_RECAPTCHA_SITE_KEY
ENV VITE_GROQ_API_KEY=$VITE_GROQ_API_KEY
ENV VITE_TAVILY_API_KEY=$VITE_TAVILY_API_KEY

# Copy the rest of the application
COPY . .

# Build the app for production
RUN npm run build


# Stage 2: Serve the application using Nginx
FROM nginx:alpine

# Copy the built assets from the build stage to Nginx's html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
